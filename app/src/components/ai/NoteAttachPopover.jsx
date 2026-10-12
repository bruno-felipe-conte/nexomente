import { Plus, FileText, Check, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function NoteAttachPopover({
  showAttachMenu,
  setShowAttachMenu,
  setShowModelMenu,
  buscaNota,
  setBuscaNota,
  notasFiltradas,
  notaId,
  setNotaId,
  notaAtual,
  compact = false
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          title="Anexar nota"
          onClick={(e) => {
            e.stopPropagation();
            setShowAttachMenu(!showAttachMenu);
            setShowModelMenu(false);
          }}
          className={
            compact
              ? 'p-1.5 rounded-lg text-text-lo/40 hover:bg-white/5 transition-all'
              : `p-2 rounded-lg transition-all ${showAttachMenu ? 'bg-white/10 text-text-hi' : 'text-text-lo/40 hover:bg-white/5 hover:text-text-hi'}`
          }
        >
          <Plus size={compact ? 16 : 20} />
        </button>

        <AnimatePresence>
          {showAttachMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-3 w-[90vw] max-w-[320px] max-h-[200px] bg-nx-surface border border-nx-border rounded-nx-md shadow-2xl p-2 z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 relative">
                <Search size={12} className="absolute left-4 top-4 text-text-lo/40" />
                <input
                  autoFocus
                  placeholder="Buscar nota para anexo..."
                  value={buscaNota}
                  onChange={e => setBuscaNota(e.target.value)}
                  className="w-full bg-white/5 border-none rounded-xl py-2 pl-8 pr-4 text-xs text-text-hi placeholder-text-lo/20 focus:ring-0"
                />
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {notasFiltradas.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setNotaId(n.id);
                      setShowAttachMenu(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs text-text-lo hover:bg-white/5 hover:text-text-hi transition-all group"
                  >
                    <FileText size={14} className="opacity-40 group-hover:opacity-100" />
                    <span className="truncate flex-1 text-left">{n.titulo}</span>
                    {notaId === n.id && <Check size={12} className="text-accent-main" />}
                  </button>
                ))}
                {notasFiltradas.length === 0 && (
                  <p className="p-4 text-[10px] text-center text-text-lo/40 uppercase tracking-widest">
                    Nenhuma nota encontrada
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {notaId && !compact && (
        <div className="flex items-center gap-2 bg-accent-main/10 text-accent-main px-3 py-1.5 rounded-full text-[11px] font-bold">
          <FileText size={12} />
          {notaAtual?.titulo.substring(0, 15)}...
          <button onClick={() => setNotaId(null)} className="ml-1 hover:text-white">
            <Plus size={12} className="rotate-45" />
          </button>
        </div>
      )}
    </div>
  );
}
