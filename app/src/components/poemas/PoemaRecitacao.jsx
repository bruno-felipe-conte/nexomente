import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, RotateCcw, X, Trophy, ChevronRight, RefreshCw } from 'lucide-react';
import { useVosk } from '../../hooks/useVosk';
import { useTamagotchiStore } from '../../store/useTamagotchiStore';
import { useDBStore } from '../../store/useDBStore';
import { toast } from 'react-hot-toast';
import './PoemaRecitacao.css';

import {
  calcularSimilaridadeFonetica,
  extrairGramaticaContextual,
} from '../../lib/audio/audioDecoder';

const PoemaRecitacao = ({ poema, onFinish, onClose, onCancel }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [palavrasStatus, setPalavrasStatus] = useState({}); // { index: 'correta' | 'errada' }
  const [indicePalavraLocal, setIndicePalavraLocal] = useState(0);

  const lines = useMemo(() => {
    if (!poema?.corpo) return [];
    const versosReais = poema.corpo
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    return versosReais.length > 0 ? versosReais : [poema.corpo];
  }, [poema?.corpo]);

  const currentLine = lines[currentLineIndex] || "";
  const palavrasPoema = useMemo(() => 
    currentLine.split(/\s+/).filter(w => w.length > 0)
  , [currentLine]);

  const gramaticaVerso = useMemo(() => {
    return extrairGramaticaContextual(currentLine);
  }, [currentLine]);

  // Processamento fonético fiel: partialresult marca verde em tempo real; result consolida e avança o ponteiro
  const processarTranscricao = useCallback((texto, isFinal = false) => {
    if (!texto || isFinished) return;
    setPartialTranscript(texto);

    const ouvidas = texto.trim().split(/\s+/).filter(Boolean);
    if (ouvidas.length === 0) return;

    setPalavrasStatus(prev => {
      const novo = { ...prev };
      let maiorIndice = indicePalavraLocal;

      for (let i = 0; i < ouvidas.length; i++) {
        const idxNoPoema = indicePalavraLocal + i;
        if (idxNoPoema >= palavrasPoema.length) break;

        const target = palavrasPoema[idxNoPoema];
        const sim = calcularSimilaridadeFonetica(ouvidas[i], target);

        if (sim >= 0.72) {
          novo[idxNoPoema] = 'correta';
          maiorIndice = Math.max(maiorIndice, idxNoPoema + 1);
        } else if (idxNoPoema + 1 < palavrasPoema.length && calcularSimilaridadeFonetica(ouvidas[i], palavrasPoema[idxNoPoema + 1]) >= 0.78) {
          // Tolerância caso um artigo curto tenha sido aglutinado na fala
          if (isFinal && novo[idxNoPoema] !== 'correta') novo[idxNoPoema] = 'errada';
          novo[idxNoPoema + 1] = 'correta';
          maiorIndice = Math.max(maiorIndice, idxNoPoema + 2);
        } else if (isFinal && novo[idxNoPoema] !== 'correta') {
          novo[idxNoPoema] = 'errada';
          maiorIndice = Math.max(maiorIndice, idxNoPoema + 1);
        }
      }
      return novo;
    });

    if (isFinal) {
      setIndicePalavraLocal(prev => Math.min(palavrasPoema.length, prev + 1));
      setPartialTranscript('');
    }
  }, [palavrasPoema, indicePalavraLocal, isFinished]);

  const {
    isListening,
    isReady,
    status,
    startListening,
    stopListening,
    nextVerse,
    terminateAudio,
    loadVoskModel,
  } = useVosk({
    onResult: (text) => processarTranscricao(text, true),
    onPartialResult: (text) => processarTranscricao(text, false),
    onError: (msg) => toast.error(msg),
    grammar: gramaticaVerso,
    autoLoad: true,
  });

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      try {
        await startListening();
      } catch (err) {
        console.error('[DOJO] Erro ao iniciar microfone:', err);
        toast.error('Erro ao acessar microfone ou carregar modelo de voz.');
      }
    }
  };

  const isTransitioningRef = useRef(false);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    terminateAudio();
    (onClose || onCancel || onFinish)?.();
  };

  const handleNextLine = () => {
    setPartialTranscript('');
    setPalavrasStatus({});
    setIndicePalavraLocal(0);
    setCurrentLineIndex(prev => prev + 1);
    nextVerse();
  };

  const reiniciarVersoAtual = () => {
    setPartialTranscript('');
    setPalavrasStatus({});
    setIndicePalavraLocal(0);
    nextVerse();
    toast('Verso reiniciado para nova tomada', { icon: '🔄' });
  };

  const finishDojo = () => {
    setIsFinished(true);
    stopListening();
    terminateAudio();
    try {
      useTamagotchiStore.getState().addBonusXp?.(25, 'Recitação de Oratória');
      useDBStore.getState().XP?.add?.(25, 'Recitação de Oratória', 'poema', poema?.id);
    } catch {
      // Silencioso se store indisponivel
    }
    toast.success('Recitação concluída! +25 XP');
  };

  const acuraciaCalculada = useMemo(() => {
    // Estimativa de acurácia da recitação concluída
    const corretas = Object.values(palavrasStatus).filter(s => s === 'correta').length;
    const base = Math.max(1, palavrasPoema.length);
    const scoreLinha = Math.round((corretas / base) * 100);
    return Math.min(100, Math.max(70, scoreLinha));
  }, [palavrasStatus, palavrasPoema.length]);

  // Verifica se a linha terminou com base em acerto real do verso
  useEffect(() => {
    if (palavrasPoema.length === 0 || isFinished) return;

    const totalAcertos = Object.values(palavrasStatus).filter(s => s === 'correta').length;
    const todasCertas = palavrasPoema.every((_, i) => palavrasStatus[i] === 'correta');
    const taxaAcerto = totalAcertos / palavrasPoema.length;

    // Avança de linha apenas se o verso foi dominado (todas certas ou pelo menos 75% acertadas)
    const versoDominado = todasCertas || (taxaAcerto >= 0.75 && totalAcertos >= 2);

    if (versoDominado && !isTransitioningRef.current) {
      isTransitioningRef.current = true;

      const timer = setTimeout(() => {
        if (currentLineIndex < lines.length - 1) {
          handleNextLine();
          isTransitioningRef.current = false;
        } else {
          finishDojo();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [palavrasStatus, palavrasPoema, currentLineIndex, lines.length, isFinished]);

  const resetDojo = () => {
    setCurrentLineIndex(0);
    setPartialTranscript('');
    setPalavrasStatus({});
    setIndicePalavraLocal(0);
    setIsFinished(false);
    terminateAudio();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 select-none"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl bg-nx-surface border border-nx-border rounded-3xl overflow-hidden shadow-2xl cursor-default"
      >
        {/* Header Editorial */}
        <div className="p-6 flex justify-between items-center border-b border-nx-border bg-nx-depth/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--nx-primary)]" />
              <h2 className="text-[var(--nx-primary)] font-mono text-xs tracking-widest uppercase font-bold">
                Estúdio de Oratória & Poesia
              </h2>
            </div>
            <h3 className="text-2xl font-bold font-display text-nx-bright mt-1">
              {poema?.titulo || 'Recitação'}
            </h3>
            {poema?.autor && (
              <p className="text-xs text-nx-dim font-display italic mt-0.5">
                por {poema.autor}
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-2.5 hover:bg-nx-overlay rounded-full transition-colors text-nx-dim hover:text-nx-bright cursor-pointer border border-transparent hover:border-nx-border"
            title="Fechar Estúdio"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 sm:p-12 flex flex-col items-center min-height-[480px]">
          {isFinished ? (
            <motion.div initial={{ y: 15 }} animate={{ y: 0 }} className="text-center space-y-6 max-w-lg">
              <div className="w-20 h-20 bg-[var(--nx-accent-bg)] rounded-full flex items-center justify-center mx-auto border border-[var(--nx-accent)]/30 shadow-sm">
                <Trophy size={40} className="text-[var(--nx-accent)]" />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-display text-nx-bright">Excelente Recitação!</h2>
                <p className="text-sm text-nx-dim font-display mt-1">
                  Você concluiu os versos de "{poema?.titulo}".
                </p>
              </div>
              
              <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-2xl bg-nx-depth border border-nx-border shadow-sm">
                <span className="text-xs uppercase tracking-wider text-nx-dim font-bold">Acurácia:</span>
                <span className="text-lg font-mono font-bold text-[var(--nx-secondary)]">{acuraciaCalculada}%</span>
                <span className="text-nx-muted">•</span>
                <span className="text-xs uppercase tracking-wider text-nx-dim font-bold">Recompensa:</span>
                <span className="text-sm font-bold text-[var(--nx-accent)]">+25 XP</span>
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <button 
                  type="button" 
                  onClick={resetDojo} 
                  className="px-5 py-2.5 bg-nx-depth hover:bg-nx-overlay text-nx-bright rounded-xl font-semibold transition-all border border-nx-border cursor-pointer text-sm shadow-sm"
                >
                  Recitar Novamente
                </button>
                <button 
                  type="button" 
                  onClick={onFinish} 
                  className="px-6 py-2.5 bg-[var(--nx-primary)] hover:bg-[var(--nx-primary-hover)] text-white rounded-xl font-semibold transition-all shadow-md shadow-[var(--nx-primary)]/20 cursor-pointer text-sm"
                >
                  Coletar Recompensa & Salvar
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="w-full max-w-md bg-nx-depth border border-nx-border/50 h-2 rounded-full mb-10 overflow-hidden shadow-inner">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[var(--nx-primary)] to-[var(--nx-secondary)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentLineIndex + 1) / lines.length) * 100}%` }}
                />
              </div>

              {/* Texto do Poema Editorial */}
              <div className="poema-texto-display mb-10 min-h-[130px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentLineIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="font-display font-medium text-3xl md:text-4xl text-nx-bright leading-relaxed text-center px-4"
                  >
                    {palavrasPoema.map((palavra, idx) => (
                      <span key={idx} className={`palavra palavra--${palavrasStatus[idx] || 'neutra'}`}>
                        {palavra}{' '}
                      </span>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Live Transcript Feedback */}
              <div className="status-feedback mb-6 flex items-center justify-center">
                {partialTranscript ? (
                  <span className="text-sm font-mono text-[var(--nx-primary)] italic bg-[var(--nx-primary-bg)] px-3.5 py-1 rounded-full border border-[var(--nx-primary)]/20 animate-pulse">
                    “{partialTranscript}...”
                  </span>
                ) : (
                  <span className="text-xs text-nx-dim/70 font-mono">
                    {isListening ? 'Fale pausadamente recitando as palavras acima' : ''}
                  </span>
                )}
              </div>

              {/* Controles da Arena */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                  {/* Reiniciar Verso Atual */}
                  <button 
                    type="button"
                    onClick={reiniciarVersoAtual}
                    className="px-4 py-3 bg-nx-depth hover:bg-nx-overlay rounded-2xl text-nx-dim hover:text-nx-bright transition-all flex items-center gap-2 text-xs font-semibold border border-nx-border cursor-pointer shadow-sm"
                    title="Tentar Este Verso Novamente"
                  >
                    <RotateCcw size={16} />
                    <span>Verso</span>
                  </button>

                  {/* Botão Central de Microfone */}
                  <button 
                    type="button"
                    onClick={toggleListening}
                    disabled={status === 'loading' && !isReady}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md ${
                      status === 'loading' && !isReady
                        ? 'bg-nx-depth border-2 border-dashed border-nx-border text-nx-dim cursor-wait opacity-80'
                        : isListening 
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 ring-4 ring-red-400/30 scale-105' 
                          : 'bg-[var(--nx-primary)] hover:bg-[var(--nx-primary-hover)] text-white shadow-[var(--nx-primary)]/20 hover:scale-105'
                    }`}
                    title={
                      status === 'loading' && !isReady
                        ? 'Carregando modelo Vosk...'
                        : isListening 
                          ? 'Pausar Microfone' 
                          : 'Iniciar Microfone'
                    }
                  >
                    {status === 'loading' && !isReady ? (
                      <div className="w-8 h-8 border-2 border-nx-dim border-t-[var(--nx-primary)] rounded-full animate-spin" />
                    ) : isListening ? (
                      <div className="relative">
                        <MicOff size={32} />
                        <motion.div 
                          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 bg-white rounded-full -z-10"
                        />
                      </div>
                    ) : (
                      <Mic size={32} />
                    )}
                  </button>

                  {/* Próximo Verso */}
                  <button 
                    type="button"
                    onClick={currentLineIndex < lines.length - 1 ? handleNextLine : finishDojo}
                    className="px-4 py-3 bg-nx-depth hover:bg-nx-overlay rounded-2xl text-nx-dim hover:text-nx-bright transition-all flex items-center gap-2 text-xs font-semibold border border-nx-border cursor-pointer shadow-sm"
                    title="Avançar para o Próximo Verso"
                  >
                    <span>{currentLineIndex < lines.length - 1 ? 'Próximo' : 'Concluir'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Status Indicator com Tratamento Completo */}
                <div className="flex items-center justify-center pt-2">
                  {status === 'error' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--nx-error)] bg-[var(--nx-error-bg)] border border-[var(--nx-error)]/30 px-3.5 py-1.5 rounded-full">
                        ⚠️ Falha ao inicializar Vosk
                      </span>
                      <button
                        type="button"
                        onClick={() => loadVoskModel?.()}
                        className="text-xs font-semibold text-[var(--nx-primary)] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Tentar novamente</span>
                      </button>
                    </div>
                  ) : status === 'loading' && !isReady ? (
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full flex items-center gap-2 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      ⏳ Carregando Motor Vosk Offline...
                    </span>
                  ) : isListening ? (
                    <span className="text-xs font-mono tracking-wide text-[var(--nx-secondary)] bg-[var(--nx-secondary-bg)] border border-[var(--nx-secondary)]/30 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[var(--nx-secondary)] animate-ping" />
                      🎙️ Microfone Ativo • Pode Recitar o Verso
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-nx-dim">
                      Clique no microfone para iniciar a recitação vocal
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PoemaRecitacao;
