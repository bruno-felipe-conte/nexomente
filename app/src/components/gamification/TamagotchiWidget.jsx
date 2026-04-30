import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTamagotchiStore, getLevelData, getLevelProgress } from '../../store/useTamagotchiStore';

export default function TamagotchiWidget({ className = '' }) {
  const { player, checkDailyStatus } = useTamagotchiStore();
  const levelData = getLevelData(player.xp);

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
        <div className="flex items-center gap-5 mb-4">
          {/* Pet figure */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-nx-primary/10 blur-2xl rounded-full scale-150 animate-pulse" />
            <motion.div
              className="text-7xl filter drop-shadow-[0_0_16px_rgba(91,124,244,0.3)] cursor-pointer relative z-10"
              variants={idleVariants}
              animate={currentVariant}
              whileHover={{ scale: 1.1, rotate: 5 }}
              title={`Nível ${player.level} - ${levelData.title}`}
            >
              {levelData.form}
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -right-3 text-xl bg-nx-surface rounded-full w-8 h-8 flex items-center justify-center shadow-glow-primary border border-nx-border"
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
              <p className="text-[13px] font-mono font-bold text-nx-accent leading-none">🔥 {player.streak}d</p>
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
      </div>
    </div>
  );
}

TamagotchiWidget.propTypes = {
  className: PropTypes.string,
};
