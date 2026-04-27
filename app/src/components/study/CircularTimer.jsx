import React from 'react';
import { motion } from 'framer-motion';

export default function CircularTimer({ seconds, totalSeconds, isActive, color = '#2DD4BF' }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Background Glow */}
      <motion.div 
        animate={{ 
          scale: isActive ? [1, 1.05, 1] : 1,
          opacity: isActive ? [0.1, 0.2, 0.1] : 0.05
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ backgroundColor: color }}
      />

      <svg className="w-64 h-64 transform -rotate-90 drop-shadow-2xl">
        {/* Trilho (Track) */}
        <circle
          cx="128"
          cy="128"
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progresso (Progress) */}
        <motion.circle
          cx="128"
          cy="128"
          r={radius}
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "linear" }}
          strokeLinecap="round"
          fill="transparent"
          style={{
             filter: `drop-shadow(0 0 8px ${color}80)`
          }}
        />
      </svg>

      {/* Tempo Central */}
      <div className="absolute flex flex-col items-center justify-center text-white">
        <motion.span 
          key={seconds}
          initial={{ scale: 0.9, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-black font-mono tracking-tighter"
        >
          {formatTime(seconds)}
        </motion.span>
        <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest mt-1 opacity-60">
          {isActive ? 'Foco Ativo' : 'Pausado'}
        </span>
      </div>
    </div>
  );
}
