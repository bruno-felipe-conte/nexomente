/**
 * AIChatPage — Alta Fidelidade Claude.ai.
 * Implementação de Popovers integrados para Contexto e Modelos.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Send, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAIModel, useAIChat } from '../hooks/useAIModel';
import { useNotes } from '../hooks/useNotes';
import * as aiProvider from '../lib/ai/aiProvider';
import { useAIStore } from '../store/useAIStore';
import toast from 'react-hot-toast';
import ChatMessage from '../components/ai/ChatMessage';
import ModelSelectorPopover from '../components/ai/ModelSelectorPopover';
import NoteAttachPopover from '../components/ai/NoteAttachPopover';

const TEMPLATES = [
  { id: 'escrever',    label: 'Escrever',    prompt: 'Escreva um texto sobre...' },
  { id: 'estrategias', label: 'Estratégias', prompt: 'Crie uma estratégia de estudo para...' },
  { id: 'aprender',    label: 'Aprender',    prompt: 'Me ensine sobre...' },
  { id: 'codigo',      label: 'Código',      prompt: 'Explique o código...' },
];

export default function AIChatPage({ onNavigate }) {
  const { notas } = useNotes();
  const { modelos, modeloAtual, trocarModelo, temperatura, trocarTemperatura } = useAIModel();
  const { provider, apiKey } = useAIStore();

  const [notaId, setNotaId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [buscaNota, setBuscaNota] = useState('');
  const [copiadoIdx, setCopiadoIdx] = useState(null);

  const { mensagens, adicionar } = useAIChat(notaId);
  const notaAtual = notaId ? notas.find(n => n.id === notaId) : null;
  const bottomRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelMenu(false);
      setShowAttachMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const buildMessages = useCallback((userPrompt) => {
    const sys = notaAtual
      ? `Você é um assistente de estudo. Contexto: Nota "${notaAtual.titulo}".\nConteúdo:\n${(notaAtual.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 4000)}`
      : 'Você é um assistente de estudo prestativo. Responda em português.';

    const msgs = [{ role: 'system', content: sys }];
    mensagens.slice(-10).forEach(m => msgs.push({ role: m.role, content: m.texto }));
    if (userPrompt) msgs.push({ role: 'user', content: userPrompt });
    return msgs;
  }, [notaAtual, mensagens]);

  const enviar = async (promptExtra) => {
    const prompt = promptExtra || input.trim();
    if (!prompt || loading) return;

    setLoading(true);
    if (!promptExtra) setInput('');
    adicionar('user', prompt);

    try {
      const instrucaoRaciocinio = temperatura < 0.5
        ? "\n\n(Instrução de Pensamento Adaptativo: Raciocine passo a passo de forma lógica e estruturada antes de responder. Seja extremamente preciso.)"
        : "";

      const res = await aiProvider.chat(buildMessages(prompt + instrucaoRaciocinio), {
        provider,
        model: modeloAtual,
        temperature: temperatura,
        apiKey,
        max_tokens: 2000
      });
      adicionar('assistant', res.success ? res.response : res.error, res.code);
    } catch (e) {
      adicionar('assistant', e.message, 'ERROR');
    }
    setLoading(false);
  };

  const notasFiltradas = notas.filter(n =>
    n.titulo.toLowerCase().includes(buscaNota.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-nx-void font-ui overflow-hidden">
      <div className="flex-1 overflow-auto flex flex-col chat-scroll-area relative">
        {mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 md:mb-12 text-center w-full"
            >
              <h1 className="text-xl md:text-nx-2xl font-display text-nx-bright tracking-tight leading-tight mb-2 px-6">
                Boa noite, bruno
              </h1>
            </motion.div>

            <div className="w-full max-w-2xl relative px-4 md:px-0">
              <div className="bg-nx-surface/30 border border-nx-border rounded-nx-md p-3 md:p-4 pb-2 md:pb-3 shadow-2xl transition-all focus-within:bg-nx-surface/50">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Como posso ajudar você hoje?"
                  className="w-full bg-transparent border-none p-2 text-sm md:text-nx-base text-nx-bright placeholder-nx-dim/20 focus:outline-none focus:ring-0 resize-none min-h-[40px] md:min-h-[50px] leading-relaxed"
                />

                <div className="flex items-center justify-between mt-2">
                  <NoteAttachPopover
                    showAttachMenu={showAttachMenu}
                    setShowAttachMenu={setShowAttachMenu}
                    setShowModelMenu={setShowModelMenu}
                    buscaNota={buscaNota}
                    setBuscaNota={setBuscaNota}
                    notasFiltradas={notasFiltradas}
                    notaId={notaId}
                    setNotaId={setNotaId}
                    notaAtual={notaAtual}
                  />

                  <div className="flex items-center gap-2">
                    <ModelSelectorPopover
                      modeloAtual={modeloAtual}
                      modelos={modelos}
                      trocarModelo={trocarModelo}
                      temperatura={temperatura}
                      trocarTemperatura={trocarTemperatura}
                      showModelMenu={showModelMenu}
                      setShowModelMenu={setShowModelMenu}
                      setShowAttachMenu={setShowAttachMenu}
                    />

                    <button
                      onClick={() => enviar()}
                      disabled={loading || !input.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        input.trim() ? 'bg-nx-primary text-white' : 'text-nx-dim/10 cursor-not-allowed'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-4 md:mt-6 px-2">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => enviar(tpl.prompt)}
                    className="px-3 md:px-4 py-1.5 md:py-2 border border-white/[0.05] rounded-full text-[10px] md:text-[12px] font-medium text-text-lo/60 hover:text-text-hi hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 space-y-8 md:space-y-10 max-w-3xl mx-auto w-full pb-36 md:pb-32">
            <AnimatePresence>
              {mensagens.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  msg={msg}
                  idx={idx}
                  copiadoIdx={copiadoIdx}
                  onCopiar={(t, i) => { navigator.clipboard.writeText(t); setCopiadoIdx(i); setTimeout(() => setCopiadoIdx(null), 2000); }}
                  onInserir={() => { onNavigate?.('notes'); toast.success('Conteúdo pronto para colar'); }}
                />
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex items-start gap-4 px-2">
                <div className="w-8 h-8 rounded-lg bg-accent-main/10 flex items-center justify-center shrink-0 border border-accent-main/20">
                  <Loader2 size={14} className="text-accent-main animate-spin" />
                </div>
                <div className="py-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-main">Processando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {mensagens.length > 0 && (
        <div className="w-full bg-nx-void/80 backdrop-blur-md border-t border-nx-border p-2 sm:p-3 md:p-4 z-30">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
            <div className="bg-nx-surface/95 backdrop-blur-xl border border-nx-border rounded-nx-md p-2 md:p-3 shadow-2xl flex flex-col gap-2">
              <div className="flex items-end gap-2 md:gap-3">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Responder..."
                  rows={1}
                  className="flex-1 bg-transparent border-none p-2 text-sm text-text-hi placeholder-text-lo/30 focus:outline-none focus:ring-0 resize-none min-h-[40px] max-h-40 overflow-y-auto"
                />
                <button
                  onClick={() => enviar()}
                  disabled={loading || !input.trim()}
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() ? 'bg-accent-main text-white shadow-lg shadow-accent-main/20' : 'bg-white/5 text-text-lo/20'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="flex items-center gap-2 px-1 pb-1">
                <NoteAttachPopover
                  showAttachMenu={showAttachMenu}
                  setShowAttachMenu={setShowAttachMenu}
                  setShowModelMenu={setShowModelMenu}
                  buscaNota={buscaNota}
                  setBuscaNota={setBuscaNota}
                  notasFiltradas={notasFiltradas}
                  notaId={notaId}
                  setNotaId={setNotaId}
                  notaAtual={notaAtual}
                  compact
                />
                <div className="h-3 w-[1px] bg-white/5" />
                <ModelSelectorPopover
                  modeloAtual={modeloAtual}
                  modelos={modelos}
                  trocarModelo={trocarModelo}
                  temperatura={temperatura}
                  trocarTemperatura={trocarTemperatura}
                  showModelMenu={showModelMenu}
                  setShowModelMenu={setShowModelMenu}
                  setShowAttachMenu={setShowAttachMenu}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AIChatPage.propTypes = {
  onNavigate: PropTypes.func,
};
