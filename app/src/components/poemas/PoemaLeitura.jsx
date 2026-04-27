import { motion, AnimatePresence } from 'framer-motion';
import { Book, Mic, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { usePoemas } from '../../hooks/useMaterias';
import PropTypes from 'prop-types';

export default function PoemaLeitura({ onManage, poemaSelecionado, setPoemaSelecionado }) {
  const { poemas, registrarRecitacao, proximoPoema, poemaAnterior } = usePoemas();

  useEffect(() => {
    if (poemas.length > 0 && !poemaSelecionado) {
      setPoemaSelecionado(poemas[0]);
    }
  }, [poemas, poemaSelecionado, setPoemaSelecionado]);

  const navegar = (direcao) => {
    if (!poemaSelecionado) return;
    const p = direcao === 'prox' ? proximoPoema(poemaSelecionado.id) : poemaAnterior(poemaSelecionado.id);
    setPoemaSelecionado(p);
  };

  if (!poemaSelecionado && poemas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted h-full p-8">
        <Book size={48} className="mb-4 opacity-25" />
        <p className="text-lg mb-2">Nenhum poema cadastrado</p>
        <button
          onClick={onManage}
          className="mt-4 px-4 py-2 bg-accent-main rounded-lg text-sm font-medium hover:bg-accent-main/90 text-white cursor-pointer"
        >
          Ir para Gerenciamento
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Leitura */}
      <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Modo Leitura</h1>
          <p className="text-xs text-text-muted">Recite e memorize seus poemas</p>
        </div>
        <button 
          onClick={onManage}
          className="px-4 py-2 bg-bg-tertiary hover:bg-accent-main/10 text-accent-main rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 border border-accent-main/30"
        >
          <Settings size={16} /> Gerenciar Poemas
        </button>
      </div>

      {/* Content Leitura */}
      <div className="flex-1 flex flex-col items-center overflow-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={poemaSelecionado?.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-2xl text-center"
          >
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {poemaSelecionado?.titulo}
            </h1>
            <p className="text-sm text-text-muted mb-8">
              {poemaSelecionado?.autor}
              {poemaSelecionado?.ano && ` · ${poemaSelecionado.ano}`}
            </p>
            <pre
              className="text-xl leading-loose font-serif text-text-primary whitespace-pre-wrap"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {poemaSelecionado?.corpo}
            </pre>
          </motion.div>
        </AnimatePresence>

        {/* Controles de Navegação */}
        <div className="mt-12 flex items-center gap-6 pb-8">
          <button
            onClick={() => navegar('ant')}
            className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
            title="Poema anterior"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <button
              onClick={() => registrarRecitacao(poemaSelecionado.id)}
              className="px-8 py-4 bg-success rounded-full text-base font-medium hover:bg-success/80 transition-colors cursor-pointer shadow-lg flex items-center gap-2"
              title="Marcar como recitado hoje"
            >
              <Mic size={20} /> Recitei!
            </button>
            {poemaSelecionado?.streak_recitacao > 0 && (
              <p className="mt-3 text-sm font-medium text-xp-gold">
                🔥 Streak: {poemaSelecionado.streak_recitacao} dia{poemaSelecionado.streak_recitacao > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <button
            onClick={() => navegar('prox')}
            className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
            title="Próximo poema"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

PoemaLeitura.propTypes = {
  onManage: PropTypes.func,
  poemaSelecionado: PropTypes.any,
  setPoemaSelecionado: PropTypes.any,
};
