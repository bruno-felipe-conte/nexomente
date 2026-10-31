/**
 * FlashcardViewer — área de revisão espaçada SM-2 do card atual.
 * Extraído de Flashcards.jsx (Tarefa 4.1).
 * Suporta navegação por teclado: Espaço (flip), 1/3/5 (review), Setas (navegar).
 */
import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

import { parseCloze } from '../../features/flashcards/domain/ankiSrsEngine';
import { previewIntervalo } from '../../hooks/sm2';
import EmptyState from '../ui/EmptyState';

export default function FlashcardViewer({
  cardAtual,
  paraRevisao = [],
  idxRevisao,
  mostrandoFrente,
  onViraCard,
  onRevisar,
  onAnterior,
  onProximo,
  onEditar,
  onCriar,
  onForjar,
  _contadoresAnki = { novos: 0, aprendendo: 0, devidos: 0 },
}) {
  useEffect(() => {
    if (!cardAtual) return;
    const handleKey = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      )
        return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          onViraCard();
          break;
        case '1':
          if (!mostrandoFrente) onRevisar(1);
          break;
        case '2':
          if (!mostrandoFrente) onRevisar(2);
          break;
        case '3':
          if (!mostrandoFrente) onRevisar(3);
          break;
        case '4':
          if (!mostrandoFrente) onRevisar(4);
          break;
        case 'ArrowLeft':
          onAnterior();
          break;
        case 'ArrowRight':
          onProximo();
          break;
        case 'e':
          onEditar(cardAtual);
          break;
        case 'n':
          onCriar();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardAtual, mostrandoFrente, onViraCard, onRevisar, onAnterior, onProximo, onEditar, onCriar]);

  const intervals = useMemo(() => {
    if (!cardAtual) return { 1: '', 2: '', 3: '', 4: '' };
    try {
      return {
        1: previewIntervalo(cardAtual, 1),
        2: previewIntervalo(cardAtual, 2),
        3: previewIntervalo(cardAtual, 3),
        4: previewIntervalo(cardAtual, 4),
      };
    } catch {
      return { 1: '<10m', 2: '1d', 3: '4d', 4: '9d' };
    }
  }, [cardAtual]);

  const cardContent = useMemo(() => {
    if (!cardAtual) return { frente: '', verso: '' };
    return parseCloze(
      mostrandoFrente ? cardAtual.frente || '' : cardAtual.verso || '',
      mostrandoFrente
    );
  }, [cardAtual, mostrandoFrente]);

  if (!cardAtual || !paraRevisao || paraRevisao.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] w-full max-w-2xl mx-auto">
        <EmptyState
          icon={<span className="text-4xl select-none">🎉</span>}
          title="Baralho em dia! 🎉"
          description="Você revisou todos os cartões agendados para hoje."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (onForjar) onForjar();
                  else {
                    sessionStorage.setItem('nexomente_flashcards_tab', 'forja');
                    window.dispatchEvent(new CustomEvent('flashcards-tab', { detail: 'forja' }));
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }));
                  }
                }}
                className="px-5 py-2.5 bg-nx-primary hover:bg-nx-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Forjar Novos Cards
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
                }}
                className="px-5 py-2.5 bg-nx-surface border border-nx-border hover:bg-nx-depth text-nx-bright rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Ir para o Dashboard
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={cardAtual?.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-center justify-center h-full gap-4 w-full"
      >
        <div className="relative w-full max-w-2xl">
          {/* Folha do Flashcard — Estilo Editorial Papel & Café */}
          <div
            onClick={onViraCard}
            className="nx-sheet rounded-2xl p-8 min-h-[300px] flex flex-col items-center justify-between cursor-pointer select-none transition-all hover:border-[var(--nx-accent)]/40 relative shadow-sm"
          >
            <div className="w-full flex items-center justify-between text-xs text-nx-dim">
              <span className="font-mono tracking-widest uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-nx-depth border border-nx-border">
                {mostrandoFrente ? 'Frente (Pergunta)' : 'Verso (Resposta)'}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(cardAtual);
                }}
                title="Editar card (E)"
                aria-label="Editar card"
                className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-depth transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-4 py-6">
              <div
                className="font-display font-medium text-nx-bright text-center whitespace-pre-wrap break-words max-w-xl text-xl md:text-2xl leading-relaxed"
              >
                {cardContent.html || (mostrandoFrente ? cardAtual?.frente : cardAtual?.verso)}
              </div>
            </div>

            <div className="w-full flex items-center justify-center text-xs text-nx-dim gap-3 pt-4 border-t border-nx-border/60">
              <span className="flex items-center gap-1.5 text-[11px]">
                <kbd className="px-1.5 py-0.5 rounded bg-nx-depth border border-nx-border font-mono text-[10px]">Espaço</kbd>
                <span>virar</span>
              </span>
              <span className="text-nx-dim/40">•</span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <kbd className="px-1.5 py-0.5 rounded bg-nx-depth border border-nx-border font-mono text-[10px]">1-4</kbd>
                <span>avaliar</span>
              </span>
              <span className="text-nx-dim/40">•</span>
              <span className="flex items-center gap-1.5 text-[11px]">
                <kbd className="px-1.5 py-0.5 rounded bg-nx-depth border border-nx-border font-mono text-[10px]">← →</kbd>
                <span>navegar</span>
              </span>
            </div>
          </div>

          {cardAtual?.lapses && cardAtual.lapses > 0 && (
            <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 px-2.5 py-0.5 bg-[var(--nx-error)]/15 text-[var(--nx-error)] rounded-full text-xs font-medium border border-[var(--nx-error)]/30">
              <AlertCircle className="w-3 h-3" />
              <span>{cardAtual.lapses} lapsos</span>
            </div>
          )}
        </div>

        {/* Avaliação FSRS / SM-2 ou Dica de Revelar Resposta */}
        {mostrandoFrente ? (
          <button
            type="button"
            onClick={onViraCard}
            className="w-full max-w-2xl py-4 px-6 rounded-2xl border border-nx-border bg-nx-surface hover:bg-nx-depth text-nx-bright text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm group"
          >
            <kbd className="px-2 py-0.5 rounded bg-nx-depth border border-nx-border font-mono text-[11px] text-nx-dim group-hover:text-nx-bright">
              Espaço
            </kbd>
            <span>Revelar Resposta</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
            <button
              type="button"
              className="p-3 rounded-xl border border-[var(--nx-error)]/30 bg-[var(--nx-error)]/8 hover:bg-[var(--nx-error)]/15 text-[var(--nx-error)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
              onClick={() => onRevisar(1)}
              disabled={!cardAtual}
            >
              <span className="font-mono text-sm opacity-75">1</span>
              <span>Errei</span>
              <span className="text-[10px] font-mono opacity-75 font-normal">{intervals[1]}</span>
            </button>
            <button
              type="button"
              className="p-3 rounded-xl border border-[var(--nx-warning)]/30 bg-[var(--nx-warning)]/8 hover:bg-[var(--nx-warning)]/15 text-[var(--nx-warning)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
              onClick={() => onRevisar(2)}
              disabled={!cardAtual}
            >
              <span className="font-mono text-sm opacity-75">2</span>
              <span>Difícil</span>
              <span className="text-[10px] font-mono opacity-75 font-normal">{intervals[2]}</span>
            </button>
            <button
              type="button"
              className="p-3 rounded-xl border border-[var(--nx-secondary)]/35 bg-[var(--nx-secondary)]/10 hover:bg-[var(--nx-secondary)]/20 text-[var(--nx-secondary)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
              onClick={() => onRevisar(3)}
              disabled={!cardAtual}
            >
              <span className="font-mono text-sm opacity-75">3</span>
              <span>Bom</span>
              <span className="text-[10px] font-mono opacity-75 font-normal">{intervals[3]}</span>
            </button>
            <button
              type="button"
              className="p-3 rounded-xl border border-[var(--nx-accent)]/35 bg-[var(--nx-accent)]/10 hover:bg-[var(--nx-accent)]/20 text-[var(--nx-accent)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5"
              onClick={() => onRevisar(4)}
              disabled={!cardAtual}
            >
              <span className="font-mono text-sm opacity-75">4</span>
              <span>Fácil</span>
              <span className="text-[10px] font-mono opacity-75 font-normal">{intervals[4]}</span>
            </button>
          </div>
        )}

        {/* Navegação Manual */}
        <div className="flex items-center justify-between w-full max-w-2xl pt-1 text-xs text-nx-dim">
          <button
            type="button"
            onClick={onAnterior}
            disabled={idxRevisao <= 0}
            className="px-3 py-1.5 rounded-lg border border-nx-border bg-nx-surface hover:bg-nx-depth disabled:opacity-40 text-nx-dim hover:text-nx-bright flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="font-mono font-medium">
            {paraRevisao.length > 0 ? `${idxRevisao + 1} de ${paraRevisao.length}` : '0 de 0'}
          </span>

          <button
            type="button"
            onClick={onProximo}
            disabled={idxRevisao >= paraRevisao.length - 1}
            className="px-3 py-1.5 rounded-lg border border-nx-border bg-nx-surface hover:bg-nx-depth disabled:opacity-40 text-nx-dim hover:text-nx-bright flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Próximo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

FlashcardViewer.propTypes = {
  cardAtual: PropTypes.shape({
    id: PropTypes.string.isRequired,
    frente: PropTypes.string,
    verso: PropTypes.string,
    lapses: PropTypes.number,
  }),
  paraRevisao: PropTypes.arrayOf(PropTypes.object),
  idxRevisao: PropTypes.number.isRequired,
  mostrandoFrente: PropTypes.bool.isRequired,
  onViraCard: PropTypes.func.isRequired,
  onRevisar: PropTypes.func.isRequired,
  onAnterior: PropTypes.func.isRequired,
  onProximo: PropTypes.func.isRequired,
  onEditar: PropTypes.func.isRequired,
  onCriar: PropTypes.func.isRequired,
  onForjar: PropTypes.func,
  contadoresAnki: PropTypes.shape({
    novos: PropTypes.number,
    aprendendo: PropTypes.number,
    devidos: PropTypes.number,
  }),
};