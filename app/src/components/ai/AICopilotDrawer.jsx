/**
 * @module AICopilotDrawer
 * @description Copiloto Neural Global (Slide-over Drawer) do NexoMente:
 * - Acessível em qualquer tela via TopBar ou atalho Ctrl+J / Cmd+J
 * - Detecta contexto automático (nota ativa, nó do grafo, resumo do dia)
 * - Inferência privada com Gemma 4 Local / embeddedService
 * - Conversação por Áudio Bidirecional: Reconhecimento de Voz Offline (Vosk) + Síntese de Voz (TTS pt-BR)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Maximize2,
  Bot,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Sliders,
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useUIStore } from '../../store/useUIStore';
import { useVosk } from '../../hooks/useVosk';
import { normalizarTranscricaoCopiloto } from '../../lib/audio/audioDecoder';
import { neuralTTS, NEURAL_VOICES } from '../../lib/audio/neuralTTS';
import * as aiProvider from '../../lib/ai/aiProvider';
import CopilotMessageContent from './CopilotMessageContent';
import toast from 'react-hot-toast';

const MAX_CHARS = aiProvider.MAX_COPILOT_CHARS || 1500;

export default function AICopilotDrawer({ isOpen, onClose, onExpandFullScreen }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Olá! Sou seu Copiloto Neural local. Como posso ajudar com seus estudos ou notas hoje?',
      responseTimeMs: 42,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [partialVoice, setPartialVoice] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Preferências de áudio persistidas
  const [ttsEnabled, setTtsEnabled] = useState(
    () => localStorage.getItem('nexomente_copilot_tts') !== 'false'
  );
  const [autoSendVoice, setAutoSendVoice] = useState(
    () => localStorage.getItem('nexomente_copilot_voice_autosend') === 'true'
  );
  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem('nexomente_copilot_voice') || 'pt-BR-FranciscaNeural'
  );
  const [speechRate, setSpeechRate] = useState(
    () => parseFloat(localStorage.getItem('nexomente_copilot_voice_speed') || '1.05')
  );
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);

  // Sincroniza estado de reprodução do motor de áudio neural
  useEffect(() => {
    return neuralTTS.subscribe((state) => {
      setSpeakingMessageId(state?.isPlaying ? state.messageId : null);
    });
  }, []);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const handleSendRef = useRef(null);

  const { notas } = useNotes();
  const { activeTab, pendingNoteAction } = useUIStore();

  // Contexto dinâmico da tela ativa
  const getContextSnippet = useCallback(() => {
    if (activeTab === 'notes' && pendingNoteAction?.noteId) {
      const nota = notas.find((n) => n.id === pendingNoteAction.noteId);
      if (nota) {
        return `Nota Ativa: "${nota.titulo}". Conteúdo: ${(nota.conteudo || '')
          .replace(/<[^>]*>/g, '')
          .slice(0, 300)}`;
      }
    }
    return `Tela ativa: ${activeTab}. Total de notas no Vault: ${notas.length}.`;
  }, [activeTab, pendingNoteAction, notas]);

  // Síntese de Voz Neural em Português de Alta Fidelidade
  const speakText = useCallback(
    (texto, msgId) => {
      neuralTTS.speak(texto, {
        messageId: msgId,
        voice: selectedVoice,
        rate: speechRate,
      });
    },
    [selectedVoice, speechRate]
  );

  const stopSpeaking = useCallback(() => {
    neuralTTS.stop();
  }, []);

  // Cronômetro em tempo real durante a geração da resposta
  useEffect(() => {
    if (!loading) {
      setElapsedMs(0);
      return;
    }
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start));
    }, 100);
    return () => clearInterval(interval);
  }, [loading]);

  const executeSend = useCallback(
    async (textoParaEnviar) => {
      const texto = (textoParaEnviar || input).trim();
      if (!texto || loading) return;

      stopSpeaking();
      const userMsg = { id: `u-${Date.now()}`, role: 'user', text: texto };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setPartialVoice('');
      setLoading(true);
      const t0 = performance.now();

      try {
        const context = getContextSnippet();
        let resposta = '';
        let durationMs = 0;

        if (aiProvider?.askAI) {
          const result = await aiProvider.askAI(texto, context, { withMetrics: true });
          if (result && typeof result === 'object') {
            resposta = result.text;
            durationMs = result.durationMs;
          } else {
            resposta = String(result || '');
          }
        } else {
          resposta = `Com base no seu Vault local (${notas.length} notas) e no contexto de ${activeTab}, essa conexão fortalece sua rede de estudos.`;
        }

        if (!durationMs) {
          durationMs = Math.round(performance.now() - t0);
        }

        const enforceLimit = aiProvider?.enforceCharLimit || ((s) => s.slice(0, MAX_CHARS));
        const assistantText = enforceLimit(
          resposta || 'Análise concluída com sucesso pelo motor local.',
          MAX_CHARS
        );

        const assistantMsgId = `a-${Date.now()}`;

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            text: assistantText,
            responseTimeMs: durationMs,
          },
        ]);

        // Reprodução por voz automática caso ativada
        if (ttsEnabled) {
          speakText(assistantText, assistantMsgId);
        }
      } catch {
        toast.error('Erro na inferência do Copiloto');
        const durationMs = Math.round(performance.now() - t0);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: 'O motor neural local está aquecendo. Tente novamente em instantes.',
            responseTimeMs: durationMs,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, getContextSnippet, notas.length, activeTab, ttsEnabled, speakText, stopSpeaking]
  );

  handleSendRef.current = executeSend;

  // Reconhecimento de Voz Offline via Vosk Browser (Singleton WASM)
  const {
    isListening,
    audioLevel,
    startListening,
    stopListening,
    terminateAudio,
  } = useVosk({
    onPartialResult: (partial) => {
      if (partial) {
        if (partial.trim().length > 2) {
          stopSpeaking(); // Barge-in imediato: para a voz da IA assim que o usuário começa a falar
        }
        setPartialVoice(partial);
      }
    },
    onResult: (finalText) => {
      if (!finalText) return;
      const textoHigienizado = normalizarTranscricaoCopiloto(finalText);
      setPartialVoice('');

      if (autoSendVoice) {
        handleSendRef.current?.(textoHigienizado);
      } else {
        setInput((prev) => (prev ? `${prev} ${textoHigienizado}` : textoHigienizado));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    onError: (err) => {
      toast.error(err || 'Erro no microfone do Copiloto');
    },
  });

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
      setPartialVoice('');
      toast('Microfone do Copiloto pausado', { icon: '⏸️' });
    } else {
      stopSpeaking(); // Prevenção de eco caso Copiloto esteja falando
      startListening();
      toast('Escutando... Fale sua pergunta para o Copiloto', { icon: '🎙️' });
    }
  };

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    localStorage.setItem('nexomente_copilot_tts', String(next));
    if (!next) stopSpeaking();
    toast(next ? 'Voz do Copiloto ativada (TTS)' : 'Voz do Copiloto silenciada', {
      icon: next ? '🔊' : '🔇',
    });
  };

  const toggleAutoSend = () => {
    const next = !autoSendVoice;
    setAutoSendVoice(next);
    localStorage.setItem('nexomente_copilot_voice_autosend', String(next));
    toast(
      next
        ? 'Modo Mãos-Livres: Envio automático ao falar'
        : 'Modo Ditado: Texto inserido no campo para revisão',
      { icon: next ? '⚡' : '✍️' }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      // Limpeza de áudio ao fechar gaveta
      terminateAudio();
      stopSpeaking();
      setPartialVoice('');
    }
  }, [isOpen, terminateAudio, stopSpeaking]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, partialVoice]);

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    executeSend();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop com blur suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
          />

          {/* Drawer Lateral */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-nx-depth border-l border-nx-border z-[120] flex flex-col shadow-2xl"
          >
            {/* Header da Gaveta */}
            <div className="p-4 border-b border-nx-border flex items-center justify-between bg-nx-surface/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-nx-primary/15 border border-nx-primary/40 flex items-center justify-center text-nx-primary">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-nx-bright leading-tight flex items-center gap-1.5">
                    <span>Copiloto Neural</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-nx-overlay border border-nx-primary/40 text-nx-secondary">
                      Gemma 4
                    </span>
                  </h3>
                  <p className="text-[10px] text-nx-dim">RAG Local • Conversação por Voz</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Seletor de Voz Neural e Velocidade */}
                <button
                  type="button"
                  onClick={() => setVoiceMenuOpen(!voiceMenuOpen)}
                  title="Configurar Voz Neural e Velocidade"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    voiceMenuOpen
                      ? 'text-nx-primary bg-nx-primary/20 border border-nx-primary/40'
                      : 'text-nx-dim hover:text-nx-bright hover:bg-nx-surface'
                  }`}
                >
                  <Sliders size={15} />
                </button>

                {/* Botão de Síntese de Voz (TTS) */}
                <button
                  type="button"
                  onClick={toggleTts}
                  title={ttsEnabled ? 'Silenciar leitura em voz alta' : 'Ativar leitura em voz alta (TTS)'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    ttsEnabled
                      ? 'text-nx-primary bg-nx-primary/15 border border-nx-primary/30'
                      : 'text-nx-dim hover:text-nx-bright hover:bg-nx-surface'
                  }`}
                >
                  {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                {/* Botão de Auto-Envio por Voz */}
                <button
                  type="button"
                  onClick={toggleAutoSend}
                  title={
                    autoSendVoice
                      ? 'Auto-envio ativado: perguntas faladas são enviadas direto'
                      : 'Auto-envio desativado: fala vira rascunho no campo'
                  }
                  className={`p-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    autoSendVoice
                      ? 'text-accent-gold bg-accent-gold/15 border border-accent-gold/30'
                      : 'text-nx-dim hover:text-nx-bright hover:bg-nx-surface'
                  }`}
                >
                  ⚡AUTO
                </button>

                {onExpandFullScreen && (
                  <button
                    type="button"
                    onClick={onExpandFullScreen}
                    title="Expandir para tela cheia"
                    className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-colors cursor-pointer"
                  >
                    <Maximize2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setMessages([]);
                  }}
                  title="Limpar histórico"
                  className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Fechar (Esc)"
                  className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-colors cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Painel Expansível de Configuração de Voz Neural */}
            <AnimatePresence>
              {voiceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-nx-border bg-nx-surface/95 px-4 py-3 space-y-2.5 backdrop-blur-md overflow-hidden shrink-0"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-nx-bright flex items-center gap-1.5">
                      <Sparkles size={13} className="text-nx-primary" />
                      Voz do Copiloto Neural
                    </span>
                    <span className="text-[10px] text-nx-dim font-mono">Alta Fidelidade</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {NEURAL_VOICES.map((v) => {
                      const isSelected = selectedVoice === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVoice(v.id);
                            localStorage.setItem('nexomente_copilot_voice', v.id);
                            toast.success(`Voz: ${v.name}`);
                          }}
                          className={`p-2 rounded-lg text-left border text-[11px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-nx-primary/20 border-nx-primary text-nx-bright shadow-sm'
                              : 'bg-nx-overlay/40 border-nx-border/60 text-nx-dim hover:text-nx-bright hover:bg-nx-overlay'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span className="truncate">{v.name}</span>
                            {v.recommended && (
                              <span className="text-[8px] bg-nx-primary/30 text-nx-primary px-1 py-0.2 rounded font-mono shrink-0">
                                HD
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-nx-dim mt-0.5 leading-tight line-clamp-1">
                            {v.gender} • {v.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-nx-border/40 text-[11px]">
                    <span className="text-nx-dim">Velocidade:</span>
                    <div className="flex items-center gap-1">
                      {[0.9, 1.0, 1.05, 1.2, 1.35].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setSpeechRate(rate);
                            localStorage.setItem('nexomente_copilot_voice_speed', String(rate));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                            speechRate === rate
                              ? 'bg-nx-primary text-white font-bold'
                              : 'bg-nx-overlay text-nx-dim hover:text-nx-bright'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                const isSpeakingThis = speakingMessageId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-nx-primary/20 border border-nx-primary/40 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={13} className="text-nx-primary" />
                      </div>
                    )}
                    <div
                      className={`relative group max-w-[85%] rounded-[12px] p-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-nx-primary text-white rounded-br-none'
                          : 'bg-nx-surface border border-nx-border text-nx-bright rounded-bl-none'
                      }`}
                    >
                      <CopilotMessageContent content={m.text} isUser={isUser} />

                      {/* Rodapé da mensagem: Contador de tempo de resposta + Caracteres + Botão de voz */}
                      {!isUser && (
                        <div className="pt-2 mt-1.5 border-t border-nx-border/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-nx-dim">
                            <Clock size={10} className="text-nx-primary" />
                            <span>
                              {m.responseTimeMs !== undefined
                                ? m.responseTimeMs >= 1000
                                  ? `${(m.responseTimeMs / 1000).toFixed(1)}s`
                                  : `${m.responseTimeMs}ms`
                                : '0.1s'}
                            </span>
                            <span className="opacity-40">•</span>
                            <span>
                              {(m.text || '').length}/{MAX_CHARS} chars
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => speakText(m.text, m.id)}
                            title={isSpeakingThis ? 'Parar leitura' : 'Ouvir resposta em voz alta'}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isSpeakingThis
                                ? 'bg-nx-primary/25 text-nx-primary font-bold shadow-sm'
                                : 'text-nx-dim hover:text-nx-bright hover:bg-nx-overlay/60 opacity-80 group-hover:opacity-100'
                            }`}
                          >
                            {isSpeakingThis ? (
                              <>
                                <span className="flex items-end gap-0.5 h-3 px-0.5" aria-hidden="true">
                                  <span className="w-0.5 h-2 bg-nx-primary animate-pulse rounded-full" />
                                  <span
                                    className="w-0.5 h-3 bg-nx-primary animate-bounce rounded-full"
                                    style={{ animationDelay: '100ms' }}
                                  />
                                  <span
                                    className="w-0.5 h-1.5 bg-nx-primary animate-pulse rounded-full"
                                    style={{ animationDelay: '200ms' }}
                                  />
                                  <span
                                    className="w-0.5 h-2.5 bg-nx-primary animate-bounce rounded-full"
                                    style={{ animationDelay: '150ms' }}
                                  />
                                </span>
                                <span>Parar</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={11} />
                                <span>Ouvir</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center justify-between gap-2 text-xs text-nx-dim px-3 py-2 rounded-xl bg-nx-surface/70 border border-nx-border">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-nx-primary" />
                    <span>Sintetizando resposta concisa (máx. {MAX_CHARS} chars)...</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-nx-primary flex items-center gap-1">
                    <Clock size={11} />
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}

              {/* Indicador de fala em tempo real */}
              {isListening && (
                <div className="p-2.5 rounded-xl bg-nx-surface/90 border border-nx-primary/40 flex items-center gap-2.5 shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-mono text-nx-dim mb-0.5">
                      <span className="text-nx-primary font-semibold">🎙️ Escutando fala...</span>
                      <span>{audioLevel}% RMS</span>
                    </div>
                    <p className="text-xs text-nx-bright truncate italic">
                      {partialVoice ? `“${partialVoice}...”` : 'Fale agora com o Copiloto'}
                    </p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input e Envio com Microfone Integrado */}
            <form
              onSubmit={handleFormSubmit}
              className="p-3 border-t border-nx-border bg-nx-surface/40 flex items-center gap-2"
            >
              {/* Botão de Microfone de Entrada de Voz */}
              <button
                type="button"
                onClick={toggleVoice}
                title={isListening ? 'Pausar escuta de voz' : 'Falar com o Copiloto por áudio'}
                className={`relative h-[38px] w-[38px] rounded-[10px] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-105'
                    : 'bg-nx-depth border border-nx-border text-nx-dim hover:text-nx-primary hover:border-nx-primary/50'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? 'Ouvindo sua voz... fale ou digite...'
                    : 'Pergunte ao Copiloto (ou use Ctrl+J)...'
                }
                className="flex-1 h-[38px] px-3 bg-nx-depth border border-nx-border rounded-[10px] text-xs text-nx-bright placeholder-nx-subtle focus:outline-none focus:border-nx-primary transition-colors"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-[38px] px-3.5 bg-nx-primary hover:bg-nx-primary/90 disabled:opacity-40 text-white rounded-[10px] text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

AICopilotDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onExpandFullScreen: PropTypes.func,
};

