import PropTypes from 'prop-types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, Settings2, Database, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResetModal({ open, onConfirm, onCancel }) {
  const [apagarConfig, setApagarConfig] = useState(false);

  const handleConfirm = () => {
    onConfirm(apagarConfig);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop mais leve e sofisticado — evita o efeito de "tudo escuro" */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-white/5 dark:bg-black/20 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-bg-secondary/95 border border-white/10 rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.2)] p-8 max-w-lg w-full overflow-hidden backdrop-blur-3xl"
          >
            {/* Elementos visuais sutis */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-main/5 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-error/10 text-error rounded-2xl">
                    <Trash2 size={24} />
                  </div>
                  <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Limpeza de Ambiente</h2>
                </div>
                <button 
                  onClick={onCancel}
                  className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {/* Nota de Segurança Explícita */}
                <div className="p-4 bg-success/5 border border-success/20 rounded-2xl flex gap-3 items-center">
                  <ShieldCheck className="text-success flex-shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-success uppercase tracking-wide">
                    Seus arquivos de modelo (.gguf) e chaves de API nunca são excluídos do seu computador.
                  </p>
                </div>

                <div className="p-1 bg-bg-tertiary/30 rounded-3xl border border-white/5">
                  {/* Opção 1: Dados de Estudo */}
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                      <Database size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-text-primary">Limpar Dados de Estudo</p>
                      <p className="text-[11px] text-text-muted">Apaga Notas, Flashcards, Matérias e Questões do app.</p>
                    </div>
                    <div className="text-[10px] font-black text-error uppercase">Obrigatório</div>
                  </div>

                  {/* Opção 2: Preferências */}
                  <button 
                    onClick={() => setApagarConfig(!apagarConfig)}
                    className={`w-full mt-1 flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                      apagarConfig 
                        ? 'bg-error/5 border-error/20' 
                        : 'bg-transparent border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${apagarConfig ? 'bg-error/20 text-error' : 'bg-bg-tertiary text-text-muted'}`}>
                      <Settings2 size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-bold text-sm ${apagarConfig ? 'text-error' : 'text-text-primary'}`}>Redefinir Preferências</p>
                      <p className="text-[11px] text-text-muted">Volta Idioma, Tema e Seleção de IA para os padrões de fábrica.</p>
                    </div>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      apagarConfig ? 'bg-error border-error' : 'border-white/10'
                    }`}>
                      {apagarConfig && <X size={12} className="text-white" />}
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-4 rounded-2xl text-xs font-bold text-text-secondary bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                >
                  Manter tudo
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-6 py-4 rounded-2xl text-xs font-black bg-gradient-to-r from-error to-red-600 text-white transition-all active:scale-95 shadow-lg shadow-error/10 uppercase tracking-widest"
                >
                  Confirmar Limpeza
                </button>
              </div>
              
              <div className="mt-6 flex items-start gap-2 text-center justify-center">
                <AlertCircle size={12} className="text-text-muted mt-0.5" />
                <p className="text-[10px] text-text-muted leading-tight max-w-[80%]">
                  O NexoMente será reiniciado automaticamente após a limpeza para aplicar as mudanças.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

ResetModal.propTypes = {
  open: PropTypes.bool,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
};
