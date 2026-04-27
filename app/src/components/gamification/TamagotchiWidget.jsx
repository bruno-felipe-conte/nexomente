import React from 'react';
import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTamagotchiStore, getLevelData } from '../../store/useTamagotchiStore';
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
    <Card className={`glass-panel border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover-lift ${className}`} interactive>
      {/* Dynamic Background Glow based on Health/Level */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${hpPercent <= 30 ? 'bg-red-500/5' : 'bg-accent-main/5'} opacity-40 group-hover:opacity-100`} />
      
      <div className="text-center z-10 relative w-full h-full flex flex-col items-center">
        <header className="w-full flex items-center justify-between mb-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-text-lo">NexoPet Status</span>
           <Badge variant={hpPercent <= 15 ? 'error' : 'success'} className="text-[9px] py-0">{moodStatus}</Badge>
        </header>
        
        <div className="relative inline-block my-8">
          {/* Circular Glow behind Mascot */}
          <div className="absolute inset-0 bg-accent-main/20 blur-3xl rounded-full scale-150 animate-pulse" />
          
          <motion.div 
            className="text-8xl filter drop-shadow-[0_0_20px_rgba(124,109,250,0.5)] cursor-pointer relative z-10"
            variants={idleVariants}
            animate={currentVariant}
            whileHover={{ scale: 1.15, rotate: 5 }}
            title={`Nível ${player.level} - ${levelData.title}`}
          >
            {levelData.form}
          </motion.div>
          <motion.div 
            className="absolute -bottom-2 -right-4 text-3xl bg-surface-raised rounded-full w-10 h-10 flex items-center justify-center shadow-lg border border-white/10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            {moodEmoji}
          </motion.div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-display font-bold text-text-hi">
            {player.pet_name || levelData.name}
          </h2>
          <p className="text-text-mid text-xs font-bold uppercase tracking-widest opacity-60">
            {levelData.title} • Nível {player.level}
          </p>
        </div>

        {/* Status Indicators (Minimalist & Premium) */}
        <div className="w-full mt-10 space-y-5">
          {/* HP Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-lo">Vitalidade (HP)</span>
              <span className="text-xs font-bold text-text-hi">{player.hp}<span className="text-text-lo">/{player.hp_max}</span></span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden inner-shadow">
              <motion.div 
                className={`h-full shadow-[0_0_10px_rgba(var(--color-estudo-rgb),0.5)] ${hpPercent <= 15 ? 'bg-color-error' : hpPercent >= 80 ? 'bg-color-estudo' : 'bg-accent-main'}`}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 1.5, type: "spring" }}
              />
            </div>
          </div>

          {/* XP Summary */}
          <div className="glass-panel-light p-3 rounded-2xl flex items-center justify-between">
             <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-lo">Experiência</span>
                <span className="text-sm font-bold text-text-hi">{player.xp} <span className="text-text-lo text-[10px]">XP TOTAL</span></span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-lo">Streak</span>
                <span className="text-sm font-bold text-color-warning flex items-center gap-1">
                   🔥 {player.streak}d
                </span>
             </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

TamagotchiWidget.propTypes = {
  className: PropTypes.string,
};
