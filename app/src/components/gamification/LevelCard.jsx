import React from 'react';
import { Zap, Star, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const LEVELS = [
  { min: 0, max: 100, label: "Aprendiz Curioso", icon: "🌱", color: "from-green-500 to-emerald-600" },
  { min: 101, max: 300, label: "Estudante Iniciante", icon: "📖", color: "from-blue-500 to-indigo-600" },
  { min: 301, max: 600, label: "Estudante Dedicado", icon: "🔥", color: "from-orange-500 to-red-600" },
  { min: 601, max: 1000, label: "Explorador do Saber", icon: "🏔️", color: "from-purple-500 to-pink-600" },
  { min: 1001, max: Infinity, label: "Mestre do Conhecimento", icon: "👑", color: "from-yellow-500 to-amber-600" }
];

export default function LevelCard({ xp }) {
  const currentLevel = LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  
  const progress = nextLevel 
    ? ((xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100 
    : 100;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${currentLevel.color} p-6 rounded-2xl shadow-xl text-white`}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
         <Trophy size={120} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner">
            {currentLevel.icon}
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
            <h2 className="text-2xl font-black font-display tracking-tight">{currentLevel.label}</h2>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest">
              Level {LEVELS.indexOf(currentLevel) + 1}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold opacity-80 uppercase tracking-wider">Progresso de XP</span>
              <span className="text-sm font-black">{xp} / {nextLevel ? currentLevel.max : 'MAX'}</span>
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
