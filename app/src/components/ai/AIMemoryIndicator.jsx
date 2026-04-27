import React, { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';

export default function AIMemoryIndicator({ activeTokens, maxTokens }) {
  if (!activeTokens || !maxTokens) return null;

  const usagePercent = Math.min((activeTokens / maxTokens) * 100, 100);
  
  // Cores dinâmicas baseadas no uso
  const getColor = () => {
    if (usagePercent > 85) return 'bg-rose-500';
    if (usagePercent > 60) return 'bg-amber-500';
    return 'bg-teal-500';
  };

  const getGlow = () => {
    if (usagePercent > 85) return 'shadow-[0_0_10px_rgba(244,63,94,0.5)]';
    if (usagePercent > 60) return 'shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    return 'shadow-[0_0_10px_rgba(20,184,166,0.5)]';
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 glass-panel-light rounded-xl border border-white/5">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-2">
          <BrainCircuit size={12} className="text-text-lo" />
          <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest">
            Memória do Contexto
          </span>
        </div>
        <span className="text-[10px] font-bold text-text-hi">
          {Math.round(usagePercent)}%
        </span>
      </div>
      
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} ${getGlow()} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[8px] font-medium text-text-lo/40 uppercase tracking-tighter">
        <span>{activeTokens.toLocaleString()} tokens</span>
        <span>Limite: {maxTokens.toLocaleString()}</span>
      </div>
    </div>
  );
}
