/**
 * FlashcardViewer — área de revisão espaçada SM-2 do card atual.
 * Extraído de Flashcards.jsx (Tarefa 4.1).
 * Suporta navegação por teclado: Espaço (flip), 1/3/5 (review), Setas (navegar).
 */
import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

import Button from '../ui/Button';
import Card from '../ui/Card';
import { parseCloze } from '../../features/flashcards/domain/ankiSrsEngine';

export default function FlashcardViewer({
  cardAtual, paraRevisao, idxRevisao, mostrandoFrente,
  onViraCard, onRevisar, onAnterior, onProximo, onEditar, onCriar,
  contadoresAnki = { novos: 0, aprendendo: 0, devidos: 0 }
}) {
  useEffect(() => {
    if (!cardAtual) return;
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      switch (e.key) {
        case ' ': e.preventDefault(); onViraCard(); break;
        case '1': onRevisar(1); break;
        case '2': onRevisar(2); break;
        case '3': onRevisar(3); break;
        case '4': onRevisar(4); break;
        case 'ArrowLeft': onAnterior(); break;
        case 'ArrowRight': onProximo(); break;
        case 'e': onEditar(); break;
        case 'n': onCriar(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardAtual, onViraCard, onRevisar, onAnterior, onProximo, onEditar, onCriar]);

  const cardContent = useMemo(() => {
    if (!cardAtual) return { frente: '', verso: '' };
    return parseCloze(cardAtual.frente || '', mostrandoFrente);
  }, [cardAtual, mostrandoFrente]);

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={cardAtual?.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className='flex flex-col items-center justify-center h-full p-4 gap-4'
      >
        <div className='relative w-full max-w-2xl'>
          <Card className='relative overflow-hidden bg-white dark:bg-gray-800 shadow-xl border-0 rounded-2xl p-8 min-h-[300px] flex flex-col items-center justify-center'>
            <div className='absolute top-4 right-4 flex gap-2'>
              <Button variant='ghost' size='sm' onClick={onEditar} title='Editar card (E)' aria-label='Editar card'>
                <Edit className='w-5 h-5' />
              </Button>
            </div>

            <div className='flex-1 flex flex-col items-center justify-center text-center w-full px-4'>
              <div className='mb-4 text-sm text-gray-500 dark:text-gray-400'>
                {mostrandoFrente ? 'FRENTE' : 'VERSO'}
              </div>

              <div
                className='prose prose-invert dark:prose-invert max-w-none text-left whitespace-pre-wrap break-words'
                style={{ fontSize: '1.25rem', lineHeight: '1.8' }}
              >
                {cardContent.html}
              </div>
            </div>

            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-gray-500 flex gap-4'>
              <kbd className='px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600'>Espaço</kbd>
              <span>virar</span>
              <kbd className='px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600'>1-4</kbd>
              <span>responder</span>
              <kbd className='px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600'>← →</kbd>
              <span>navegar</span>
            </div>
          </Card>

          {cardAtual?.lapses && cardAtual.lapses > 0 && (
            <div className='absolute -top-3 -right-3 flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium border border-red-300 dark:border-red-700'>
              <AlertCircle className='w-3 h-3' />
              <span>{cardAtual.lapses} lapses</span>
            </div>
          )}
        </div>

        <div className='flex flex-wrap gap-3 justify-center w-full max-w-2xl'>
          <Button
            variant='outline'
            size='lg'
            className='flex-1 min-w-[120px] border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10'
            onClick={() => onRevisar(1)}
            disabled={!cardAtual}
          >
            <span className='flex items-center gap-2'>
              <span className='font-mono text-xl'>1</span>
              <span>Errei</span>
            </span>
          </Button>
          <Button
            variant='outline'
            size='lg'
            className='flex-1 min-w-[120px] border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            onClick={() => onRevisar(2)}
            disabled={!cardAtual}
          >
            <span className='flex items-center gap-2'>
              <span className='font-mono text-xl'>2</span>
              <span>Difícil</span>
            </span>
          </Button>
          <Button
            variant='outline'
            size='lg'
            className='flex-1 min-w-[120px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            onClick={() => onRevisar(3)}
            disabled={!cardAtual}
          >
            <span className='flex items-center gap-2'>
              <span className='font-mono text-xl'>3</span>
              <span>Bom</span>
            </span>
          </Button>
          <Button
            variant='outline'
            size='lg'
            className='flex-1 min-w-[120px] border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
            onClick={() => onRevisar(4)}
            disabled={!cardAtual}
          >
            <span className='flex items-center gap-2'>
              <span className='font-mono text-xl'>4</span>
              <span>Fácil</span>
            </span>
          </Button>
        </div>

        <div className='flex gap-3 justify-center w-full max-w-2xl mt-4'>
          <Button variant='ghost' onClick={onAnterior} disabled={idxRevisao <= 0}>
            <ChevronLeft className='w-5 h-5 mr-1' /> Anterior
          </Button>
          <div className='flex items-center text-sm text-gray-500 dark:text-gray-400 px-4'>
            {idxRevisao + 1} / {paraRevisao.length}
          </div>
          <Button variant='ghost' onClick={onProximo} disabled={idxRevisao >= paraRevisao.length - 1}>
            Próximo <ChevronRight className='w-5 h-5 ml-1' />
          </Button>
        </div>

        <div className='flex gap-2 justify-center w-full max-w-2xl mt-2 text-xs text-gray-500 dark:text-gray-400'>
          {contadoresAnki.novos > 0 && <span className='px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded'>Novos: {contadoresAnki.novos}</span>}
          {contadoresAnki.aprendendo > 0 && <span className='px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded'>Aprendendo: {contadoresAnki.aprendendo}</span>}
          {contadoresAnki.devidos > 0 && <span className='px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded'>Devidos: {contadoresAnki.devidos}</span>}
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
  paraRevisao: PropTypes.arrayOf(PropTypes.object).isRequired,
  idxRevisao: PropTypes.number.isRequired,
  mostrandoFrente: PropTypes.bool.isRequired,
  onViraCard: PropTypes.func.isRequired,
  onRevisar: PropTypes.func.isRequired,
  onAnterior: PropTypes.func.isRequired,
  onProximo: PropTypes.func.isRequired,
  onEditar: PropTypes.func.isRequired,
  onCriar: PropTypes.func.isRequired,
  contadoresAnki: PropTypes.shape({
    novos: PropTypes.number,
    aprendendo: PropTypes.number,
    devidos: PropTypes.number,
  }),
};