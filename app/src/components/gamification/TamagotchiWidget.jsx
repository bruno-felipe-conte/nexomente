import React from 'react';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTamagotchiStore, getLevelData, getLevelProgress } from '../../store/useTamagotchiStore';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

export default function TamagotchiWidget({ className = '' }) {
  const { player, checkDailyStatus } = useTamagotchiStore();
  const levelData = getLevelData(player.xp);

  useEffect(() => {
    checkDailyStatus();
  }, [checkDailyStatus]);

  // Determinar o humor e o emoji secundário baseado no HP
  let moodEmoji = '😐';
  let moodStatus = 'Neutro';
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
    <div className={`nx-panel flex flex-col items-center justify-center relative overflow-hidden group ${className}`}>
      {/* Dynamic Background Glow based on Health/Level */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${hpPercent <= 30 ? 'bg-nx-error/5' : 'bg-nx-accent/5'} opacity-40 group-hover:opacity-100`} />
      
      <div className="text-center z-10 relative w-full h-full flex flex-col items-center p-6">
        <header className="w-full flex items-center justify-between mb-2">
           <span className="text-nx-xs font-mono font-bold uppercase tracking-widest text-nx-muted">NexoPet Status</span>
           <div className={`text-nx-xs px-2 py-0.5 rounded-nx-xs font-mono uppercase ${hpPercent <= 15 ? 'bg-nx-error/20 text-nx-error border border-nx-error/30' : 'bg-nx-success/20 text-nx-success border border-nx-success/30'}`}>
             {moodStatus}
           </div>
        </header>
        
        <div className="relative inline-block my-6">
          {/* Circular Glow behind Mascot */}
          <div className="absolute inset-0 bg-nx-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
          
          <motion.div 
            className="text-8xl filter drop-shadow-[0_0_20px_rgba(91,124,244,0.3)] cursor-pointer relative z-10"
            variants={idleVariants}
            animate={currentVariant}
            whileHover={{ scale: 1.1, rotate: 5 }}
            title={`Nível ${player.level} - ${levelData.title}`}
          >
            {levelData.form}
          </motion.div>
          <motion.div 
            className="absolute -bottom-2 -right-4 text-3xl bg-nx-surface rounded-full w-10 h-10 flex items-center justify-center shadow-glow-primary border border-nx-border"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {moodEmoji}
          </motion.div>
        </div>

        <div className="space-y-1">
          <h2 className="text-nx-xl font-display font-bold text-nx-bright">
            {player.pet_name || levelData.name}
          </h2>
          <p className="text-nx-dim text-nx-xs font-mono font-bold uppercase tracking-widest opacity-80">
            {levelData.title} • Nível {player.level}
          </p>
        </div>

        {/* Status Indicators (Minimalist & Premium) */}
        <div className="w-full mt-10 space-y-6">
          {/* HP Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-nx-muted">Vitalidade (HP)</span>
              <span className="text-nx-xs font-mono font-bold text-nx-bright">{player.hp}<span className="text-nx-muted">/{player.hp_max}</span></span>
            </div>
            <div className="w-full h-1.5 bg-nx-void rounded-full overflow-hidden border border-nx-border/50">
              <motion.div 
                className={`h-full ${hpPercent <= 15 ? 'bg-nx-error shadow-[0_0_10px_var(--nx-error)]' : hpPercent >= 80 ? 'bg-nx-success shadow-[0_0_10px_var(--nx-success)]' : 'bg-nx-primary shadow-[0_0_10px_var(--nx-primary)]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 1.5, type: "spring" }}
              />
            </div>
          </div>

          {/* XP Summary & Progress */}
          <div className="nx-card p-4 rounded-nx-md space-y-4 border-nx-border/40">
             <div className="flex items-center justify-between">
                <div className="flex flex-col items-start">
                   <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-nx-muted">Experiência</span>
                   <span className="text-nx-sm font-ui font-bold text-nx-bright">{player.xp} <span className="text-nx-muted text-[10px]">XP TOTAL</span></span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-nx-muted">Streak</span>
                   <span className="text-nx-sm font-ui font-bold text-nx-accent flex items-center gap-1">
                      🔥 {player.streak}d
                   </span>
                </div>
             </div>
             
             {/* XP Progress Bar (Synced with Egg/Pet) */}
             <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[8px] font-mono font-black uppercase tracking-tighter text-nx-muted/60">
                   <span>Progresso para Nível {player.level + 1}</span>
                   <span>{Math.round(getLevelProgress(player.xp))}%</span>
                </div>
                <div className="w-full h-1 bg-nx-void rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-nx-accent shadow-[0_0_8px_var(--nx-accent-glow)]"
                     initial={{ width: 0 }}
                     animate={{ width: `${getLevelProgress(player.xp)}%` }}
                     transition={{ duration: 1.5, type: "spring" }}
                   />
                </div>
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
