/**
 * AIChatPage — Alta Fidelidade Claude.ai.
 * Implementação de Popovers integrados para Contexto e Modelos.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Send, Loader2, RotateCcw, Share2, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAIModel, useAIChat } from "../hooks/useAIModel";
import { useNotes } from "../hooks/useNotes";
import * as aiProvider from "../lib/ai/aiProvider";
import { useUIStore } from "../store/useUIStore";
import toast from "react-hot-toast";
import ChatMessage from "../components/ai/ChatMessage";
import ModelSelectorPopover from "../components/ai/ModelSelectorPopover";
import NoteAttachPopover from "../components/ai/NoteAttachPopover";

const TEMPLATES = [
  { id: "escrever", label: "Escrever", prompt: "Escreva um texto sobre..." },
  { id: "estrategias", label: "Estratégias", prompt: "Crie uma estratégia de estudo para..." },
  { id: "aprender", label: "Aprender", prompt: "Me ensine sobre..." },
  { id: "codigo", label: "Código", prompt: "Explique o código..." },
];

/**
 * Escapa conteúdo para injeção segura em prompts LLM.
 * Remove tags HTML e escapa caracteres que podem quebrar o prompt.
 */
function escapeForPrompt(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "") // Remove tags HTML
    .replace(/\\/g, "\\\\") // Escapa backslash primeiro
    .replace(/`/g, "\\`") // Escapa backticks
    .replace(/\$/g, "\\$") // Escapa $ (template literals)
    .replace(/"/g, '\\"') // Escapa aspas duplas
    .replace(/'/g, "\\'") // Escapa aspas simples
    .trim();
}

export default function AIChatPage({ onNavigate }) {
  const { notas, update: updateNota, getById } = useNotes();
  const { modelos, modeloAtual, trocarModelo, temperatura, trocarTemperatura } = useAIModel();
  const userName = useUIStore((s) => s.userName);
  const pendingChatNoteId = useUIStore((s) => s.pendingChatNoteId);
  const setPendingChatNoteId = useUIStore((s) => s.setPendingChatNoteId);
  const setPendingNoteAction = useUIStore((s) => s.setPendingNoteAction);

  const hour = new Date().getHours();
  const saudacao = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const nomeExibicao = (userName && userName !== "Visitante") ? userName : "Bruno";

  const [notaId, setNotaId] = useState(() => pendingChatNoteId || null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumindoNaNota, setResumindoNaNota] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [buscaNota, setBuscaNota] = useState("");
  const [copiadoIdx, setCopiadoIdx] = useState(null);

  useEffect(() => {
    if (!pendingChatNoteId) return;
    const idToLoad = pendingChatNoteId;
    setPendingChatNoteId(null);
    queueMicrotask(() => {
      setNotaId(idToLoad);
    });
    const target = getById(idToLoad) || notas.find((n) => n.id === idToLoad);
    if (target) {
      toast.success(`Nota "${target.titulo}" conectada como contexto do chat!`);
    }
  }, [pendingChatNoteId, setPendingChatNoteId, getById, notas]);

  const { mensagens, adicionar, limpar } = useAIChat(notaId);
  const notaAtual = notaId ? (getById(notaId) || notas.find((n) => n.id === notaId)) : null;
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const gravarResumoConversaNaNota = useCallback((resumoTexto, targetNoteId) => {
    const idAlvo = targetNoteId || notaId;
    if (!idAlvo || !resumoTexto) return false;
    const notaAlvo = getById(idAlvo) || notas.find((n) => n.id === idAlvo);
    if (!notaAlvo) return false;

    const safeResumo = escapeForPrompt(resumoTexto);
    const htmlResumo = `<hr><blockquote class="ai-chat-summary"><p><strong>💬 Resumo da Conversa IA:</strong> ${safeResumo.replace(/\n+/g, "<br>")}</p></blockquote>`;
    const conteudoBase = notaAlvo.conteudo || "";
    const regexBlocoExistente = /(<hr>\s*)?<blockquote class="ai-chat-summary">[\s\S]*?<\/blockquote>/i;
    const novoConteudo = regexBlocoExistente.test(conteudoBase)
      ? conteudoBase.replace(regexBlocoExistente, htmlResumo)
      : `${conteudoBase}${htmlResumo}`;

    updateNota(idAlvo, {
      titulo: notaAlvo.titulo,
      conteudo: novoConteudo,
      resumo_ia: resumoTexto,
    });
    return true;
  }, [notaId, getById, notas, updateNota]);

  const handleSalvarResumoNaNota = useCallback(async (voltarParaNota = false) => {
    if (!notaAtual || mensagens.length === 0) return;
    setResumindoNaNota(true);
    try {
      const transcricao = mensagens
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Usuário" : "IA"}: ${m.texto}`)
        .join("\n");

      const promptResumo = `Resuma de forma extremamente concisa (em 2 a 4 frases diretas em português) os principais aprendizados e conclusões desta conversa sobre a nota "${escapeForPrompt(notaAtual.titulo)}":\n\n${transcricao}\n\nResumo conciso:`;

      const res = await aiProvider.generate(promptResumo, {
        temperature: 0.3,
        max_tokens: 256,
      });

      const ultimaRespostaIA = [...mensagens].reverse().find((m) => m.role === "assistant")?.texto || "";
      const textoResumo = (res.success && (res.response || res.content))
        ? (res.response || res.content).trim()
        : ultimaRespostaIA.substring(0, 300);

      if (textoResumo) {
        gravarResumoConversaNaNota(textoResumo, notaAtual.id);
        toast.success(`Resumo da conversa adicionado à nota "${notaAtual.titulo}"!`);
      }

      if (voltarParaNota) {
        setPendingNoteAction({ noteId: notaAtual.id });
        if (onNavigate) onNavigate("notes");
        else window.dispatchEvent(new CustomEvent("navigate", { detail: "notes" }));
      }
    } catch (err) {
      toast.error(`Erro ao resumir conversa: ${err.message}`);
    } finally {
      setResumindoNaNota(false);
    }
  }, [notaAtual, mensagens, gravarResumoConversaNaNota, setPendingNoteAction, onNavigate]);

  const handleLimpar = () => {
    if (mensagens.length === 0) return;
    limpar();
    toast.success("Conversa limpa com sucesso");
  };

  const handleExportar = () => {
    if (mensagens.length === 0) return;
    const markdown = mensagens
      .map((m) => `**${m.role === "user" ? "Você" : "Assistente NexoMente"}**:\n${m.texto}\n`)
      .join("\n---\n\n");
    navigator.clipboard.writeText(markdown);
    toast.success("Transcrição copiada em Markdown!");
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelMenu(false);
      setShowAttachMenu(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const buildMessages = useCallback((userPrompt) => {
    const sys = notaAtual
      ? `Você é um assistente de estudo conectado à nota "${escapeForPrompt(notaAtual.titulo)}". Use o conteúdo da nota abaixo como contexto principal e responda em português de forma clara e objetiva.\n\nConteúdo da Nota:\n${escapeForPrompt(notaAtual.conteudo || "").substring(0, 4000)}`
      : "Você é um assistente de estudo prestativo. Responda em português.";

    const msgs = [{ role: "system", content: sys }];
    mensagens.slice(-10).forEach((m) => msgs.push({ role: m.role, content: m.texto }));
    if (userPrompt) msgs.push({ role: "user", content: userPrompt });
    return msgs;
  }, [notaAtual, mensagens]);

  const enviar = async (promptExtra) => {
    const prompt = promptExtra || input.trim();
    if (!prompt || loading) return;

    setLoading(true);
    if (!promptExtra) setInput("");
    adicionar("user", prompt);

    try {
      const instrucaoRaciocinio = temperatura < 0.5
        ? "\n\n(Instrução de Pensamento Adaptativo: Raciocine passo a passo de forma lógica e estruturada antes de responder. Seja extremamente preciso.)"
        : "";

      const res = await aiProvider.chat(buildMessages(prompt + instrucaoRaciocinio), {
        temperature: temperatura,
        max_tokens: 1024,
      });
      const respostaTexto = res.success ? res.response : res.error;
      adicionar("assistant", respostaTexto, res.code);

      if (res.success && notaAtual && respostaTexto) {
        const historicoRecente = [
          ...mensagens.slice(-6).map((m) => `${m.role === "user" ? "Usuário" : "IA"}: ${m.texto}`),
          `Usuário: ${prompt}`,
          `IA: ${respostaTexto}`,
        ].join("\n");

        aiProvider.generate(
          `Resuma em 1 ou 2 frases curtas e diretas os pontos-chave desta conversa sobre a nota "${escapeForPrompt(notaAtual.titulo)}":\n\n${historicoRecente}\n\nResumo conciso:`,
          { temperature: 0.3, max_tokens: 180 }
        ).then((sumRes) => {
          const sumText = (sumRes?.success && (sumRes.response || sumRes.content))
            ? (sumRes.response || sumRes.content).trim()
            : respostaTexto.split("\n").slice(0, 2).join(" ").substring(0, 240);
          if (sumText) {
            gravarResumoConversaNaNota(sumText, notaAtual.id);
          }
        }).catch(() => {});
      }
    } catch (e) {
      adicionar("assistant", e.message, "ERROR");
    }
    setLoading(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const notasFiltradas = notas.filter((n) =>
    n.titulo.toLowerCase().includes(buscaNota.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-nx-void font-ui overflow-hidden">
      {(mensagens.length > 0 || notaAtual) && (
        <div className="px-4 py-2 border-b border-nx-border bg-nx-surface/40 flex items-center justify-between text-xs text-text-lo shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {notaAtual ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-accent-main/10 border border-accent-main/30 text-accent-main">
                <FileText size={12} />
                <span className="font-semibold">Contexto da Nota: {notaAtual.titulo}</span>
              </div>
            ) : (
              <span className="font-medium text-text-lo/60">Conversa Livre</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notaAtual && (
              <>
                {mensagens.length > 0 && (
                  <button
                    onClick={() => handleSalvarResumoNaNota(true)}
                    disabled={resumindoNaNota || loading}
                    title="Gerar resumo conciso da conversa, salvar no final da nota e voltar para o editor"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-main text-white hover:bg-accent-main/90 disabled:opacity-50 font-semibold transition-all cursor-pointer"
                  >
                    {resumindoNaNota ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span className="text-[11px]">Concluir & Salvar Resumo na Nota</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setPendingNoteAction({ noteId: notaAtual.id });
                    if (onNavigate) onNavigate("notes");
                    else window.dispatchEvent(new CustomEvent("navigate", { detail: "notes" }));
                  }}
                  title="Voltar para a nota no editor"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-text-hi text-text-lo/70 transition-all cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span className="text-[11px]">Voltar à Nota</span>
                </button>
              </>
            )}
            {mensagens.length > 0 && (
              <>
                <button
                  onClick={handleExportar}
                  title="Copiar conversa em Markdown"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-text-hi text-text-lo/70 transition-all cursor-pointer"
                >
                  <Share2 size={12} />
                  <span className="text-[11px]">Exportar</span>
                </button>
                <button
                  onClick={handleLimpar}
                  title="Limpar histórico"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-text-lo/70 transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span className="text-[11px]">Limpar</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto flex flex-col chat-scroll-area relative">
        {mensagens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 md:mb-12 text-center w-full"
            >
              <h1 className="text-xl md:text-nx-2xl font-display text-nx-bright tracking-tight leading-tight mb-2 px-6">
                {saudacao}, {nomeExibicao}
              </h1>
            </motion.div>

            <div className="w-full max-w-2xl relative px-4 md:px-0">
              <div className="bg-nx-surface/30 border border-nx-border rounded-nx-md p-3 md:p-4 pb-2 md:pb-3 shadow-2xl transition-all focus-within:bg-nx-surface/50">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
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
                        input.trim() ? "bg-nx-primary text-white" : "text-nx-dim/10 cursor-not-allowed"
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-4 md:mt-6 px-2">
                {TEMPLATES.map((tpl) => (
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
                  onInserir={(texto) => {
                    if (notaAtual) {
                      gravarResumoConversaNaNota(texto, notaAtual.id);
                      setPendingNoteAction({ noteId: notaAtual.id });
                      toast.success(`Inserido na nota "${notaAtual.titulo}"!`);
                    } else {
                      navigator.clipboard.writeText(texto);
                      toast.success("Conteúdo copiado e pronto para colar na nota");
                    }
                    if (onNavigate) onNavigate("notes");
                    else window.dispatchEvent(new CustomEvent("navigate", { detail: "notes" }));
                  }}
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
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  placeholder="Responder..."
                  rows={1}
                  className="flex-1 bg-transparent border-none p-2 text-sm text-text-hi placeholder-text-lo/30 focus:outline-none focus:ring-0 resize-none min-h-[40px] max-h-40 overflow-y-auto"
                />
                <button
                  onClick={() => enviar()}
                  disabled={loading || !input.trim()}
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() ? "bg-accent-main text-white shadow-lg shadow-accent-main/20" : "bg-white/5 text-text-lo/20"
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
