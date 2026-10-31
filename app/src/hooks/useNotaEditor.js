/**
 * Hook useNotaEditor — encapsula toda a lógica do editor TipTap e das
 * ações de IA (tags, resumo, flashcards) que viviam em Notas.jsx.
 *
 * Extraído de Notas.jsx (Tarefa 4.1 — SRP / hooks extraction).
 *
 * @returns {{
 *   editor,
 *   aiLoadingTags, aiLoadingResumo, aiLoadingCards,
 *   tagsSugeridas, cardsSugeridos, resumoPreview,
 *   showTagPicker, showCardApprove,
 *   handleTagsOpen, handleResumoOpen, handleCardsOpen, handleChatOpen,
 *   handleTagsConfirm, handleCardsConfirm,
 *   setShowTagPicker, setShowCardApprove,
 *   salvarNota,
 * }}
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlock from "@tiptap/extension-code-block";
import Blockquote from "@tiptap/extension-blockquote";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Mathematics from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";
import * as aiProvider from "../lib/ai/aiProvider";
import { useUIStore } from "../store/useUIStore";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a",
  "img", "span", "div", "hr", "mark", "sub", "sup", "kbd",
  "table", "thead", "tbody", "tr", "th", "td",
  "math", "mi", "mo", "mn", "ms", "mtext", "mrow", "mfrac", "msqrt", "mroot"
];

const ALLOWED_ATTRS = [
  "href", "target", "rel", "src", "alt", "title", "class", "style",
  "data-math", "data-type", "contenteditable", "spellcheck"
];

function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}

export function useNotaEditor({ notaSelecionada, editando, update, addTag, setNotaSelecionada }) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCardApprove, setShowCardApprove] = useState(false);
  const [aiLoadingTags, setAiLoadingTags] = useState(false);
  const [aiLoadingResumo, setAiLoadingResumo] = useState(false);
  const aiLoadingCards = false;
  const [tagsSugeridas, setTagsSugeridas] = useState([]);
  const cardsSugeridos = [];
  const [resumoPreview, setResumoPreview] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const lastLoadedNoteIdRef = useRef(null);
  const lastLoadedContentRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const notaRef = useRef(notaSelecionada);
  const updateRef = useRef(update);
  useEffect(() => {
    notaRef.current = notaSelecionada;
    updateRef.current = update;
  }, [notaSelecionada, update]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, blockquote: false, taskList: false, taskItem: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Comece a escrever... [[nota]] para linkar" }),
      CodeBlock,
      Blockquote,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Mathematics,
    ],
    content: "",
    editable: editando,
    editorProps: {
      attributes: {
        class: "nx-caderno-editor max-w-none focus:outline-none min-h-[420px]",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const nota = notaRef.current;
      if (!nota) return;
      const conteudo = sanitizeHtml(ed.getHTML());
      if (conteudo === lastLoadedContentRef.current) return;
      setNotaSelecionada?.(prev => (prev && prev.id === nota.id ? { ...prev, conteudo } : prev));
      setSaveStatus("saving");
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const atual = notaRef.current;
        if (!atual) return;
        const html = sanitizeHtml(ed.getHTML());
        updateRef.current(atual.id, { titulo: atual.titulo, conteudo: html });
        lastLoadedContentRef.current = html;
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      }, 600);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editando);
  }, [editor, editando]);

  useEffect(() => {
    if (editor && notaSelecionada) {
      const isNewNote = lastLoadedNoteIdRef.current !== notaSelecionada.id;
      if (isNewNote) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        lastLoadedNoteIdRef.current = notaSelecionada.id;
        lastLoadedContentRef.current = notaSelecionada.conteudo || "";
        editor.commands.setContent(notaSelecionada.conteudo || "");
      } else if (
        notaSelecionada.isExternalUpdate &&
        notaSelecionada.conteudo !== lastLoadedContentRef.current
      ) {
        lastLoadedContentRef.current = notaSelecionada.conteudo || "";
        editor.commands.setContent(notaSelecionada.conteudo || "");
      }
    } else if (!notaSelecionada) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      lastLoadedNoteIdRef.current = null;
      lastLoadedContentRef.current = null;
    }
  }, [editor, notaSelecionada]);

  const salvarNota = useCallback(() => {
    if (!notaSelecionada || !editor) return;
    const conteudo = sanitizeHtml(editor.getHTML());
    update(notaSelecionada.id, { titulo: notaSelecionada.titulo, conteudo });
    setNotaSelecionada?.(prev => (prev && prev.id === notaSelecionada.id ? { ...prev, conteudo } : prev));
    lastLoadedContentRef.current = conteudo;
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  }, [notaSelecionada, editor, update, setNotaSelecionada]);

  const salvarImediato = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    salvarNota();
  }, [salvarNota]);

  const handleTagsOpen = useCallback(async () => {
    if (!notaSelecionada) return;
    setAiLoadingTags(true);
    try {
      const cleanContent = (notaSelecionada.conteudo || "").replace(/<[^>]*>/g, "").substring(0, 1500);
      const prompt = "Analise esta nota e sugira até 8 tags em português (minúsculas, hífen para espaço, máximo 2 palavras cada). Responda APENAS com JSON no formato: {\"tags\": [\"tag1\", \"tag2\"]}\nTítulo: " + notaSelecionada.titulo + "\nConteúdo: " + cleanContent;
      const res = await aiProvider.generate(prompt, { max_tokens: 384, temperature: 0.3 });
      let tags = [];
      if (res.success) {
        const textResp = res.response || res.content || "";
        try {
          const parsed = JSON.parse(textResp);
          if (Array.isArray(parsed.tags)) tags = parsed.tags.slice(0, 8);
        } catch {
          const quotes = [...textResp.matchAll(/"([^"]+)"/g)].map(m => m[1]);
          if (quotes.length > 0) tags = quotes.slice(0, 8);
        }
      }
      setTagsSugeridas(tags);
      if (tags.length > 0) setShowTagPicker(true);
    } catch (e) {
      console.error("[AI TAGS] Erro:", e);
    } finally {
      setAiLoadingTags(false);
    }
  }, [notaSelecionada]);

  const handleResumoOpen = useCallback(async () => {
    if (!notaSelecionada || !editor) return;
    setAiLoadingResumo(true);
    try {
      const clean = sanitizeHtml(notaSelecionada.conteudo || "").replace(/<[^>]*>/g, "").substring(0, 3000);
      const prompt = "Resuma o conteúdo abaixo em 3 a 5 frases curtas e objetivas em português:\n\n" + clean + "\n\nResumo:";
      const res = await aiProvider.generate(prompt, { max_tokens: 256, temperature: 0.3 });
      const resumo = (res.success && (res.response || res.content)) ? (res.response || res.content).trim() : "";
      setResumoPreview(resumo);
      const resumoEscapado = resumo.replace(/"/g, '&quot;');
      editor.chain().focus().insertContentAt(0,
        `<blockquote class="ai-resumo"><p>${resumoEscapado}</p></blockquote><p></p>`
      ).run();
      salvarNota();
    } catch (e) {
      console.error("[AI RESUMO] Erro:", e);
    } finally {
      setAiLoadingResumo(false);
    }
  }, [notaSelecionada, editor, salvarNota]);

  const handleCardsOpen = useCallback(() => {
    if (!notaSelecionada) return;
    salvarImediato();
    sessionStorage.setItem('nexomente_forja_texto', notaSelecionada.conteudo || '');
    sessionStorage.setItem('nexomente_flashcards_tab', 'forja');
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'flashcards' }));
    window.dispatchEvent(new CustomEvent('flashcards-tab', { detail: 'forja' }));
  }, [notaSelecionada, salvarImediato]);

  const handleChatOpen = useCallback(() => {
    if (notaSelecionada) {
      salvarImediato();
      useUIStore.getState().setPendingChatNoteId(notaSelecionada.id);
    }
    window.dispatchEvent(new CustomEvent("navigate", { detail: "ai" }));
  }, [notaSelecionada, salvarImediato]);

  const handleTagsConfirm = useCallback((tagsAceitas) => {
    tagsAceitas.forEach(t => addTag(notaSelecionada.id, t));
    setNotaSelecionada(prev => ({ ...prev, tags: [...(prev.tags || []), ...tagsAceitas] }));
    setShowTagPicker(false);
  }, [notaSelecionada, addTag, setNotaSelecionada]);

  const handleCardsConfirm = useCallback(() => {
    setShowCardApprove(false);
  }, []);

  return {
    editor,
    saveStatus,
    lastSavedAt,
    aiLoadingTags, aiLoadingResumo, aiLoadingCards,
    tagsSugeridas, cardsSugeridos, resumoPreview,
    showTagPicker, showCardApprove,
    setShowTagPicker, setShowCardApprove,
    handleTagsOpen, handleResumoOpen, handleCardsOpen, handleChatOpen,
    handleTagsConfirm, handleCardsConfirm,
    salvarNota,
    salvarImediato,
  };
}