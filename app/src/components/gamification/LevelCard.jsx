import React from 'react';
import PropTypes from 'prop-types';
import { Zap, Star, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

import { TAMAGOTCHI_LEVELS, getLevelData, getLevelProgress } from '../../store/useTamagotchiStore';

export default function LevelCard({ xp }) {
  const currentLevelData = getLevelData(xp);
  const nextIdx = TAMAGOTCHI_LEVELS.indexOf(currentLevelData) + 1;
  const nextLevelData = TAMAGOTCHI_LEVELS[nextIdx];
  
  const progress = getLevelProgress(xp);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${currentLevelData.level > 20 ? 'from-purple-600 to-indigo-900' : 'from-green-500 to-emerald-600'} p-6 rounded-2xl shadow-xl text-white`}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
         <Trophy size={120} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner">
            {currentLevelData.form}
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-accent-main flex items-center justify-center shadow-lg"
          >
            <Star size={14} fill="currentColor" />
          </motion.div>
        </div>

        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h2 className="text-2xl font-black font-display tracking-tight">{currentLevelData.name}</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest">
              Level {currentLevelData.level}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold opacity-80 uppercase tracking-wider">{currentLevelData.title}</span>
              <span className="text-sm font-black">{xp} / {nextLevelData ? nextLevelData.xp : 'MAX'}</span>
            </div>
            <div className="h-3 w-full bg-black/10 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-center justify-center px-6 border-l border-white/10">
           <Zap size={24} className="mb-1 text-white animate-pulse" />
           <p className="text-2xl font-black">{xp}</p>
           <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Total XP</p>
        </div>
      </div>
    </div>
  );
}

LevelCard.propTypes = {
  xp: PropTypes.number,
};
