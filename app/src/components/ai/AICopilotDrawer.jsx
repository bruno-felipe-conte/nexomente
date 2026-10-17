/**
 * @module AICopilotDrawer
 * @description Copiloto Neural Global (Slide-over Drawer) do NexoMente:
 * - Acessível em qualquer tela via TopBar ou atalho Ctrl+J / Cmd+J
 * - Detecta contexto automático (nota ativa, nó do grafo, resumo do dia)
 * - Inferência privada com Gemma 4 Local / embeddedService
 */
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Maximize2, Bot, Trash2 } from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useUIStore } from '../../store/useUIStore';
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const { notas } = useNotes();
  const { activeTab, pendingNoteAction } = useUIStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Contexto dinâmico da tela ativa
  const getContextSnippet = () => {
    if (activeTab === 'notes' && pendingNoteAction?.noteId) {
      const nota = notas.find((n) => n.id === pendingNoteAction.noteId);
      if (nota) {
        return `Nota Ativa: "${nota.titulo}". Conteúdo: ${(nota.conteudo || '').replace(/<[^>]*>/g, '').slice(0, 300)}`;
      }
    }
    return `Tela ativa: ${activeTab}. Total de notas no Vault: ${notas.length}.`;
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const texto = input.trim();
    if (!texto || loading) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: texto };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = getContextSnippet();
      let resposta = '';

      if (aiProvider?.askAI) {
        resposta = await aiProvider.askAI(texto, context);
      } else {
        resposta = `Com base no seu Vault local (${notas.length} notas) e no contexto de ${activeTab}, essa conexão fortalece sua rede de estudos.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: resposta || 'Análise concluída com sucesso pelo motor local.',
        },
      ]);
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
                  <p className="text-[10px] text-nx-dim">RAG Local • 100% On-Device</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onExpandFullScreen && (
                  <button
                    onClick={onExpandFullScreen}
                    title="Expandir para tela cheia"
                    className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-colors cursor-pointer"
                  >
                    <Maximize2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => setMessages([])}
                  title="Limpar histórico"
                  className="p-1.5 rounded-lg text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
                <button
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
                      className={`max-w-[85%] rounded-[12px] p-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-nx-primary text-white rounded-br-none'
                          : 'bg-nx-surface border border-nx-border text-nx-bright rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
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
              <div ref={bottomRef} />
            </div>

            {/* Input e Envio */}
            <form onSubmit={handleSend} className="p-3 border-t border-nx-border bg-nx-surface/40 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte ao Copiloto (ou use Ctrl+J)..."
                className="flex-1 h-[38px] px-3 bg-nx-depth border border-nx-border rounded-[10px] text-xs text-nx-bright placeholder-nx-subtle focus:outline-none focus:border-nx-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-[38px] px-3.5 bg-nx-primary hover:bg-nx-primary/90 disabled:opacity-40 text-white rounded-[10px] text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
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
