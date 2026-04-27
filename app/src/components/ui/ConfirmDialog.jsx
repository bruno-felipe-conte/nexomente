import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-bg-secondary/80 border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 max-w-md w-full overflow-hidden backdrop-blur-2xl"
          >
            {/* Decorativo */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-main/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-2xl ${confirmVariant === 'destructive' ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'}`}>
                  <AlertTriangle size={28} />
                </div>
                <button 
                  onClick={onCancel}
                  className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="text-2xl font-black text-text-primary mb-3 leading-tight">
                {title}
              </h2>
              
              {description && (
                <p className="text-text-secondary text-base leading-relaxed mb-8">
                  {description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-text-secondary bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-6 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-black/20 ${
                    confirmVariant === 'destructive' 
                      ? 'bg-gradient-to-br from-error to-red-700 text-white' 
                      : 'bg-gradient-to-br from-primary to-accent-main text-white'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string,
  confirmLabel: PropTypes.string,
  confirmVariant: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};

export default ConfirmDialog;
