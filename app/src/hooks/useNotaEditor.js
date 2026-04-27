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
import { useState, useCallback, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Mathematics from '@tiptap/extension-mathematics';
import 'katex/dist/katex.min.css';
import { suggestTags, summarizeContent, generateFlashcards } from '../lib/ai/lmStudioService';

export function useNotaEditor({ notaSelecionada, editando, update, addTag, setNotaSelecionada }) {
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCardApprove, setShowCardApprove] = useState(false);
  const [aiLoadingTags, setAiLoadingTags] = useState(false);
  const [aiLoadingResumo, setAiLoadingResumo] = useState(false);
  const [aiLoadingCards, setAiLoadingCards] = useState(false);
  const [tagsSugeridas, setTagsSugeridas] = useState([]);
  const [cardsSugeridos, setCardsSugeridos] = useState([]);
  const [resumoPreview, setResumoPreview] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, blockquote: false, taskList: false, taskItem: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Comece a escrever... [[nota]] para linkar' }),
      CodeBlock,
      Blockquote,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Mathematics,
    ],
    content: '',
    editable: editando,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-6 leading-relaxed',
      },
    },
  });

  // Sincroniza conteúdo e modo edição quando a nota muda
  useEffect(() => {
    if (editor && notaSelecionada) {
      editor.commands.setContent(notaSelecionada.conteudo || '');
      editor.setEditable(editando);
    }
  }, [editor, notaSelecionada?.id, editando]);

  const salvarNota = useCallback(() => {
    if (!notaSelecionada || !editor) return;
    const conteudo = editor.getHTML();
    update(notaSelecionada.id, { titulo: notaSelecionada.titulo, conteudo });
  }, [notaSelecionada, editor, update]);

  const handleTagsOpen = useCallback(async () => {
    if (!notaSelecionada) return;
    setAiLoadingTags(true);
    const tags = await suggestTags(notaSelecionada, 8);
    setTagsSugeridas(tags);
    setAiLoadingTags(false);
    if (tags.length > 0) setShowTagPicker(true);
  }, [notaSelecionada]);

  const handleResumoOpen = useCallback(async () => {
    if (!notaSelecionada || !editor) return;
    setAiLoadingResumo(true);
    const resumo = await summarizeContent(notaSelecionada.conteudo || '');
    setResumoPreview(resumo);
    setAiLoadingResumo(false);
    if (resumo && window.confirm(`Resumo gerado:\n\n${resumo}\n\nInserir no topo da nota?`)) {
      editor.chain().focus().insertContentAt(0,
        `<blockquote class="ai-resumo"><p>${resumo.replace(/"/g, '&quot;')}</p></blockquote><p></p>`
      ).run();
      salvarNota();
    }
  }, [notaSelecionada, editor, salvarNota]);

  const handleCardsOpen = useCallback(async () => {
    if (!notaSelecionada) return;
    setAiLoadingCards(true);
    const cards = await generateFlashcards(notaSelecionada, 5);
    setCardsSugeridos(cards);
    setAiLoadingCards(false);
    if (cards.length > 0) setShowCardApprove(true);
  }, [notaSelecionada]);

  const handleChatOpen = useCallback(() => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'ai' }));
  }, []);

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
    aiLoadingTags, aiLoadingResumo, aiLoadingCards,
    tagsSugeridas, cardsSugeridos, resumoPreview,
    showTagPicker, showCardApprove,
    setShowTagPicker, setShowCardApprove,
    handleTagsOpen, handleResumoOpen, handleCardsOpen, handleChatOpen,
    handleTagsConfirm, handleCardsConfirm,
    salvarNota,
  };
}
