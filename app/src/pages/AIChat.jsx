/**
 * AIChatPage — Alta Fidelidade Claude.ai.
 * Implementação de Popovers integrados para Contexto e Modelos.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Plus, Send, Loader2, ChevronDown, 
  Trash2, Bot, Check, FileText,
  Search
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAIModel, useAIChat } from '../hooks/useAIModel';
import { useNotes } from '../hooks/useNotes';
import * as aiProvider from '../lib/ai/aiProvider';
import toast from 'react-hot-toast';
import ChatMessage from '../components/ai/ChatMessage';

const TEMPLATES = [
  { id: 'escrever',   label: 'Escrever',    prompt: 'Escreva um texto sobre...' },
  { id: 'estrategias', label: 'Estratégias', prompt: 'Crie uma estratégia de estudo para...' },
  { id: 'aprender',   label: 'Aprender',    prompt: 'Me ensine sobre...' },
  { id: 'codigo',     label: 'Código',      prompt: 'Explique o código...' },
];

export default function AIChatPage({ onNavigate }) {
  const { notas } = useNotes();
  const { status, modelos, modeloAtual, trocarModelo, tempLocal, trocarTemperatura } = useAIModel();
  
  const [notaId, setNotaId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [buscaNota, setBuscaNota] = useState('');
  const [copiadoIdx, setCopiadoIdx] = useState(null);

  const { mensagens, adicionar, limpar } = useAIChat(notaId);
  const notaAtual = notaId ? notas.find(n => n.id === notaId) : null;
  const bottomRef = useRef(null);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelMenu(false);
      setShowAttachMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);

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
      const res = await aiProvider.chat(buildMessages(prompt), { 
        model: modeloAtual, 
        temperature: tempLocal, 
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
    <div className="flex flex-col h-full bg-bg-primary font-sans">
      {/* Header Minimalista (Claude Style) */}
      <div className="h-14 px-8 flex items-center justify-between border-b border-white/[0.03] bg-bg-primary sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
            <Bot size={14} className="text-text-lo/40" />
          </div>
          <span className="text-sm font-medium text-text-lo/60">NexoMente AI</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); limpar(); }}
            className="p-2 text-text-lo/40 hover:text-danger transition-colors cursor-pointer rounded-lg hover:bg-white/5"
            title="Novo Chat"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 overflow-auto flex flex-col scrollbar-none relative">
        {mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            {/* Saudação Claude */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 text-center"
            >
              <h1 className="text-[44px] font-serif text-text-hi tracking-tight leading-tight mb-2">Boa noite, bruno</h1>
            </motion.div>

            <div className="w-full max-w-2xl relative">
              {/* Hub de Input Alta Fidelidade */}
              <div className="bg-bg-secondary/30 border border-white/5 rounded-[1.5rem] p-4 pb-3 shadow-2xl transition-all focus-within:bg-bg-secondary/50">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Como posso ajudar você hoje?"
                  className="w-full bg-transparent border-none p-2 text-lg text-text-hi placeholder-text-lo/20 focus:outline-none focus:ring-0 resize-none min-h-[50px] leading-relaxed"
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {/* Botão de Anexo (+) */}
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); setShowModelMenu(false); }}
                        className={`p-2 rounded-lg transition-all ${showAttachMenu ? 'bg-white/10 text-text-hi' : 'text-text-lo/40 hover:bg-white/5 hover:text-text-hi'}`}
                      >
                        <Plus size={20} />
                      </button>

                      <AnimatePresence>
                        {showAttachMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-3 w-72 bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-2 relative">
                              <Search size={12} className="absolute left-4 top-4 text-text-lo/40" />
                              <input 
                                autoFocus
                                placeholder="Buscar nota para anexo..."
                                value={buscaNota}
                                onChange={e => setBuscaNota(e.target.value)}
                                className="w-full bg-white/5 border-none rounded-xl py-2 pl-8 pr-4 text-xs text-text-hi placeholder-text-lo/20 focus:ring-0"
                              />
                            </div>
                            <div className="mt-1 flex flex-col gap-0.5">
                              {notasFiltradas.map(n => (
                                <button
                                  key={n.id}
                                  onClick={() => { setNotaId(n.id); setShowAttachMenu(false); }}
                                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs text-text-lo hover:bg-white/5 hover:text-text-hi transition-all group"
                                >
                                  <FileText size={14} className="opacity-40 group-hover:opacity-100" />
                                  <span className="truncate flex-1 text-left">{n.titulo}</span>
                                  {notaId === n.id && <Check size={12} className="text-accent-main" />}
                                </button>
                              ))}
                              {notasFiltradas.length === 0 && (
                                <p className="p-4 text-[10px] text-center text-text-lo/40 uppercase tracking-widest">Nenhuma nota encontrada</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {notaId && (
                      <div className="flex items-center gap-2 bg-accent-main/10 text-accent-main px-3 py-1.5 rounded-full text-[11px] font-bold">
                        <FileText size={12} />
                        {notaAtual?.titulo.substring(0, 15)}...
                        <button onClick={() => setNotaId(null)} className="ml-1 hover:text-white"><Plus size={12} className="rotate-45" /></button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Seletor de Modelo Estilo Claude */}
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu); setShowAttachMenu(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium text-text-lo/60 hover:bg-white/5 transition-all group"
                      >
                        <span className="group-hover:text-text-hi transition-colors">{modeloAtual.split('/').pop()}</span>
                        <ChevronDown size={14} className={`opacity-40 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showModelMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full right-0 mb-3 w-72 bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-3 flex flex-col gap-1">
                              {modelos.map(m => {
                                const isCurrent = modeloAtual === m;
                                const name = m.split('/').pop();
                                return (
                                  <button
                                    key={m}
                                    onClick={() => { trocarModelo(m); setShowModelMenu(false); }}
                                    className={`w-full p-3 rounded-xl text-left transition-all group ${isCurrent ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-xs font-bold ${isCurrent ? 'text-text-hi' : 'text-text-lo/60'}`}>{name}</span>
                                      {isCurrent && <Check size={12} className="text-accent-main" />}
                                    </div>
                                    <p className="text-[10px] text-text-lo/30 leading-normal">
                                      {name.includes('7b') || name.includes('8b') ? 'Otimizado para respostas rápidas.' : 'Modelo avançado para tarefas complexas.'}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="mt-1 border-t border-white/5 p-3 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-text-hi">Pensamento adaptativo</span>
                                <span className="text-[9px] text-text-lo/40">Raciocina para tarefas complexas</span>
                              </div>
                              <button 
                                onClick={() => trocarTemperatura(tempLocal === 0.7 ? 0.3 : 0.7)}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors ${tempLocal < 0.5 ? 'bg-accent-main' : 'bg-white/10'}`}
                              >
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${tempLocal < 0.5 ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={() => enviar()} 
                      disabled={loading || !input.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        input.trim() ? 'bg-accent-main text-white' : 'text-text-lo/10 cursor-not-allowed'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Sugerida */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {TEMPLATES.map(tpl => (
                  <button 
                    key={tpl.id} 
                    onClick={() => enviar(tpl.prompt)}
                    className="px-4 py-2 border border-white/[0.05] rounded-full text-[12px] font-medium text-text-lo/60 hover:text-text-hi hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-10 max-w-3xl mx-auto w-full pb-32">
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

      {/* Input Flutuante Sticky (Mesma Estética) */}
      {mensagens.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent z-30">
          <div className="max-w-3xl mx-auto w-full relative">
            <div className="bg-bg-secondary border border-white/5 rounded-[1.5rem] p-3 shadow-2xl flex flex-col gap-2">
              <div className="flex items-end gap-3 px-1">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Responder ao NexoMente..."
                  rows={1}
                  className="flex-1 bg-transparent border-none p-2 text-sm text-text-hi placeholder-text-lo/20 focus:outline-none focus:ring-0 resize-none min-h-[40px]"
                />
                <button 
                  onClick={() => enviar()} 
                  disabled={loading || !input.trim()}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() ? 'bg-accent-main text-white' : 'bg-white/5 text-text-lo/10'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-2 px-1">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
                    className="p-1.5 rounded-lg text-text-lo/40 hover:bg-white/5 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                  <div className="h-3 w-[1px] bg-white/5" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu); }}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold text-text-lo/40 hover:bg-white/5 transition-all"
                  >
                    {modeloAtual.split('/').pop()}
                    <ChevronDown size={10} />
                  </button>
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
