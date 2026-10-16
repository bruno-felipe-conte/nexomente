import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Play } from 'lucide-react';
import { useTamagotchiStore, getLevelData, getLevelProgress } from '../../store/useTamagotchiStore';
import { useUIStore } from '../../store/useUIStore';

export default function TamagotchiWidget({ className = '' }) {
  const { player, checkDailyStatus } = useTamagotchiStore();
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const levelData = getLevelData(player.xp);

  const [speech, setSpeech] = useState(null);
  const speechTimeoutRef = useRef(null);

  useEffect(() => {
    checkDailyStatus();
  }, [checkDailyStatus]);

  // Determinar o humor e o emoji secundário baseado no HP
  let moodEmoji;
  let moodStatus;
  let isShaking = false;
  let isBouncing = false;
  let isSpinning = false;

  const hpPercent = (player.hp / player.hp_max) * 100;

  if (player.hibernating || player.hp === 0) {
    moodEmoji = '💀';
    moodStatus = 'Hibernando';
  } else if (hpPercent <= 15) {
    moodEmoji = '😵';
    moodStatus = 'Crítico';
    isShaking = true;
  } else if (hpPercent <= 30) {
    moodEmoji = '😴';
    moodStatus = 'Exausto';
  } else if (hpPercent <= 50) {
    moodEmoji = '😔';
    moodStatus = 'Triste';
  } else if (hpPercent <= 70) {
    moodEmoji = '😐';
    moodStatus = 'Neutro';
  } else if (hpPercent <= 85) {
    moodEmoji = '😊';
    moodStatus = 'Feliz';
    isBouncing = true;
  } else {
    moodEmoji = '🤩';
    moodStatus = 'Radiante';
    isSpinning = true;
  }

  // Animation variants
  const idleVariants = {
    normal: { scale: 1 },
    bouncing: { 
      y: [0, -10, 0], 
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } 
    },
    shaking: { 
      x: [-2, 2, -2, 2, 0], 
      transition: { repeat: Infinity, duration: 0.5 } 
    },
    spinning: {
      rotate: [0, 10, -10, 0],
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
    },
    hibernating: {
      opacity: 0.5,
      filter: "grayscale(100%)",
      scale: 0.95
    }
  };

  let currentVariant = "normal";
  if (player.hibernating) currentVariant = "hibernating";
  else if (isShaking) currentVariant = "shaking";
  else if (isSpinning) currentVariant = "spinning";
  else if (isBouncing) currentVariant = "bouncing";

  const handlePetClick = () => {
    const quotesHigh = [
      "Você está voando hoje! Que tal mais um Pomodoro?",
      "Sua mente está afiada! Vamos continuar!",
      "Excelente disciplina! Sinto a energia subindo!",
      "Cada minuto focado me deixa mais forte!",
    ];
    const quotesMid = [
      "Continuo com você em cada página e flashcard!",
      "Que tal estudarmos mais um pouco hoje?",
      "Persistência diária é a chave da maestria.",
      "Estou pronto para a próxima matéria!",
    ];
    const quotesLow = [
      "Preciso de energia... um Pomodoro agora me recupera!",
      "Não me deixe hibernar! Vamos revisar um card?",
      "Só você pode recarregar minhas forças estudando!",
      "Um pequeno esforço hoje evita o cansaço amanhã.",
    ];

    const pool = hpPercent >= 70 ? quotesHigh : hpPercent >= 35 ? quotesMid : quotesLow;
    const quote = pool[Math.floor(Math.random() * pool.length)];

    setSpeech(quote);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => setSpeech(null), 4000);
  };

  return (
    <div className={`relative overflow-hidden group ${className}`}>
      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${hpPercent <= 30 ? 'bg-nx-error/5' : 'bg-nx-accent/5'} opacity-40 group-hover:opacity-100`} />

      <div className="relative z-10 p-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-nx-muted">NexoPet Status</span>
          <div className={`text-[10px] px-2 py-0.5 rounded-nx-xs font-mono uppercase ${hpPercent <= 15 ? 'bg-nx-error/20 text-nx-error border border-nx-error/30' : 'bg-nx-success/20 text-nx-success border border-nx-success/30'}`}>
            {moodStatus}
          </div>
        </header>

        {/* Pet + info side by side on mobile, stacked on larger */}
        <div className="flex items-center gap-5 mb-4 relative">
          {/* Speech bubble */}
          <AnimatePresence>
            {speech && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9 }}
                className="absolute -top-12 left-0 right-0 z-30 bg-nx-depth border border-nx-primary/50 text-nx-bright text-[11px] font-ui px-3 py-1.5 rounded-xl shadow-xl shadow-nx-primary/10 cursor-pointer pointer-events-auto"
                onClick={() => setSpeech(null)}
              >
                <div className="relative">
                  <p className="leading-tight font-medium">{speech}</p>
                  <div className="absolute -bottom-2.5 left-8 w-2 h-2 bg-nx-depth border-r border-b border-nx-primary/50 transform rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pet figure */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-nx-primary/10 blur-2xl rounded-full scale-150 animate-pulse" />
            <motion.div
              className="text-7xl filter drop-shadow-[0_0_16px_rgba(91,124,244,0.3)] cursor-pointer relative z-10"
              variants={idleVariants}
              animate={currentVariant}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.92 }}
              onClick={handlePetClick}
              title={`Nível ${player.level} - ${levelData.title} (${levelData.name})\nClique para interagir!`}
            >
              {levelData.form}
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -right-3 text-xl bg-nx-surface rounded-full w-8 h-8 flex items-center justify-center shadow-glow-primary border border-nx-border pointer-events-none"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {moodEmoji}
            </motion.div>
          </div>

          {/* Name + level */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-display font-bold text-nx-bright truncate">
              {player.pet_name || levelData.name}
            </h2>
            <p className="text-nx-dim text-[10px] font-mono font-bold uppercase tracking-widest opacity-80">
              {levelData.title} · Nível {player.level}
            </p>

            {/* HP bar inline */}
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-mono text-nx-muted mb-1">
                <span>HP</span>
                <span>{player.hp}/{player.hp_max}</span>
              </div>
              <div className="w-full h-1.5 bg-nx-void rounded-full overflow-hidden border border-nx-border/50">
                <motion.div
                  className={`h-full ${hpPercent <= 15 ? 'bg-nx-error shadow-[0_0_8px_var(--nx-error)]' : hpPercent >= 80 ? 'bg-nx-success shadow-[0_0_8px_var(--nx-success)]' : 'bg-nx-primary shadow-[0_0_8px_var(--nx-primary)]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ duration: 1.2, type: 'spring' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* XP card */}
        <div className="nx-card p-3 rounded-nx-md border-nx-border/40">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[9px] font-mono text-nx-muted uppercase tracking-widest">XP Total</span>
              <p className="text-[13px] font-mono font-bold text-nx-bright leading-none">{player.xp.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-nx-muted uppercase tracking-widest">Streak</span>
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-[13px] font-mono font-bold text-nx-accent leading-none">🔥 {player.streak}d</p>
                {(player.streak_freezes || 0) > 0 && (
                  <span
                    title={`${player.streak_freezes} Escudo(s) de Gelo ativos`}
                    className="flex items-center text-[10px] text-cyan-300 font-bold bg-cyan-500/10 px-1 py-0.5 rounded border border-cyan-500/20"
                  >
                    <Shield size={10} className="mr-0.5" />
                    {player.streak_freezes}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[8px] font-mono text-nx-muted/60">
              <span>Nível {player.level + 1}</span>
              <span>{Math.round(getLevelProgress(player.xp))}%</span>
            </div>
            <div className="w-full h-1 bg-nx-void rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-nx-accent shadow-[0_0_8px_var(--nx-accent-glow)]"
                initial={{ width: 0 }}
                animate={{ width: `${getLevelProgress(player.xp)}%` }}
                transition={{ duration: 1.2, type: 'spring' }}
              />
            </div>
          </div>
        </div>

        {/* Botão de Resgate de Emergência caso HP esteja crítico ou hibernando */}
        {(hpPercent <= 20 || player.hibernating) && (
          <button
            onClick={() => setActiveTab('study')}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition-all cursor-pointer animate-pulse"
          >
            <Play size={12} fill="currentColor" />
            <span>{player.hibernating ? 'Despertar Pet (Estudar Agora)' : 'Salvar Pet (Estudar Agora)'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

TamagotchiWidget.propTypes = {
  className: PropTypes.string,
};
