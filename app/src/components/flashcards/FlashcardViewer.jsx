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
      else if (mostrandoFrente) return; 
      else if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); onRevisar(parseInt(e.key)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onAnterior(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onProximo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardAtual, onViraCard, onRevisar, onAnterior, onProximo, mostrandoFrente]);

  if (!cardAtual) {
    return (
      <div className="bg-bg-secondary/50 backdrop-blur-xl rounded-3xl p-16 border border-white/5 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-accent-main/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-accent-main">
           <Brain size={40} />
        </div>
        <h2 className="text-2xl font-display font-bold text-text-hi mb-2">Meta Batida!</h2>
        <p className="text-text-mid text-sm mb-8">Nenhum card pendente para revisão no momento. Que tal criar novos cards ou revisar seus dominados?</p>
        <Button onClick={onCriar} variant="primary" size="lg" className="rounded-2xl px-10">
          Criar Novo Card
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full flex justify-between items-center mb-8 px-2">
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-text-lo uppercase tracking-[0.2em] mb-1">Sessão Ativa</span>
           <span className="text-xs font-bold text-text-hi">
             Progresso: {idxRevisao + 1} de {paraRevisao.length}
           </span>
        </div>
        <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
             className="h-full bg-accent-main"
             initial={{ width: 0 }}
             animate={{ width: `${((idxRevisao + 1) / paraRevisao.length) * 100}%` }}
           />
        </div>
      </div>

      {/* Container do Flip 3D */}
      <div 
        className="w-full aspect-[16/10] relative cursor-pointer group perspective-2000 mb-10"
        onClick={onViraCard}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: mostrandoFrente ? 0 : 180 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 100, damping: 15 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Lado da Frente */}
          <Card 
            className="absolute inset-0 w-full h-full p-10 flex flex-col items-center justify-center text-center m-0 backface-hidden glass-panel border-white/5 shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute top-6 left-6 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse" />
               <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Pergunta</span>
            </div>
            <p className="text-3xl md:text-5xl font-display font-bold text-text-hi leading-tight tracking-tight px-4">
              {cardAtual.frente}
            </p>
            <div className="absolute bottom-10 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold uppercase tracking-widest text-text-lo">Toque para revelar</span>
               <div className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-text-hi">SPACE</div>
            </div>
          </Card>

          {/* Lado de Trás */}
          <Card 
            className="absolute inset-0 w-full h-full p-10 flex flex-col items-start justify-start text-left m-0 backface-hidden bg-[#121422] border-white/10 shadow-2xl overflow-y-auto custom-scrollbar"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="w-full flex items-center justify-between pb-4 border-b border-white/5 mb-8">
              <span className="text-[10px] font-black text-accent-main uppercase tracking-[0.2em]">Resposta Correta</span>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                 <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                 <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-xl md:text-2xl font-medium text-text-hi leading-relaxed px-2">
              {cardAtual.verso}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Botões de avaliação */}
      <AnimatePresence>
        {!mostrandoFrente && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full space-y-4"
          >
            <p className="text-center text-[10px] font-black text-text-lo uppercase tracking-[0.3em]">Como foi seu desempenho?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {Object.entries(QUALITY_LABELS).map(([q, info]) => (
                <button
                  key={q}
                  onClick={(e) => { e.stopPropagation(); onRevisar(parseInt(q)); }}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: info.cor }} />
                  <span className="font-black text-lg mb-1 transition-colors" style={{ color: info.cor }}>
                    {info.label}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 opacity-40 group-hover:opacity-100 transition-all">
                     <span className="text-[9px] font-bold uppercase tracking-tighter">Tecla</span>
                     <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-text-hi">{q}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Rodapé de Meta */}
      {mostrandoFrente && (
         <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
               <RotateCcw size={12} className="text-warning" />
               <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Repetições: {cardAtual.repetitions}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
               <Check size={12} className="text-success" />
               <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest">Facilidade: {cardAtual.ef?.toFixed(1)}</span>
            </div>
         </div>
      )}
    </div>
  );
}

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
