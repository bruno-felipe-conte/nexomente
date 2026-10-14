import { motion, AnimatePresence } from 'framer-motion';
import { Book, Mic, ChevronLeft, ChevronRight, Settings, Brain, ArrowLeft, Star, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { usePoemas } from '../../hooks/useMaterias';
import PoemaRecitacao from './PoemaRecitacao';
import PropTypes from 'prop-types';

const TEMAS_LEITURA = {
  escuro: { id: 'escuro', label: 'Noite', bg: 'bg-bg-primary/5', text: 'text-text-hi', card: 'border-white/5', sub: 'text-text-lo/60' },
  sepia: { id: 'sepia', label: 'Sépia', bg: 'bg-[#27211b]', text: 'text-[#f5ebd7]', card: 'border-[#43352a]', sub: 'text-[#c7b79d]' },
  pergaminho: { id: 'pergaminho', label: 'Papel', bg: 'bg-[#faf4e6]', text: 'text-[#2e2619]', card: 'border-[#dfd3be]', sub: 'text-[#7a6b52]' }
};

const FONT_SIZES = {
  sm: 'text-xl leading-relaxed',
  md: 'text-2xl leading-relaxed',
  lg: 'text-3xl leading-loose',
  xl: 'text-4xl leading-loose'
};

export default function PoemaLeitura({ onManage, poemaSelecionado, setPoemaSelecionado }) {
  const { poemas, registrarRecitacao, proximoPoema, poemaAnterior } = usePoemas();
  const [isDojoMode, setIsDojoMode] = useState(false);
  const [tema, setTema] = useState('escuro');
  const [tamanhoFonte, setTamanhoFonte] = useState('md');
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexomente_poemas_favs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (poemas.length > 0 && !poemaSelecionado) {
      setPoemaSelecionado(poemas[0]);
    }
  }, [poemas, poemaSelecionado, setPoemaSelecionado]);

  const navegar = useCallback((direcao) => {
    if (!poemaSelecionado) return;
    const p = direcao === 'prox' ? proximoPoema(poemaSelecionado.id) : poemaAnterior(poemaSelecionado.id);
    setPoemaSelecionado(p);
  }, [poemaSelecionado, proximoPoema, poemaAnterior, setPoemaSelecionado]);

  const toggleFavorito = useCallback((id) => {
    setFavoritos(prev => {
      const novo = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      try {
        localStorage.setItem('nexomente_poemas_favs', JSON.stringify(novo));
      } catch {
        // Silencioso se localstorage falhar
      }
      return novo;
    });
  }, []);

  // Atalhos de teclado no modo leitura: Setas esquerda e direita
  useEffect(() => {
    if (isDojoMode) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navegar('ant');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navegar('prox');
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDojoMode(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDojoMode, navegar]);

  if (!poemaSelecionado && poemas.length === 0 && !isDojoMode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted h-full p-8">
        <Book size={48} className="mb-4 opacity-25" />
        <p className="text-lg mb-2 text-text-hi font-serif italic">Nenhum poema cadastrado na sua biblioteca.</p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={onManage}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/10 text-text-hi transition-all cursor-pointer"
          >
            Ir para Gerenciamento
          </button>
          <button
            onClick={() => setIsDojoMode(true)}
            className="px-6 py-3 bg-accent-main rounded-2xl text-sm font-bold hover:bg-accent-main/90 text-white shadow-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Brain size={18} /> Entrar no Dojo (Clássicos)
          </button>
        </div>
      </div>
    );
  }

  const isFav = poemaSelecionado ? favoritos.includes(poemaSelecionado.id) : false;
  const estiloTema = TEMAS_LEITURA[tema] || TEMAS_LEITURA.escuro;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-300 ${estiloTema.bg}`}>
      {/* Header Leitura */}
      <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
        <div className="flex items-center gap-4">
          {isDojoMode && (
            <button 
              onClick={() => setIsDojoMode(false)}
              className="p-2 hover:bg-white/5 rounded-full text-text-lo transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isDojoMode ? 'Dojo de Recitação' : 'Modo Leitura'}
            </h1>
            <p className="text-xs text-text-muted">
              {isDojoMode ? 'Aperfeiçoe sua memorização verso a verso' : 'Recite e memorize seus poemas (use ← e → para navegar)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isDojoMode && (
            <>
              {/* Controles de Zoom */}
              <div className="flex items-center bg-bg-tertiary rounded-lg p-0.5 border border-white/5">
                <button
                  onClick={() => setTamanhoFonte(prev => prev === 'xl' ? 'lg' : prev === 'lg' ? 'md' : 'sm')}
                  title="Diminuir fonte"
                  className="p-1.5 text-text-lo hover:text-text-hi transition-colors cursor-pointer"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setTamanhoFonte(prev => prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'xl')}
                  title="Aumentar fonte"
                  className="p-1.5 text-text-lo hover:text-text-hi transition-colors cursor-pointer"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Seletor de Tema */}
              <div className="flex items-center bg-bg-tertiary rounded-lg p-0.5 border border-white/5 text-[11px] font-bold">
                {Object.values(TEMAS_LEITURA).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTema(t.id)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${tema === t.id ? 'bg-accent-main text-white' : 'text-text-lo hover:text-text-hi'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Botão de Favorito */}
              {poemaSelecionado && (
                <button
                  onClick={() => toggleFavorito(poemaSelecionado.id)}
                  title={isFav ? 'Remover dos favoritos' : 'Favoritar poema'}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${isFav ? 'bg-warning/20 border-warning text-warning' : 'bg-bg-tertiary border-white/5 text-text-lo hover:text-text-hi'}`}
                >
                  <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              )}
            </>
          )}

          <button 
            onClick={onManage}
            className="px-4 py-2 bg-bg-tertiary hover:bg-accent-main/10 text-accent-main rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 border border-accent-main/30"
          >
            <Settings size={16} /> Gerenciar Poemas
          </button>
        </div>
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
                
                <h1 className={`text-4xl font-bold mb-2 tracking-tight ${estiloTema.text}`}>
                  {poemaSelecionado?.titulo}
                </h1>
                <p className={`text-base mb-12 font-medium italic ${estiloTema.sub}`}>
                  {poemaSelecionado?.autor || 'Autor desconhecido'}
                  {poemaSelecionado?.ano && ` · ${poemaSelecionado.ano}`}
                </p>

                <div className="flex justify-center gap-3 mb-12 flex-wrap">
                  {poemaSelecionado?.tema?.map(t => (
                    <span key={t} className={`text-[10px] uppercase font-black tracking-widest border px-3 py-1 rounded-full ${estiloTema.card} ${estiloTema.sub}`}>
                      #{t}
                    </span>
                  ))}
                </div>

                <pre
                  className={`font-serif whitespace-pre-wrap text-center drop-shadow-sm transition-all duration-200 ${estiloTema.text} ${FONT_SIZES[tamanhoFonte] || FONT_SIZES.md}`}
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
                    "{poemaSelecionado.notas_usuario}"
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
