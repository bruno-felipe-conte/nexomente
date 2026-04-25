import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTamagotchiStore, getLevelData } from '../../store/useTamagotchiStore';
import Card from '../ui/Card';

export default function TamagotchiWidget() {
  const { player, checkDailyStatus, registerStudySession } = useTamagotchiStore();
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
    <Card className="flex flex-col items-center justify-center relative overflow-hidden" interactive>
      {/* Background Effect based on level (optional, based on spec) */}
      {player.level >= 20 && (
        <div className="absolute inset-0 bg-gradient-to-tr from-accent-main/10 to-transparent animate-pulse rounded-[18px]" />
      )}
      
      <div className="text-center z-10 relative">
        <h3 className="text-text-mid text-sm font-bold uppercase tracking-wider mb-4">
          Meu Mascote
        </h3>
        
        <div className="relative inline-block my-4">
          <motion.div 
            className="text-7xl filter drop-shadow-lg cursor-pointer"
            variants={idleVariants}
            animate={currentVariant}
            whileHover={{ scale: 1.1 }}
            title={`Nível ${player.level} - ${levelData.title}`}
          >
            {levelData.form}
          </motion.div>
          <div className="absolute -bottom-2 -right-4 text-2xl" title={`Humor: ${moodStatus}`}>
            {moodEmoji}
          </div>
        </div>

        <h2 className="text-xl font-bold text-text-hi mt-2">
          {player.pet_name || levelData.name}
        </h2>
        <p className="text-text-lo text-sm mt-1">
          Nível {player.level} • {levelData.title}
        </p>

        {/* Barras de Status */}
        <div className="w-full mt-6 space-y-3">
          {/* Barra de HP */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-mid font-semibold">Saúde (HP)</span>
              <span className="text-text-hi font-bold">{player.hp} / {player.hp_max}</span>
            </div>
            <div className="w-full h-2.5 bg-surface-base rounded-full overflow-hidden border border-border-subtle">
              <motion.div 
                className={`h-full ${hpPercent <= 15 ? 'bg-color-warning' : hpPercent >= 80 ? 'bg-color-estudo' : 'bg-accent-main'}`}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Barra de XP */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-mid font-semibold">Experiência</span>
              <span className="text-text-hi font-bold">{player.xp} XP</span>
            </div>
          </div>

          {/* Streak Indicator */}
          <div className="pt-2 border-t border-border-subtle flex items-center justify-center space-x-2">
            <span className="text-xl">🔥</span>
            <span className="text-sm text-text-hi font-bold">{player.streak} dias de ofensiva</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
