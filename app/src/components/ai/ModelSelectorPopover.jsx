import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ModelSelectorPopover({
  modeloAtual,
  modelos,
  trocarModelo,
  temperatura,
  trocarTemperatura,
  showModelMenu,
  setShowModelMenu,
  setShowAttachMenu,
  compact = false
}) {
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModelMenu(!showModelMenu);
          setShowAttachMenu(false);
        }}
        className={
          compact
            ? 'flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold text-text-lo/40 hover:bg-white/5 transition-all'
            : 'flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium text-text-lo/60 hover:bg-white/5 transition-all group'
        }
      >
        <span className={compact ? '' : 'group-hover:text-text-hi transition-colors'}>
          {modeloAtual.split('/').pop()}
        </span>
        <ChevronDown
          size={compact ? 10 : 14}
          className={`${compact ? '' : 'opacity-40 '}transition-transform ${showModelMenu ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {showModelMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-fit min-w-[200px] max-w-[calc(100vw-40px)] bg-nx-overlay border border-nx-border rounded-nx-md shadow-2xl z-50 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/5 bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-10 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-lo/40">
                {compact ? 'Trocar Modelo' : 'Modelos Disponíveis'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[200px] p-2 space-y-1 custom-scrollbar">
              {modelos.map(m => {
                const isCurrent = modeloAtual === m;
                const name = m.split('/').pop();
                return (
                  <button
                    key={m}
                    onClick={() => {
                      trocarModelo(m);
                      setShowModelMenu(false);
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl text-left transition-all group ${isCurrent ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-text-hi' : 'text-text-lo/60'}`}>{name}</span>
                      {isCurrent && <Check size={12} className="text-accent-main" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-1 border-t border-white/5 p-3 flex items-center justify-between bg-white/[0.02]">
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold ${temperatura < 0.5 ? 'text-accent-main' : 'text-text-hi'}`}>
                  {temperatura < 0.5 ? 'Raciocínio Profundo' : 'Pensamento Adaptativo'}
                </span>
                <span className="text-[9px] text-text-lo/40">
                  {temperatura < 0.5 ? 'Modo lógico ativado' : 'Alternar para modo lógico'}
                </span>
              </div>
              <button
                onClick={() => trocarTemperatura(temperatura === 0.7 ? 0.3 : 0.7)}
                className={`w-8 h-4 rounded-full p-0.5 transition-all duration-300 ${temperatura < 0.5 ? 'bg-accent-main shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-white/10'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${temperatura < 0.5 ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
