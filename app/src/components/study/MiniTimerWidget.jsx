import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize2, X, Zap } from 'lucide-react';
import { useStudyTimerStore, MODOS_ESTUDO } from '../../store/useStudyTimerStore';
import { useMaterias } from '../../hooks/useMaterias';

export default function MiniTimerWidget({ onExpand }) {
  const {
    timer,
    totalSeconds,
    rodando,
    modo,
    materiaAtiva,
    iniciar,
    pausar,
    abandonarSessao
  } = useStudyTimerStore();

  const { materias } = useMaterias();
  const currentModo = MODOS_ESTUDO.find(m => m.id === modo) || MODOS_ESTUDO[0];
  const materiaObj = materias.find(m => m.id === materiaAtiva);

  const formatTime = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timer) / totalSeconds) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="mini-timer-widget"
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 select-none"
      >
        <div 
          className="relative group flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[#0b0e14]/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:border-white/20 transition-all"
          style={{
            boxShadow: `0 0 20px ${currentModo.color}25, 0 12px 32px rgba(0,0,0,0.6)`
          }}
        >
          {/* Barra de progresso discreta no fundo do widget */}
          <div 
            className="absolute bottom-0 left-0 h-[2px] rounded-b-2xl transition-all duration-1000"
            style={{ 
              width: `${progress}%`,
              backgroundColor: currentModo.color,
              boxShadow: `0 0 8px ${currentModo.color}`
            }}
          />

          {/* Indicador pulsante do modo */}
          <div 
            onClick={onExpand}
            className="flex items-center gap-2 cursor-pointer"
            title="Clique para voltar para a Sala de Estudos"
          >
            <div className="relative flex items-center justify-center">
              <span 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentModo.color }}
              />
              {rodando && (
                <span 
                  className="absolute w-4 h-4 rounded-full animate-ping opacity-75"
                  style={{ backgroundColor: currentModo.color }}
                />
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-nx-dim">
                {materiaObj ? materiaObj.nome : currentModo.label}
              </span>
              <span className="text-base font-mono font-black text-white leading-tight tracking-widest tabular-nums">
                {formatTime(timer)}
              </span>
            </div>
          </div>

          {/* Badge de XP */}
          <div 
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-mono font-bold text-nx-subtle"
            title={`Ganha +${currentModo.xp} XP ao concluir`}
          >
            <Zap size={10} className="text-yellow-400" />
            <span>+{currentModo.xp}</span>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1 pl-1 border-l border-white/10">
            {/* Play / Pause */}
            <button
              onClick={rodando ? pausar : () => iniciar()}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
              title={rodando ? "Pausar estudo" : "Retomar estudo"}
            >
              {rodando ? <Pause size={14} /> : <Play size={14} />}
            </button>

            {/* Expandir / Abrir tela cheia */}
            <button
              onClick={onExpand}
              className="p-1.5 rounded-xl hover:bg-white/10 text-nx-dim hover:text-white transition-colors cursor-pointer"
              title="Expandir Sala de Estudos"
            >
              <Maximize2 size={13} />
            </button>

            {/* Abandonar / Fechar */}
            <button
              onClick={abandonarSessao}
              className="p-1.5 rounded-xl hover:bg-red-500/20 text-nx-dim hover:text-red-400 transition-colors cursor-pointer"
              title="Cancelar sessão de estudo"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
