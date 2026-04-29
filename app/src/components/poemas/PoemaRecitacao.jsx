import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, RotateCcw, X, CheckCircle2, Trophy, Star } from 'lucide-react';
import { useVosk } from '../../hooks/useVosk';
import { toast } from 'react-hot-toast';
import './PoemaRecitacao.css';

const PoemaRecitacao = ({ poema, onFinish, onClose }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [palavrasStatus, setPalavrasStatus] = useState({}); // { index: 'correta' | 'errada' }
  const [indicePalavraLocal, setIndicePalavraLocal] = useState(0);

  const lines = useMemo(() => 
    poema?.corpo?.split('\n').filter(l => l.trim().length > 0) || []
  , [poema?.corpo]);

  const currentLine = lines[currentLineIndex] || "";
  const palavrasPoema = useMemo(() => 
    currentLine.split(/\s+/).filter(w => w.length > 0)
  , [currentLine]);

  const normalizar = (texto) => 
    texto.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');

  const processarTranscricao = useCallback((textoCompleto) => {
    if (!textoCompleto || isFinished) return;
    
    const ouvidas = textoCompleto.trim().split(/\s+/).filter(Boolean);
    
    setPalavrasStatus(prev => {
      const novo = { ...prev };
      ouvidas.forEach((ouvida, i) => {
        const idxNoPoema = indicePalavraLocal + i;
        if (idxNoPoema >= palavrasPoema.length) return;
        
        const target = normalizar(palavrasPoema[idxNoPoema]);
        const dita = normalizar(ouvida);
        
        // Match amigável
        const correta = dita === target || 
                       (dita.length > 3 && target.startsWith(dita)) ||
                       (target.length > 3 && dita.startsWith(target));
        
        novo[idxNoPoema] = correta ? 'correta' : 'errada';
      });
      return novo;
    });

    setIndicePalavraLocal(prev => prev + ouvidas.length);
    setTranscript(textoCompleto);
    setPartialTranscript('');
  }, [palavrasPoema, indicePalavraLocal, isFinished]);

  const { isListening, isReady, startListening, stopListening, nextVerse, terminateAudio } = useVosk({
    onResult: (text) => processarTranscricao(text),
    onPartialResult: (partial) => setPartialTranscript(partial),
    onError: (msg) => toast.error(msg)
  });

  // Verifica se a linha terminou
  useEffect(() => {
    const todasCertas = palavrasPoema.length > 0 && 
                       palavrasPoema.every((_, i) => palavrasStatus[i] === 'correta');
    
    // Se a maioria estiver correta ou o índice de palavras estourou a linha
    if (todasCertas || (indicePalavraLocal >= palavrasPoema.length && palavrasPoema.length > 0)) {
      setTimeout(() => {
        if (currentLineIndex < lines.length - 1) {
          handleNextLine();
        } else {
          finishDojo();
        }
      }, 1000);
    }
  }, [palavrasStatus, indicePalavraLocal, palavrasPoema]);

  const handleNextLine = () => {
    setTranscript('');
    setPartialTranscript('');
    setPalavrasStatus({});
    setIndicePalavraLocal(0);
    setCurrentLineIndex(prev => prev + 1);
    nextVerse(); // Reset do motor para a próxima linha
  };

  const finishDojo = () => {
    setIsFinished(true);
    stopListening();
    terminateAudio();
    toast.success('Recitação concluída!');
  };

  const resetDojo = () => {
    setCurrentLineIndex(0);
    setTranscript('');
    setPartialTranscript('');
    setPalavrasStatus({});
    setIndicePalavraLocal(0);
    setIsFinished(false);
    terminateAudio();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-indigo-400 font-mono text-sm tracking-widest uppercase">Poetry Dojo v2.0</h2>
            <h3 className="text-2xl font-bold text-white">{poema?.titulo || 'Recitação'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
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
              <div className="flex gap-4 justify-center pt-8">
                <button onClick={onFinish} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
                  Coletar Recompensa
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

              {/* Controles */}
              <div className="flex items-center gap-8">
                <button 
                  onClick={resetDojo}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"
                  title="Reiniciar"
                >
                  <RotateCcw size={24} />
                </button>

                <button 
                  onClick={isListening ? stopListening : startListening}
                  disabled={!isReady}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isListening 
                      ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)] scale-110' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
                  } text-white disabled:opacity-50 disabled:grayscale`}
                >
                  {isListening ? (
                    <div className="relative">
                      <MicOff size={32} />
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 bg-white rounded-full -z-10"
                      />
                    </div>
                  ) : (
                    <Mic size={32} />
                  )}
                </button>

                <div className="w-12 h-12 flex items-center justify-center text-white/20">
                  {isListening && <span className="text-xs font-mono uppercase tracking-widest">Listening</span>}
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
