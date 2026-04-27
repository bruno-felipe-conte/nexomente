import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Cpu, Globe, Zap, X } from 'lucide-react';
import PropTypes from 'prop-types';

export default function AIFallbackModal({ isOpen, error, onRetry, onSwitchProvider, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-danger/10 p-6 flex items-center gap-4 border-b border-border-subtle">
            <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center text-danger shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-primary">Ops! A IA Falhou</h3>
              <p className="text-xs text-text-muted mt-1 line-clamp-2">{error}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted">
              <X size={18} />
            </button>
          </div>

          {/* Opções */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-text-secondary mb-4">
              O provedor atual não respondeu. Como deseja prosseguir?
            </p>

            <div className="grid gap-3">
              <button
                onClick={() => onSwitchProvider('local')}
                className="flex items-center gap-3 p-4 bg-bg-tertiary hover:bg-bg-active border border-border-subtle hover:border-accent-main rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-main/10 flex items-center justify-center text-accent-main group-hover:scale-110 transition-transform">
                  <Cpu size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-text-primary">Mudar para LM Studio</div>
                  <div className="text-[10px] text-text-muted">Usa o processamento do seu computador</div>
                </div>
              </button>

              <button
                onClick={() => onSwitchProvider('embedded')}
                className="flex items-center gap-3 p-4 bg-bg-tertiary hover:bg-bg-active border border-border-subtle hover:border-accent-main rounded-xl transition-all text-left group opacity-60 grayscale cursor-not-allowed"
                disabled
              >
                <div className="w-10 h-10 rounded-lg bg-xp-gold/10 flex items-center justify-center text-xp-gold">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-text-primary">Modelo Embutido (Gemma 4B)</div>
                  <div className="text-[10px] text-text-muted">Indisponível no momento</div>
                </div>
              </button>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={onRetry}
                className="flex-1 py-2.5 bg-accent-main text-white font-bold rounded-lg hover:bg-accent-main/90 transition-all flex items-center justify-center gap-2"
              >
                Tentar Novamente
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-bg-tertiary text-text-secondary font-bold rounded-lg hover:bg-bg-active transition-all"
              >
                Ignorar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

AIFallbackModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  onSwitchProvider: PropTypes.func,
  onClose: PropTypes.func,
};
