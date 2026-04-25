import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Loader2, Copy, Plus, ChevronDown, RefreshCw,
  FileText, BookOpen, Lightbulb, WifiOff, Wifi, X, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIModel, useAIChat } from '../hooks/useAIModel';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import {
  getModel, setModel, getTemperature, setTemperature,
  chat as lmChat, checkLMStudioStatus, generateWithTemplate,
} from '../lib/ai/lmStudioService';
import toast from 'react-hot-toast';

const TEMPLATES = [
  { id: 'resumir', label: 'Resumir', prompt: 'Resuma o conteúdo em 3-5 frases' },
  { id: 'conceitos', label: 'Conceitos', prompt: 'Extraia os 5 conceitos-chave' },
  { id: 'perguntas', label: 'Perguntas', prompt: 'Gere 5 perguntas de revisão' },
  { id: 'critica', label: 'Crítica', prompt: 'Analise criticamente: o que falta?' },
  { id: 'conexoes', label: 'Conexões', prompt: 'Que conexões tem com outras áreas?' },
  { id: 'exemplos', label: 'Exemplos', prompt: 'Gere 3 exemplos práticos' },
  { id: 'analogias', label: 'Analogias', prompt: 'Explique com uma analogia do cotidiano' },
];

const tipoIcons = { nota: FileText, livro: BookOpen, ideia: Lightbulb };

export default function AIChatPage({ onNavigate }) {
  const notas = useNotes();
  const { create: createCard } = useFlashcards();
  const { status, modelos, modeloAtual, temperatura, loading: statusLoading, trocarModelo, trocarTemperatura, verificar } = useAIModel();

  const [notaId, setNotaId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempLocal, setTempLocal] = useState(getTemperature());
  const [showModelo, setShowModelo] = useState(false);
  const [copiadoIdx, setCopiadoIdx] = useState(null);

  const { mensagens, adicionar, limpar } = useAIChat(notaId);
  const notaSelecionada = notaId ? notas.getById(notaId) : null;
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (status === 'offline') verificar();
  }, [status]);

  const notaAtual = notaSelecionada;

  const buildMessages = useCallback((userPrompt) => {
    const msgs = [];
    if (notaAtual) {
      msgs.push({
        role: 'system',
        content: `Você é um assistente de estudo. Contexto: Nota "${notaAtual.titulo}".\nConteúdo:\n${(notaAtual.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 2000)}`,
      });
    } else {
      msgs.push({
        role: 'system',
        content: 'Você é um assistente de estudo prestativo. Responda em português.',
      });
    }
    mensagens.slice(-20).forEach(m => {
      msgs.push({ role: m.role, content: m.texto });
    });
    if (userPrompt) {
      msgs.push({ role: 'user', content: userPrompt });
    }
    return msgs;
  }, [notaAtual, mensagens]);

  const enviar = async (promptExtra) => {
    const prompt = promptExtra || input.trim();
    if (!prompt && !promptExtra) return;

    setLoading(true);
    const userTexto = promptExtra ? promptExtra : prompt;
    if (!promptExtra) setInput('');

    adicionar('user', userTexto);

    try {
      const msgs = buildMessages(userTexto);
      const res = await lmChat(msgs, {
        model: modeloAtual,
        temperature: tempLocal,
        max_tokens: 1024,
      });

      if (res.success) {
        adicionar('assistant', res.response);
      } else {
        adicionar('assistant', `Erro: ${res.error}`);
      }
    } catch (e) {
      adicionar('assistant', `Erro: ${e.message}`);
    }

    setLoading(false);
  };

  const handleTemplate = (tpl) => {
    if (!notaAtual) {
      toast.error('Selecione uma nota para usar modelos');
      return;
    }
    enviar(`${tpl.prompt} sobre o conteúdo acima.`);
  };

  const handleCopiar = (texto, idx) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 2000);
    });
  };

  const handleInserir = (texto) => {
    if (!notaAtual) {
      toast.error('Nenhuma nota aberta');
      return;
    }
    onNavigate?.('notes');
    toast.success('Resposta copiada — cole no editor');
  };

  const handleModeloChange = (m) => {
    trocarModelo(m);
    setShowModelo(false);
  };

  const handleTempChange = (t) => {
    setTempLocal(t);
    trocarTemperatura(t);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-secondary/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent-light" />
          <span className="font-semibold text-text-primary">Chat IA</span>
          {status === 'online' ? (
            <Wifi size={12} className="text-success" />
          ) : (
            <WifiOff size={12} className="text-text-muted" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={notaId || ''}
            onChange={e => {
              setNotaId(e.target.value || null);
              limpar();
            }}
            className="bg-bg-tertiary border border-border-subtle rounded px-2 py-1 text-xs max-w-[160px] cursor-pointer"
          >
            <option value="">Conversa livre</option>
            {notas.notas.map(n => (
              <option key={n.id} value={n.id}>{n.titulo}</option>
            ))}
          </select>

          <div className="relative">
            <button
              onClick={() => setShowModelo(!showModelo)}
              className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main cursor-pointer max-w-[140px] truncate"
            >
              {modeloAtual.split('/').pop()}
              <ChevronDown size={10} />
            </button>
            {showModelo && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModelo(false)} />
                <div className="absolute right-0 top-full mt-1 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg z-50 w-56 max-h-48 overflow-auto">
                  {modelos.map(m => (
                    <button
                      key={m}
                      onClick={() => handleModeloChange(m)}
                      className={`w-full px-3 py-1.5 text-xs text-left hover:bg-bg-tertiary cursor-pointer truncate ${
                        m === modeloAtual ? 'bg-accent-main/20 text-accent-main' : 'text-text-secondary'
                      }`}
                    >
                      {m.split('/').pop()}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={verificar}
            className="p-1.5 text-text-muted hover:text-accent-main cursor-pointer"
            title="Verificar conexão"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {notaAtual && (
        <div className="px-4 py-2 border-b border-border-subtle bg-accent-main/5">
          <p className="text-xs text-text-muted">
            Contexto: <span className="text-accent-main font-medium">{notaAtual.titulo}</span>
            <button
              onClick={() => { setNotaId(null); limpar(); }}
              className="ml-2 text-text-muted hover:text-danger text-[10px]"
            >
              [livre]
            </button>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {mensagens.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              {notaAtual ? (
                <>
                  <p className="text-sm mb-1">Nota "{notaAtual.titulo}" carregada.</p>
                  <p className="text-xs">Use os botões abaixo ou digite sua pergunta.</p>
                </>
              ) : (
                <>
                  <p className="text-sm mb-1">Conversa livre.</p>
                  <p className="text-xs">Selecione uma nota no menu acima para contexto.</p>
                </>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {mensagens.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-accent-main/20 border border-accent-main/30 text-text-primary'
                  : 'bg-bg-secondary border border-border-subtle text-text-primary'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.texto}</p>
                {msg.role === 'assistant' && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => handleCopiar(msg.texto, idx)}
                      className="px-2 py-1 bg-bg-tertiary rounded text-[10px] hover:border-accent-main cursor-pointer flex items-center gap-1"
                    >
                      <Copy size={10} />
                      {copiadoIdx === idx ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => handleInserir(msg.texto)}
                      className="px-2 py-1 bg-bg-tertiary rounded text-[10px] hover:border-accent-main cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={10} /> Inserir
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
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

      {notaAtual && (
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-secondary/30">
          <div className="flex flex-wrap gap-1">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => handleTemplate(tpl)}
                disabled={loading}
                className="px-2 py-1 bg-bg-tertiary border border-border-subtle rounded text-[10px] hover:border-accent-main disabled:opacity-40 cursor-pointer"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border-subtle space-y-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) enviar(); }}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="flex-1 bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-accent-main focus:outline-none disabled:opacity-40"
          />
          <button
            onClick={() => enviar()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-accent-main rounded-lg hover:bg-accent-main/90 disabled:opacity-40 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          {mensagens.length > 0 && (
            <button
              onClick={limpar}
              className="p-2.5 text-text-muted hover:text-danger cursor-pointer"
              title="Limpar conversa"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted whitespace-nowrap">Temp:</span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={tempLocal}
            onChange={e => handleTempChange(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-accent-main cursor-pointer"
          />
          <span className="text-xs text-text-muted tabular-nums w-8">{tempLocal.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}