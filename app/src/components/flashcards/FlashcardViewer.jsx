/**
 * FlashcardViewer — área de revisão espaçada SM-2 do card atual.
 * Extraído de Flashcards.jsx (Tarefa 4.1).
 * Suporta navegação por teclado: Espaço (flip), 1/3/5 (review), Setas (navegar).
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, X, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import PropTypes from 'prop-types';

import Button from '../ui/Button';
import Card from '../ui/Card';

const QUALITY_LABELS = {
  1: { label: 'Errei', cor: 'var(--color-error)' },
  2: { label: 'Difícil', cor: 'var(--color-warning)' },
  3: { label: 'Bom', cor: 'var(--color-success)' },
  4: { label: 'Fácil', cor: 'var(--color-brand)' },
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
      else if (mostrandoFrente) return; // Só permite avaliar se o card estiver virado
      else if (e.key === '1') { e.preventDefault(); onRevisar(1); }
      else if (e.key === '2') { e.preventDefault(); onRevisar(2); }
      else if (e.key === '3') { e.preventDefault(); onRevisar(3); }
      else if (e.key === '4') { e.preventDefault(); onRevisar(4); }
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
        <Button onClick={onCriar} variant="primary" className="mt-4">
          Criar card
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        <span className="text-sm font-bold text-text-mid uppercase tracking-widest">
          {idxRevisao + 1} / {paraRevisao.length}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEditar(cardAtual)}>
            <Edit size={14} className="mr-2" /> Editar
          </Button>
        </div>
      </div>

      {/* Container do Flip 3D */}
      <div 
        className="w-full aspect-[4/3] lg:aspect-[3/2] relative cursor-pointer group perspective-1000 mb-8"
        onClick={onViraCard}
        style={{ perspective: 1200 }}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: mostrandoFrente ? 0 : 180 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Lado da Frente */}
          <Card 
            className="absolute inset-0 w-full h-full p-8 flex flex-col items-center justify-center text-center m-0 backface-hidden bg-surface-card border-accent-main/20 hover:border-accent-main/40 hover:shadow-glow-violet transition-all"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-3xl md:text-5xl font-display font-bold text-text-hi leading-tight">
              {cardAtual.frente}
            </p>
            <p className="absolute bottom-6 text-sm text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              Pressione <kbd className="px-2 py-1 bg-surface-base rounded mx-1">Espaço</kbd> para virar
            </p>
          </Card>

          {/* Lado de Trás */}
          <Card 
            className="absolute inset-0 w-full h-full p-8 flex flex-col items-start justify-start text-left m-0 backface-hidden bg-surface-elevated overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="w-full pb-4 border-b border-surface-border mb-6">
              <p className="text-sm font-display font-bold text-text-mid uppercase tracking-widest">Resposta</p>
            </div>
            <div className="prose prose-invert max-w-none text-lg text-text-hi leading-relaxed">
              {cardAtual.verso}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Botões de avaliação aparecem apenas após virar */}
      {!mostrandoFrente && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
            {Object.entries(QUALITY_LABELS).map(([q, info]) => (
              <button
                key={q}
                onClick={() => onRevisar(parseInt(q))}
                className="group flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer"
                style={{ 
                  backgroundColor: `color-mix(in srgb, ${info.cor} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${info.cor} 30%, transparent)`,
                  color: info.cor
                }}
              >
                <span className="font-bold text-lg group-hover:scale-110 transition-transform mb-1">
                  {info.label}
                </span>
                <span className="text-xs opacity-60">Tecla {q}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

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
