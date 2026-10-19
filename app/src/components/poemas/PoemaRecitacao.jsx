import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, RotateCcw, X, Trophy, ChevronRight } from 'lucide-react';
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

  // Processamento fiel: partialresult pinta verde em tempo real; result consolida acertos/erros (vermelho) e avança o ponteiro
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
    startListening,
    stopListening,
    nextVerse,
    terminateAudio
  } = useVosk({
    onResult: (text) => processarTranscricao(text, true),
    onPartialResult: (text) => processarTranscricao(text, false),
    onError: (msg) => toast.error(msg),
    grammar: gramaticaVerso,
  });

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const isTransitioningRef = useRef(false);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    console.log('[DOJO] Encerrando sessão...');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 select-none"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl cursor-default"
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-indigo-400 font-mono text-sm tracking-widest uppercase">Estúdio de Oratória & Poesia</h2>
            <h3 className="text-2xl font-bold text-white">{poema?.titulo || 'Recitação'}</h3>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white cursor-pointer"
            title="Fechar Estúdio"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-12 flex flex-col items-center min-height-[500px]">
          {isFinished ? (
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="text-center space-y-6">
              <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto border border-yellow-500/50">
                <Trophy size={48} className="text-yellow-500" />
              </div>
              <h2 className="text-4xl font-bold text-white">Excelente!</h2>
              <p className="text-slate-400">Você concluiu a recitação de "{poema?.titulo}".</p>
              
              <div className="inline-flex items-center gap-4 px-6 py-2 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs uppercase tracking-widest text-text-lo font-bold">Acurácia:</span>
                <span className="text-lg font-mono font-bold text-success">{acuraciaCalculada}%</span>
                <span className="text-white/20">•</span>
                <span className="text-xs uppercase tracking-widest text-text-lo font-bold">Recompensa:</span>
                <span className="text-sm font-bold text-xp-gold">+25 XP</span>
              </div>

              <div className="flex gap-4 justify-center pt-6">
                <button type="button" onClick={resetDojo} className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold transition-all border border-white/10 cursor-pointer">
                  Recitar Novamente
                </button>
                <button type="button" onClick={onFinish} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer">
                  Coletar Recompensa & Salvar
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="w-full max-w-md bg-white/5 h-1.5 rounded-full mb-12 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentLineIndex + 1) / lines.length) * 100}%` }}
                />
              </div>

              {/* Texto do Poema com Glow */}
              <div className="poema-texto-display mb-16">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentLineIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {palavrasPoema.map((palavra, idx) => (
                      <span key={idx} className={`palavra palavra--${palavrasStatus[idx] || 'neutra'}`}>
                        {palavra}{' '}
                      </span>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Live Transcript */}
              <div className="status-feedback mb-8">
                {partialTranscript && (
                  <span className="animate-pulse">“{partialTranscript}...”</span>
                )}
              </div>

              {/* Controles da Arena */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                  {/* Reiniciar Verso Atual */}
                  <button 
                    type="button"
                    onClick={reiniciarVersoAtual}
                    className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold border border-white/5 cursor-pointer"
                    title="Tentar Este Verso Novamente"
                  >
                    <RotateCcw size={18} />
                    <span>Verso</span>
                  </button>

                  {/* Botão Central de Microfone */}
                  <button 
                    type="button"
                    onClick={isReady ? toggleListening : undefined}
                    disabled={!isReady}
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      !isReady
                        ? 'bg-slate-700/60 opacity-60 cursor-not-allowed'
                        : isListening 
                          ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.45)] scale-105' 
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.35)]'
                    } text-white`}
                    title={!isReady ? 'Inicializando modelo Vosk...' : isListening ? 'Pausar Microfone' : 'Iniciar Microfone'}
                  >
                    {isListening ? (
                      <div className="relative">
                        <MicOff size={32} />
                        <motion.div 
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
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
                    className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold border border-white/5 cursor-pointer"
                    title="Avançar para o Próximo Verso"
                  >
                    <span>{currentLineIndex < lines.length - 1 ? 'Próximo' : 'Concluir'}</span>
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-center pt-2">
                  {!isReady ? (
                    <span className="text-[11px] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-full animate-pulse">
                      ⏳ Inicializando Motor Vosk Offline...
                    </span>
                  ) : isListening ? (
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      🎙️ Microfone Ativo • Pode Recitar
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-white/40">
                      Clique no microfone para iniciar a tomada de oratória
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
