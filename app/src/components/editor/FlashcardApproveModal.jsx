import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Check, Loader2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFlashcards } from '../../hooks/useFlashcards';
import PropTypes from 'prop-types';

export default function FlashcardApproveModal({ cards, loading, onCancel, modelo, notaTitulo }) {
  const { create } = useFlashcards();
  const [idx, setIdx] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manualFrente, setManualFrente] = useState('');
  const [manualVerso, setManualVerso] = useState('');
  const [salvos, setSalvos] = useState(0);
  const [pulados, setPulados] = useState(0);
  const [total, setTotal] = useState(cards?.length || 0);

  const restantes = total - idx;
  const card = cards?.[idx];

  const handleSalvar = () => {
    if (!card) return;
    create({ frente: card.frente, verso: card.verso, materia: 'geral' });
    setSalvos(s => s + 1);
    if (idx < cards.length - 1) setIdx(i => i + 1);
    else setIdx(i => i + 1);
  };

  const handlePular = () => {
    setPulados(p => p + 1);
    if (idx < cards.length - 1) setIdx(i => i + 1);
    else setIdx(i => i + 1);
  };

  const handleManual = () => {
    if (!manualFrente.trim() || !manualVerso.trim()) return;
    create({ frente: manualFrente.trim(), verso: manualVerso.trim(), materia: 'geral' });
    setSalvos(s => s + 1);
    setManualFrente('');
    setManualVerso('');
    setShowManual(false);
  };

  const handlePrev = () => {
    if (idx > 0) setIdx(i => i - 1);
  };

  const handleNext = () => {
    if (idx < cards.length - 1) setIdx(i => i + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-bg-secondary border border-border-subtle rounded-xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div>
            <span className="font-semibold text-text-primary">Flashcards gerados</span>
            {notaTitulo && (
              <p className="text-xs text-text-muted truncate max-w-[200px]">{notaTitulo}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {modelo && <span className="text-[10px] text-text-muted">{modelo}</span>}
            <button onClick={onCancel} className="p-1 text-text-muted hover:text-text-primary cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-accent-main" />
              <span className="ml-2 text-sm text-text-muted">Gerando flashcards...</span>
            </div>
          ) : cards?.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>Nenhum flashcard gerado. Tente novamente.</p>
            </div>
          ) : card ? (
            <>
              <div className="text-xs text-text-muted text-center">
                Card {idx + 1} de {cards.length}
                <span className="ml-2 text-success">({salvos} salvos)</span>
                {pulados > 0 && <span className="ml-2 text-text-muted">({pulados} pulados)</span>}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={card.frente + card.verso}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <div className="bg-bg-tertiary border border-accent-main/30 rounded-lg p-4">
                    <p className="text-[10px] text-accent-main mb-2 uppercase tracking-wider">Frente</p>
                    <p className="text-sm text-text-primary leading-relaxed">{card.frente}</p>
                  </div>
                  <div className="bg-bg-tertiary border border-border-subtle rounded-lg p-4">
                    <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Verso</p>
                    <p className="text-sm text-text-primary leading-relaxed">{card.verso}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={idx === 0}
                  className="p-2 bg-bg-tertiary border border-border-subtle rounded hover:border-accent-main disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handlePular}
                  className="px-4 py-2 bg-bg-tertiary border border-border-subtle rounded hover:border-warning text-warning transition-colors cursor-pointer"
                >
                  Pular
                </button>
                <button
                  onClick={handleSalvar}
                  className="px-4 py-2 bg-success/20 border border-success/40 rounded hover:bg-success/30 text-success transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check size={16} /> Salvar
                </button>
                <button
                  onClick={handleNext}
                  disabled={idx >= cards.length - 1}
                  className="p-2 bg-bg-tertiary border border-border-subtle rounded hover:border-accent-main disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <p>Todos os {cards.length} cards processados.</p>
              <p className="text-sm mt-1">
                <span className="text-success">{salvos}</span> salvos,
                <span className="text-text-muted ml-2">{pulados}</span> pulados
              </p>
            </div>
          )}

          <div className="border-t border-border-subtle pt-4">
            {!showManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main transition-colors cursor-pointer"
              >
                <Plus size={12} /> Criar card manual
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  value={manualFrente}
                  onChange={e => setManualFrente(e.target.value)}
                  placeholder="Frente (pergunta)..."
                  className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 text-sm focus:border-accent-main focus:outline-none"
                />
                <input
                  value={manualVerso}
                  onChange={e => setManualVerso(e.target.value)}
                  placeholder="Verso (resposta)..."
                  className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 text-sm focus:border-accent-main focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowManual(false)}
                    className="flex-1 px-3 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleManual}
                    disabled={!manualFrente.trim() || !manualVerso.trim()}
                    className="flex-1 px-3 py-1.5 bg-accent-main rounded text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-border-subtle">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-bg-tertiary border border-border-subtle rounded text-sm hover:border-accent-main transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
FlashcardApproveModal.propTypes = {
  cards: PropTypes.any,
  loading: PropTypes.any,
  onCancel: PropTypes.func,
  modelo: PropTypes.any,
  notaTitulo: PropTypes.any,
};
