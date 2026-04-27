import React from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ActivityHeatmap({ sessoes }) {
  const today = new Date();
  const daysToShow = 112; // 16 semanas
  const startDate = subDays(today, daysToShow);
  
  const allDays = eachDayOfInterval({
    start: startDate,
    end: today
  });

  const getIntensity = (date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const count = sessoes.filter(s => s.started_at?.startsWith(dayStr)).length;
    if (count === 0) return 'bg-white/5';
    if (count === 1) return 'bg-teal-900';
    if (count === 2) return 'bg-teal-700';
    if (count === 3) return 'bg-teal-500';
    return 'bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.4)]';
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5">
      <h3 className="text-sm font-bold text-text-hi font-display mb-6 flex items-center justify-between">
        Frequência de Estudo
        <div className="flex items-center gap-1.5">
           <span className="text-[10px] text-text-lo uppercase">Menos</span>
           {[0, 1, 2, 3, 4].map(i => (
             <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i === 0 ? 'bg-white/5' : i === 1 ? 'bg-teal-900' : i === 2 ? 'bg-teal-700' : i === 3 ? 'bg-teal-500' : 'bg-teal-300'}`} />
           ))}
           <span className="text-[10px] text-text-lo uppercase">Mais</span>
        </div>
      </h3>

      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4">
        {/* Agrupando por semanas */}
        <div className="flex flex-col flex-wrap h-28 gap-1.5 content-start">
          {allDays.map((day, idx) => (
            <div
              key={idx}
              title={`${format(day, 'dd/MM/yyyy')}`}
              className={`w-3 h-3 rounded-[2px] transition-all hover:scale-125 hover:z-10 ${getIntensity(day)}`}
            />
          ))}
        </div>
      </div>
      
      <div className="mt-2 flex justify-between text-[9px] text-text-lo uppercase tracking-tighter font-bold opacity-40">
        <span>{format(startDate, 'MMM yyyy', { locale: ptBR })}</span>
        <span>{format(today, 'MMM yyyy', { locale: ptBR })}</span>
      </div>
    </div>
  );
}
