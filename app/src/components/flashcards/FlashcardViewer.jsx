/**
 * FlashcardViewer — área de revisão espaçada SM-2 do card atual.
 * Extraído de Flashcards.jsx (Tarefa 4.1).
 * Suporta navegação por teclado: Espaço (flip), 1/3/5 (review), Setas (navegar).
 */
import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, ChevronLeft, ChevronRight, Edit, Flame, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

import Button from '../ui/Button';
import Card from '../ui/Card';
import { previewIntervalo, parseCloze } from '../../hooks/sm2';

// 4 Botões Oficiais do Anki (Cores e Teclas de 1 a 4)
const ANKI_BUTTONS = {
  1: { label: 'Errei (Again)', cor: '#ef4444', border: 'border-red-500/30', bg: 'hover:bg-red-500/10' },
  2: { label: 'Difícil (Hard)', cor: '#f59e0b', border: 'border-amber-500/30', bg: 'hover:bg-amber-500/10' },
  3: { label: 'Bom (Good)',    cor: '#10b981', border: 'border-emerald-500/30', bg: 'hover:bg-emerald-500/10' },
  4: { label: 'Fácil (Easy)',  cor: '#3b82f6', border: 'border-blue-500/30', bg: 'hover:bg-blue-500/10' },
};

export default function FlashcardViewer({
  cardAtual, paraRevisao, idxRevisao, mostrandoFrente,
  onViraCard, onRevisar, onAnterior, onProximo, onEditar, onCriar,
  contadoresAnki = { novos: 0, aprendendo: 0, devidos: 0 }
}) {
  useEffect(() => {
    if (!cardAtual) return;
    const handleKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onViraCard(); }
      else if (mostrandoFrente) return;
      else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        onRevisar(parseInt(e.key));
      }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onAnterior(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onProximo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cardAtual, onViraCard, onRevisar, onAnterior, onProximo, mostrandoFrente]);

  // Suporte automático a Cloze Deletion (Omissão de Palavras)
  const frenteHtml = useMemo(() => {
    if (!cardAtual?.frente) return '';
    return parseCloze(cardAtual.frente, true);
  }, [cardAtual]);

  const versoHtml = useMemo(() => {
    if (!cardAtual) return '';
    // Se o card for Cloze (contém {{c1::...}} na frente), renderiza o cloze revelado no verso
    if (cardAtual.frente && /\{\{c\d+::/.test(cardAtual.frente)) {
      const clozeRevelado = parseCloze(cardAtual.frente, false);
      return cardAtual.verso ? `${clozeRevelado}<hr class="my-4 border-white/10" /><div class="text-sm text-text-lo/80 font-normal">${cardAtual.verso}</div>` : clozeRevelado;
    }
    return cardAtual.verso || '';
  }, [cardAtual]);

  const ehLeech = Boolean((cardAtual?.lapses || 0) >= 4);

  if (!cardAtual) {
    return (
      <div className="bg-bg-secondary/50 backdrop-blur-xl rounded-3xl p-16 border border-white/5 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-accent-main/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-accent-main">
           <Brain size={40} />
        </div>
        <h2 className="text-2xl font-display font-bold text-text-hi mb-2">Parabéns! Decks em dia.</h2>
        <p className="text-text-mid text-sm mb-8">Você concluiu todos os cards devidos para hoje neste baralho.</p>
        <Button onClick={onCriar} variant="primary" size="lg" className="rounded-2xl px-10">
          Criar Novo Card
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Barra de Status estilo Anki (Novos em azul, Aprendendo em vermelho/laranja, Revisão em verde) */}
      <div className="w-full flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold" title="Novos">
            <span>●</span> {contadoresAnki.novos || 0}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold" title="Aprendendo">
            <span>▲</span> {contadoresAnki.aprendendo || 0}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold" title="Para Revisar">
            <span>✓</span> {contadoresAnki.devidos || 0}
          </div>
          {ehLeech && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
              <AlertCircle size={12} /> Sanguessuga ({cardAtual.lapses} erros)
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-lo">
            {idxRevisao + 1} de {paraRevisao.length}
          </span>
          <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent-main"
              initial={{ width: 0 }}
              animate={{ width: `${((idxRevisao + 1) / Math.max(1, paraRevisao.length)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Container do Flip 3D */}
      <div
        className="w-full aspect-[16/10] relative cursor-pointer group perspective-2000 mb-8"
        onClick={onViraCard}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: mostrandoFrente ? 0 : 180 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 15 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Lado da Frente */}
          <Card
            className="absolute inset-0 w-full h-full p-10 flex flex-col items-center justify-center text-center m-0 backface-hidden glass-panel border-white/5 shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute top-6 left-6 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse" />
               <span className="text-[10px] font-bold text-text-lo uppercase tracking-widest">
                 {cardAtual.materia || 'Pergunta'}
               </span>
            </div>
            <div
              className="text-2xl md:text-4xl font-display font-bold text-text-hi leading-relaxed tracking-tight px-4 select-text"
              dangerouslySetInnerHTML={{ __html: frenteHtml }}
            />
            <div className="absolute bottom-8 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] font-bold uppercase tracking-widest text-text-lo">Mostrar Resposta</span>
               <div className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-text-hi">SPACE / ENTER</div>
            </div>
          </Card>

          {/* Lado de Trás */}
          <Card
            className="absolute inset-0 w-full h-full p-10 flex flex-col items-start justify-start text-left m-0 backface-hidden bg-[#121422] border-white/10 shadow-2xl overflow-y-auto custom-scrollbar"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="w-full flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <span className="text-[10px] font-black text-accent-main uppercase tracking-[0.2em]">Resposta (Anki SRS)</span>
              <span className="text-[10px] font-mono text-text-lo/60">
                Fase: <strong className="text-text-hi uppercase">{cardAtual.state || 'learning'}</strong> | Ease: {((cardAtual.ease_factor || 2.5) * 100).toFixed(0)}%
              </span>
            </div>
            <div
              className="prose prose-invert max-w-none text-xl md:text-2xl font-medium text-text-hi leading-relaxed px-2 select-text w-full"
              dangerouslySetInnerHTML={{ __html: versoHtml }}
            />
          </Card>
        </motion.div>
      </div>

      {/* 4 Botões Oficiais do Anki */}
      <AnimatePresence>
        {!mostrandoFrente && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15 }}
            className="w-full space-y-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              {Object.entries(ANKI_BUTTONS).map(([btnKey, info]) => {
                const rating = parseInt(btnKey);
                const intervaloEstimado = previewIntervalo(cardAtual, rating);

                return (
                  <button
                    key={btnKey}
                    onClick={(e) => { e.stopPropagation(); onRevisar(rating); }}
                    className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer ${info.border} ${info.bg} bg-white/[0.02]`}
                  >
                    <span className="text-[11px] font-mono font-bold mb-0.5" style={{ color: info.cor }}>
                      {intervaloEstimado}
                    </span>
                    <span className="font-bold text-sm mb-1 text-text-hi">
                      {info.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-bold text-text-lo">Tecla</span>
                       <span className="px-1.5 py-0.2 bg-white/10 rounded text-[9px] font-mono text-text-hi">{btnKey}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rodapé de Meta */}
      {mostrandoFrente && (
         <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-text-lo">
               <RotateCcw size={12} className="text-warning" />
               <span>Repetições: {cardAtual.repeticoes || 0}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold text-text-lo">
               <Check size={12} className="text-success" />
               <span>Facilidade: {((cardAtual.ease_factor || 2.5) * 100).toFixed(0)}%</span>
            </div>
            {cardAtual.lapses > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 text-[10px] font-bold text-red-400">
                 <Flame size={12} />
                 <span>Erros: {cardAtual.lapses}</span>
              </div>
            )}
         </div>
      )}

      {/* Navegação e Atalhos Rápidos */}
      <div className="w-full mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
         <button
           onClick={onAnterior}
           disabled={idxRevisao === 0}
           className="p-3 text-text-lo hover:text-text-hi disabled:opacity-20 transition-all cursor-pointer"
           title="Card anterior (Seta Esquerda)"
         >
           <ChevronLeft size={22} />
         </button>

         <button
           onClick={() => onEditar(cardAtual)}
           className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-lo hover:text-text-hi hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer"
         >
           <Edit size={12} /> Editar Card
         </button>

         <button
           onClick={onProximo}
           disabled={idxRevisao >= paraRevisao.length - 1}
           className="p-3 text-text-lo hover:text-text-hi disabled:opacity-20 transition-all cursor-pointer"
           title="Próximo card (Seta Direita)"
         >
           <ChevronRight size={22} />
         </button>
      </div>
    </div>
  );
}

FlashcardViewer.propTypes = {
  cardAtual: PropTypes.object,
  paraRevisao: PropTypes.array,
  idxRevisao: PropTypes.number,
  mostrandoFrente: PropTypes.bool,
  onViraCard: PropTypes.func,
  onRevisar: PropTypes.func,
  onAnterior: PropTypes.func,
  onProximo: PropTypes.func,
  onEditar: PropTypes.func,
  onCriar: PropTypes.func,
  contadoresAnki: PropTypes.object,
};
