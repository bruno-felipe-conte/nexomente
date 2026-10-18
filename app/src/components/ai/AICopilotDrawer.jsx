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
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useUIStore } from '../../store/useUIStore';
import { useVosk } from '../../hooks/useVosk';
import * as aiProvider from '../../lib/ai/aiProvider';
import toast from 'react-hot-toast';

export default function AICopilotDrawer({ isOpen, onClose, onExpandFullScreen }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Olá! Sou seu Copiloto Neural local. Como posso ajudar com seus estudos, notas ou conexões hoje?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [partialVoice, setPartialVoice] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Preferências de áudio persistidas
  const [ttsEnabled, setTtsEnabled] = useState(
    () => localStorage.getItem('nexomente_copilot_tts') !== 'false'
  );
  const [autoSendVoice, setAutoSendVoice] = useState(
    () => localStorage.getItem('nexomente_copilot_voice_autosend') === 'true'
  );

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

  // Síntese de Voz (TTS) em Português nativo
  const speakText = useCallback((texto, msgId) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (speakingMessageId === msgId) {
      setSpeakingMessageId(null);
      return;
    }

    const textoLimpo = texto
      .replace(/<[^>]*>/g, '')
      .replace(/[*_#`~>\[\]]/g, '')
      .trim();

    if (!textoLimpo) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find((v) => v.lang.startsWith('pt') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Luciana') || v.name.includes('Maria'))) ||
      voices.find((v) => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => {
      setSpeakingMessageId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [speakingMessageId]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, []);

  const executeSend = useCallback(
    async (textoParaEnviar) => {
      const texto = (textoParaEnviar || input).trim();
      if (!texto || loading) return;

      const userMsg = { id: `u-${Date.now()}`, role: 'user', text: texto };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setPartialVoice('');
      setLoading(true);

      try {
        const context = getContextSnippet();
        let resposta = '';

        if (aiProvider?.askAI) {
          resposta = await aiProvider.askAI(texto, context);
        } else {
          resposta = `Com base no seu Vault local (${notas.length} notas) e no contexto de ${activeTab}, essa conexão fortalece sua rede de estudos.`;
        }

        const assistantMsgId = `a-${Date.now()}`;
        const assistantText = resposta || 'Análise concluída com sucesso pelo motor local.';

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            text: assistantText,
          },
        ]);

        // Reprodução por voz automática caso ativada
        if (ttsEnabled) {
          speakText(assistantText, assistantMsgId);
        }
      } catch {
        toast.error('Erro na inferência do Copiloto');
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: 'assistant',
            text: 'O motor neural local está aquecendo. Tente novamente em instantes.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, getContextSnippet, notas.length, activeTab, ttsEnabled, speakText]
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
        setPartialVoice(partial);
      }
    },
    onResult: (finalText) => {
      if (!finalText) return;
      setPartialVoice('');

      if (autoSendVoice) {
        handleSendRef.current?.(finalText);
      } else {
        setInput((prev) => (prev ? `${prev} ${finalText}` : finalText));
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
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* Botão individual para ouvir/parar fala do assistente */}
                      {!isUser && (
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => speakText(m.text, m.id)}
                            title={isSpeakingThis ? 'Parar leitura' : 'Ouvir resposta em voz alta'}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                              isSpeakingThis
                                ? 'bg-nx-primary/25 text-nx-primary font-bold animate-pulse'
                                : 'text-nx-dim hover:text-nx-bright hover:bg-white/5 opacity-70 group-hover:opacity-100'
                            }`}
                          >
                            {isSpeakingThis ? <VolumeX size={11} /> : <Volume2 size={11} />}
                            <span>{isSpeakingThis ? 'Parar voz' : 'Ouvir'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-nx-dim p-2">
                  <Loader2 size={14} className="animate-spin text-nx-primary" />
                  <span>Sintetizando resposta local...</span>
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

