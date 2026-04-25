/**
 * FlashcardViewer — área de revisão espaçada SM-2 do card atual.
 * Extraído de Flashcards.jsx (Tarefa 4.1).
 * Suporta navegação por teclado: Espaço (flip), 1/3/5 (review), Setas (navegar).
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import PropTypes from 'prop-types';

const QUALITY_LABELS = {
  1: { label: 'Errei', cor: '#EF4444' },
  3: { label: 'Quase', cor: '#F59E0B' },
  5: { label: 'Acertou', cor: '#10B981' },
};

export default function FlashcardViewer({
  cardAtual, paraRevisao, idxRevisao, mostrandoFrente,
  onViraCard, onRevisar, onAnterior, onProximo, onEditar, onCriar,
}) {
  useEffect(() => {
    if (!cardAtual) return;
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onViraCard(); }
      else if (e.key === '1') { e.preventDefault(); onRevisar(1); }
      else if (e.key === '2' || e.key === '3') { e.preventDefault(); onRevisar(3); }
      else if (e.key === '5') { e.preventDefault(); onRevisar(5); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onAnterior(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onProximo(); }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); onEditar(cardAtual); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardAtual, onViraCard, onRevisar, onAnterior, onProximo, onEditar]);

  if (!cardAtual) {
    return (
      <div className="bg-bg-secondary rounded-xl p-12 border border-border-subtle text-center">
        <Brain size={48} className="mx-auto mb-4 text-text-muted opacity-25" />
        <p className="text-lg text-text-primary">Nenhum card para revisar!</p>
        <p className="text-sm text-text-muted mt-1">Volte mais tarde ou crie novos cards</p>
        <button
          onClick={onCriar}
          className="mt-4 px-4 py-2 bg-accent-main rounded text-sm font-medium cursor-pointer"
        >
          Criar card
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-subtle">
      {/* Conteúdo */}
      <div className="p-8 text-center">
        <p className="text-xs text-text-muted mb-4">
          {idxRevisao + 1} / {paraRevisao.length}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${cardAtual.id}-${mostrandoFrente}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-xl font-semibold text-text-primary mb-8 leading-relaxed"
          >
            {mostrandoFrente ? cardAtual.frente : cardAtual.verso}
          </motion.p>
        </AnimatePresence>
        <button
          onClick={onViraCard}
          className="px-4 py-2 bg-bg-tertiary border border-border-subtle rounded text-sm cursor-pointer"
        >
          {mostrandoFrente ? 'Ver Resposta' : 'Ver Pergunta'}
        </button>
      </div>

      {/* Botões de qualidade */}
      <div className="border-t border-border-subtle p-4 flex justify-center gap-3">
        {Object.entries(QUALITY_LABELS).map(([q, info]) => (
          <button
            key={q}
            onClick={() => onRevisar(parseInt(q))}
            className="px-5 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-2"
            style={{ backgroundColor: `${info.cor}20`, border: `1px solid ${info.cor}40`, color: info.cor }}
          >
            {parseInt(q) === 1 ? <X size={16} /> : parseInt(q) === 3 ? <RotateCcw size={16} /> : <Check size={16} />}
            {info.label}
          </button>
        ))}
      </div>

      {/* Navegação */}
      <div className="border-t border-border-subtle p-3 flex justify-between items-center">
        <button
          onClick={onAnterior}
          disabled={idxRevisao === 0}
          className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-xs text-text-muted">
          ef: {cardAtual.ef?.toFixed(1)} · streak: {cardAtual.repetitions}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEditar(cardAtual)}
            className="px-2 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs text-text-muted hover:text-accent-main hover:border-accent-main cursor-pointer flex items-center gap-1"
          >
            <Edit size={12} /> Editar
          </button>
          <button
            onClick={onProximo}
            disabled={idxRevisao >= paraRevisao.length - 1}
            className="p-2 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

FlashcardViewer.propTypes = {
  cardAtual: PropTypes.any,
  paraRevisao: PropTypes.any,
  idxRevisao: PropTypes.any,
  mostrandoFrente: PropTypes.any,
  onViraCard: PropTypes.func,
  onRevisar: PropTypes.func,
  onAnterior: PropTypes.func,
  onProximo: PropTypes.func,
  onEditar: PropTypes.func,
  onCriar: PropTypes.func,
};
