/**
 * AIChatPage — página de chat com IA local (LM Studio).
 * Refatorado (Tarefa 4.1): ChatMessage extraído para componente próprio.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Loader2, ChevronDown, RefreshCw,
  WifiOff, Wifi, Trash2, Bot, Globe, Cpu, Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAIModel, useAIChat } from '../hooks/useAIModel';
import { useNotes } from '../hooks/useNotes';
import * as aiProvider from '../lib/ai/aiProvider';
import { getTemperature } from '../lib/ai/lmStudioService';
import toast from 'react-hot-toast';
import ChatMessage from '../components/ai/ChatMessage';
import AIFallbackModal from '../components/ai/AIFallbackModal';
import PropTypes from 'prop-types';

const TEMPLATES = [
  { id: 'resumir',   label: 'Resumir',    prompt: 'Resuma o conteúdo em 3-5 frases' },
  { id: 'conceitos', label: 'Conceitos',  prompt: 'Extraia os 5 conceitos-chave' },
  { id: 'perguntas', label: 'Perguntas',  prompt: 'Gere 5 perguntas de revisão' },
  { id: 'critica',   label: 'Crítica',    prompt: 'Analise criticamente: o que falta?' },
  { id: 'conexoes',  label: 'Conexões',   prompt: 'Que conexões tem com outras áreas?' },
  { id: 'exemplos',  label: 'Exemplos',   prompt: 'Gere 3 exemplos práticos' },
  { id: 'analogias', label: 'Analogias',  prompt: 'Explique com uma analogia do cotidiano' },
];

function AIChatPage({ onNavigate }) {
  const notas = useNotes();
  const { status, provider, modelos, modeloAtual, loading: statusLoading, trocarModelo, trocarTemperatura, verificar } = useAIModel();

  const [notaId, setNotaId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempLocal, setTempLocal] = useState(getTemperature());
  const [showModelo, setShowModelo] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState(null);
  const [fallbackData, setFallbackData] = useState({ isOpen: false, error: '' });

  const { mensagens, adicionar, limpar } = useAIChat(notaId);
  const notaAtual = notaId ? notas.getById(notaId) : null;
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);
  useEffect(() => { if (status === 'offline' && provider === 'local') verificar(); }, [status, provider]);

  const buildMessages = useCallback((userPrompt) => {
    const sys = notaAtual
      ? `Você é um assistente de estudo. Contexto: Nota "${notaAtual.titulo}".\nConteúdo:\n${(notaAtual.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 2000)}`
      : 'Você é um assistente de estudo prestativo. Responda em português.';
    const msgs = [{ role: 'system', content: sys }];
    mensagens.slice(-20).forEach(m => msgs.push({ role: m.role, content: m.texto }));
    if (userPrompt) msgs.push({ role: 'user', content: userPrompt });
    return msgs;
  }, [notaAtual, mensagens]);

  const enviar = async (promptExtra) => {
    const prompt = promptExtra || input.trim();
    if (!prompt) return;
    setLoading(true);
    if (!promptExtra) setInput('');
    adicionar('user', prompt);
    try {
      const res = await aiProvider.chat(buildMessages(prompt), { 
        model: modeloAtual, 
        temperature: tempLocal, 
        max_tokens: 1024 
      });

      if (!res.success) {
        if (res.isProviderError) setFallbackData({ isOpen: true, error: res.error });
        adicionar('assistant', res.error, res.code);
      } else {
        adicionar('assistant', res.response);
      }
    } catch (e) {
      adicionar('assistant', e.message, 'ERR-JS-EXCEPTION');
    }
    setLoading(false);
  };

  const handleCopiar = (texto, idx) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 2000);
    });
  };

  const handleInserir = () => {
    if (!notaAtual) { toast.error('Nenhuma nota aberta'); return; }
    onNavigate?.('notes');
    toast.success('Resposta copiada — cole no editor');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Premium Adaptativo */}
      <div className="p-4 border-b border-border-subtle bg-bg-secondary/30 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-text-primary flex items-center gap-2 uppercase tracking-tighter">
              {notaId ? (
                <>
                  <Bot size={16} className="text-accent-main" />
                  Contexto Ativo
                </>
              ) : (
                <>
                  <MessageSquare size={16} className="text-accent-light" />
                  Chat Global
                </>
              )}
            </h1>
            <p className="text-[10px] text-text-muted truncate max-w-[180px] font-medium">
              {notaAtual ? notaAtual.titulo : 'Exploração Livre'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Contexto (Nota) */}
          <select
            value={notaId || ''}
            onChange={e => { setNotaId(e.target.value || null); limpar(); }}
            className="hidden md:block bg-bg-tertiary/50 border border-border-subtle rounded-full px-3 py-1 text-[11px] font-bold text-text-secondary cursor-pointer hover:border-accent-main/50 transition-all focus:outline-none"
          >
            <option value="">Conversa livre</option>
            {notas.notas.map(n => <option key={n.id} value={n.id}>{n.titulo}</option>)}
          </select>

          {/* Seletor de IA Dinâmico e Premium */}
          <div className="relative">
            <button
              onClick={() => setShowModelo(!showModelo)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 group ${
                status === 'online' 
                  ? 'bg-success/5 border-success/20 text-success' 
                  : 'bg-danger/5 border-danger/20 text-danger'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-danger'}`} />
              <span className="text-[11px] font-black tracking-wide uppercase">
                {modeloAtual.split('/').pop().substring(0, 15) || 'Selecionar IA'}
              </span>
              <ChevronDown size={10} className={`transition-transform duration-300 ${showModelo ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showModelo && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-3 w-64 bg-bg-secondary/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 flex items-center justify-between border-b border-white/5 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-accent-main/20 text-accent-main">
                        {provider === 'cloud' ? <Globe size={10} /> : <Cpu size={10} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{provider}</span>
                    </div>
                    <button onClick={verificar} className="p-1 hover:bg-white/5 rounded text-text-lo hover:text-accent-main transition-colors">
                      <RefreshCw size={10} />
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
                    {modelos.length > 0 ? modelos.map((m) => (
                      <button
                        key={m}
                        onClick={() => { trocarModelo(m); setShowModelo(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group ${
                          modeloAtual === m 
                            ? 'bg-accent-main text-white shadow-lg shadow-accent-main/20' 
                            : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="truncate flex-1">{m.split('/').pop()}</span>
                        {modeloAtual === m ? (
                          <Zap size={10} className="fill-current text-white" />
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-text-lo group-hover:bg-accent-main transition-colors" />
                        )}
                      </button>
                    )) : (
                      <div className="p-4 text-center">
                        <p className="text-[10px] text-text-muted italic">Nenhum modelo ativo.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-text-lo uppercase tracking-tighter">Temperatura</span>
                      <div className="flex gap-1">
                        {[0.3, 0.7, 1.0].map(t => (
                          <button
                            key={t}
                            onClick={() => trocarTemperatura(t)}
                            className={`w-7 h-5 rounded-md flex items-center justify-center text-[9px] font-black border transition-all ${
                              tempLocal === t 
                                ? 'bg-text-primary text-bg-primary border-text-primary' 
                                : 'text-text-muted border-white/5 hover:border-white/20'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={limpar} className="p-2 hover:bg-danger/10 text-text-muted hover:text-danger rounded-full transition-all active:scale-90" title="Limpar conversa">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Contexto da nota */}
      {notaAtual && (
        <div className="px-4 py-2 border-b border-border-subtle bg-accent-main/5">
          <p className="text-xs text-text-muted">
            Contexto: <span className="text-accent-main font-medium">{notaAtual.titulo}</span>
            <button onClick={() => { setNotaId(null); limpar(); }} className="ml-2 text-text-muted hover:text-danger text-[10px]">[livre]</button>
          </p>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {mensagens.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              {notaAtual
                ? <><p className="text-sm mb-1">Nota &quot;{notaAtual.titulo}&quot; carregada.</p><p className="text-xs">Use os botões abaixo ou digite sua pergunta.</p></>
                : <><p className="text-sm mb-1">Conversa livre.</p><p className="text-xs">Selecione uma nota no menu acima para contexto.</p></>
              }
            </div>
          </div>
        )}
        <AnimatePresence>
          {mensagens.map((msg, idx) => (
            <ChatMessage key={idx} msg={msg} idx={idx} copiadoIdx={copiadoIdx} onCopiar={handleCopiar} onInserir={handleInserir} />
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-secondary border border-border-subtle rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-text-muted">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">{modeloAtual}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Templates de prompt */}
      {notaAtual && (
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-secondary/30">
          <div className="flex flex-wrap gap-1">
            {TEMPLATES.map(tpl => (
              <button key={tpl.id} onClick={() => enviar(`${tpl.prompt} sobre o conteúdo acima.`)} disabled={loading}
                className="px-2 py-1 bg-bg-tertiary border border-border-subtle rounded text-[10px] hover:border-accent-main disabled:opacity-40 cursor-pointer">
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border-subtle space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) enviar(); }}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="flex-1 bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent-main focus:outline-none disabled:opacity-40"
          />
          <button onClick={() => enviar()} disabled={loading || !input.trim()}
            className="p-2.5 bg-accent-main rounded-lg hover:bg-accent-main/90 disabled:opacity-40 cursor-pointer">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          {mensagens.length > 0 && (
            <button onClick={limpar} className="p-2.5 text-text-muted hover:text-danger cursor-pointer" title="Limpar">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted whitespace-nowrap">Temp:</span>
          <input type="range" min="0.1" max="1.0" step="0.1" value={tempLocal}
            onChange={e => { const t = parseFloat(e.target.value); setTempLocal(t); trocarTemperatura(t); }}
            className="flex-1 h-1 accent-accent-main cursor-pointer"
          />
          <span className="text-xs text-text-muted tabular-nums w-8">{tempLocal.toFixed(1)}</span>
        </div>
      </div>

      <AIFallbackModal
        isOpen={fallbackData.isOpen}
        error={fallbackData.error}
        onRetry={() => { setFallbackData({ isOpen: false, error: '' }); enviar(); }}
        onSwitchProvider={(p) => {
          localStorage.setItem('nexomente_ai_provider', p);
          setFallbackData({ isOpen: false, error: '' });
          window.location.reload();
        }}
        onClose={() => setFallbackData({ isOpen: false, error: '' })}
      />
    </div>
  );
}
AIChatPage.propTypes = {
  onNavigate: PropTypes.func,
};

export default AIChatPage;
