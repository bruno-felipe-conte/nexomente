import { useState, useEffect } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag } from 'lucide-react';
import PropTypes from 'prop-types';

export default function TagPickerModal({ tagsSugeridas, loading, onConfirm, onCancel, modelo }) {
  const [selecionadas, setSelecionadas] = useState({});
  const [tagManual, setTagManual] = useState('');

  useEffect(() => {
    if (tagsSugeridas.length > 0) {
      const init = {};
      tagsSugeridas.forEach(t => { init[t] = true; });
      setSelecionadas(init);
    }
  }, [tagsSugeridas]);

  const toggle = (tag) => {
    setSelecionadas(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const count = Object.values(selecionadas).filter(Boolean).length;

  const adicionarManual = () => {
    const tag = tagManual.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!tag) return;
    setSelecionadas(prev => ({ ...prev, [tag]: true }));
    setTagManual('');
  };

  const handleConfirm = () => {
    const aceitas = Object.entries(selecionadas)
      .filter(([, v]) => v)
      .map(([tag]) => tag);
    onConfirm(aceitas);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-bg-secondary border border-border-subtle rounded-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-accent-light" />
            <span className="font-semibold text-text-primary">Tags sugeridas</span>
          </div>
          <div className="flex items-center gap-2">
            {modelo && (
              <span className="text-[10px] text-text-muted">{modelo}</span>
            )}
            <button
              onClick={onCancel}
              className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[400px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-accent-main" />
              <span className="ml-2 text-sm text-text-muted">Gerando tags...</span>
            </div>
          ) : tagsSugeridas.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              Nenhuma tag gerada. Tente novamente.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {tagsSugeridas.map(tag => (
                  <motion.button
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => toggle(tag)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      selecionadas[tag]
                        ? 'bg-accent-main/20 text-accent-main border-accent-main/40'
                        : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-accent-main/40'
                    }`}
                  >
                    {selecionadas[tag] && <Check size={10} />}
                    #{tag}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="border-t border-border-subtle pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagManual}
                onChange={e => setTagManual(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') adicionarManual(); }}
                placeholder="Adicionar tag manual..."
                className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 text-sm focus:border-accent-main focus:outline-none"
              />
              <button
                onClick={adicionarManual}
                disabled={!tagManual.trim()}
                className="p-1.5 bg-bg-tertiary border border-border-subtle rounded hover:border-accent-main disabled:opacity-40 cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border-subtle">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-bg-tertiary border border-border-subtle rounded text-sm hover:border-accent-main transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={count === 0}
            className="px-4 py-2 bg-accent-main rounded text-sm font-medium hover:bg-accent-main/90 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Check size={14} />
            Adicionar ({count})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
TagPickerModal.propTypes = {
  tagsSugeridas: PropTypes.any,
  loading: PropTypes.any,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  modelo: PropTypes.any,
};
