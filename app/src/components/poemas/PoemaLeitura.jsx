import { motion, AnimatePresence } from 'framer-motion';
import { Book, Mic, ChevronLeft, ChevronRight, Settings, Brain, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePoemas } from '../../hooks/useMaterias';
import PoemaRecitacao from './PoemaRecitacao';
import { useTamagotchiStore } from '../../store/useTamagotchiStore';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

export default function PoemaLeitura({ onManage, poemaSelecionado, setPoemaSelecionado }) {
  const { poemas, registrarRecitacao, proximoPoema, poemaAnterior } = usePoemas();
  const [isDojoMode, setIsDojoMode] = useState(false);

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

  if (!poemaSelecionado && poemas.length === 0 && !isDojoMode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted h-full p-8">
        <Book size={48} className="mb-4 opacity-25" />
        <p className="text-lg mb-2 text-text-hi font-serif italic">Nenhum poema cadastrado na sua biblioteca.</p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={onManage}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/10 text-text-hi transition-all"
          >
            Ir para Gerenciamento
          </button>
          <button
            onClick={() => setIsDojoMode(true)}
            className="px-6 py-3 bg-accent-main rounded-2xl text-sm font-bold hover:bg-accent-main/90 text-white shadow-xl transition-all flex items-center gap-2"
          >
            <Brain size={18} /> Entrar no Dojo (Clássicos)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Leitura */}
      <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
        <div className="flex items-center gap-4">
          {isDojoMode && (
            <button 
              onClick={() => setIsDojoMode(false)}
              className="p-2 hover:bg-white/5 rounded-full text-text-lo transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isDojoMode ? 'Dojo de Recitação' : 'Modo Leitura'}
            </h1>
            <p className="text-xs text-text-muted">
              {isDojoMode ? 'Aperfeiçoe sua memorização verso a verso' : 'Recite e memorize seus poemas'}
            </p>
          </div>
        </div>
        <button 
          onClick={onManage}
          className="px-4 py-2 bg-bg-tertiary hover:bg-accent-main/10 text-accent-main rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 border border-accent-main/30"
        >
          <Settings size={16} /> Gerenciar Poemas
        </button>
      </div>

      {/* Content Leitura / Dojo */}
      <div className="flex-1 flex flex-col items-center overflow-auto p-8">
        <AnimatePresence mode="wait">
          {isDojoMode ? (
            <motion.div
              key="dojo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <PoemaRecitacao 
                poema={poemaSelecionado} 
                onFinish={() => {
                  setIsDojoMode(false);
                  registrarRecitacao(poemaSelecionado.id);
                }} 
              />
            </motion.div>
          ) : (
            <motion.div
              key={poemaSelecionado?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center"
            >
              <div className="w-full max-w-2xl text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {poemaSelecionado?.epoca && (
                    <span className="px-2 py-1 bg-accent-main/10 text-accent-main rounded text-[10px] font-bold uppercase tracking-wider">
                      {poemaSelecionado.epoca}
                    </span>
                  )}
                  {poemaSelecionado?.forma && (
                    <span className="px-2 py-1 bg-white/5 text-text-lo/60 rounded text-[10px] font-bold uppercase tracking-wider">
                      {poemaSelecionado.forma}
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl font-bold text-text-hi mb-2 tracking-tight">
                  {poemaSelecionado?.titulo}
                </h1>
                <p className="text-base text-text-lo/60 mb-12 font-medium italic">
                  {poemaSelecionado?.autor || 'Autor desconhecido'}
                  {poemaSelecionado?.ano && ` · ${poemaSelecionado.ano}`}
                </p>

                <div className="flex justify-center gap-3 mb-12 flex-wrap">
                  {poemaSelecionado?.tema?.map(t => (
                    <span key={t} className="text-[10px] text-text-lo/30 uppercase font-black tracking-widest border border-white/5 px-3 py-1 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>

                <pre
                  className="text-2xl leading-relaxed font-serif text-text-hi whitespace-pre-wrap text-center drop-shadow-sm"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {poemaSelecionado?.corpo}
                </pre>
              </div>

              {/* Controles de Navegação (Dentro do motion.div para transição conjunta) */}
              <div className="mt-16 flex flex-col items-center gap-8 pb-12 w-full max-w-2xl">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => navegar('ant')}
                    className="p-4 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer text-text-lo"
                    title="Poema anterior"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-4">
                      <button
                        onClick={() => registrarRecitacao(poemaSelecionado.id)}
                        className="px-8 py-4 bg-success rounded-3xl text-base font-bold hover:bg-success/80 transition-all cursor-pointer shadow-lg flex items-center gap-3 text-white"
                      >
                        <Mic size={20} /> Recitei!
                      </button>
                      
                      <button
                        onClick={() => setIsDojoMode(true)}
                        className="px-8 py-4 bg-accent-main rounded-3xl text-base font-bold hover:bg-accent-main/80 transition-all cursor-pointer shadow-lg flex items-center gap-3 text-white"
                      >
                        <Brain size={20} /> Treinar no Dojo
                      </button>
                    </div>

                    {poemaSelecionado?.streak_recitacao > 0 && (
                      <p className="text-sm font-black text-xp-gold uppercase tracking-widest">
                        🔥 Streak: {poemaSelecionado.streak_recitacao} dia{poemaSelecionado.streak_recitacao > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => navegar('prox')}
                    className="p-4 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer text-text-lo"
                    title="Próximo poema"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

              {poemaSelecionado?.notas_usuario && (
                <div className="w-full max-w-2xl bg-accent-main/5 border border-accent-main/10 rounded-3xl p-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-main mb-3 flex items-center gap-2">
                    <Settings size={12} /> Minhas Anotações de Estudo
                  </h4>
                  <p className="text-sm text-text-lo/80 leading-relaxed italic">
                    &quot;{poemaSelecionado.notas_usuario}&quot;
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

PoemaLeitura.propTypes = {
  onManage: PropTypes.func,
  poemaSelecionado: PropTypes.any,
  setPoemaSelecionado: PropTypes.any,
};
