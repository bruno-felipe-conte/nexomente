import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { FileText, BookOpen, Lightbulb, Calendar, Bookmark, Search, Trash2, Plus, BookMarked } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditorToolbar from '../components/editor/EditorToolbar';
import BibliotecaPanel from '../components/editor/BibliotecaPanel';
import NoteMetadata from '../components/editor/NoteMetadata';
import TagInput from '../components/editor/TagInput';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import AIPanel from '../components/editor/AIPanel';
import AIBar from '../components/editor/AIBar';
import TagPickerModal from '../components/editor/TagPickerModal';
import FlashcardApproveModal from '../components/editor/FlashcardApproveModal';
import { suggestTags, summarizeContent, generateFlashcards, getModel } from '../lib/ai/lmStudioService';

const tipoIcons = {
  nota: FileText,
  livro: BookOpen,
  ideia: Lightbulb,
  diario: Calendar,
  biblia: Bookmark,
  estudo: BookMarked,
  projeto: BookMarked,
  referencia: FileText,
};

const tipoCores = {
  nota: '#6C63FF',
  livro: '#8B5CF6',
  ideia: '#EC4899',
  diario: '#10B981',
  biblia: '#F59E0B',
  estudo: '#3B82F6',
  projeto: '#3B82F6',
  referencia: '#9CA3AF',
};

export default function NotasPage() {
  const { notas, create, update, remove, search, getById, addTag, removeTag } = useNotes();
  const { create: createCard } = useFlashcards();
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [editando, setEditando] = useState(false);
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const [focoMode, setFocoMode] = useState(false);
  const [mostrandoTags, setMostrandoTags] = useState(false);
  const [mostrandoMeta, setMostrandoMeta] = useState(false);
  const [mostrandoAI, setMostrandoAI] = useState(false);
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

  useEffect(() => {
    if (editor && notaSelecionada) {
      editor.commands.setContent(notaSelecionada.conteudo || '');
      editor.setEditable(editando);
    }
  }, [editor, notaSelecionada?.id, editando]);

  const notasFiltradas = useMemo(() => {
    if (!busca) return notas;
    return search(busca);
  }, [notas, busca, search]);

  const criarNota = (tipo = 'nota') => {
    const id = create({ titulo: 'Nova Nota', tipo, pasta_id: 'inbox', status: 'inbox' });
    const nova = getById(id);
    setNotaSelecionada(nova);
    setEditando(true);
    setCriando(true);
  };

  const salvarNota = useCallback(() => {
    if (!notaSelecionada || !editor) return;
    const conteudo = editor.getHTML();
    update(notaSelecionada.id, { titulo: notaSelecionada.titulo, conteudo });
    setEditando(false);
    setCriando(false);
  }, [notaSelecionada, editor, update]);

  const excluirNota = (id) => {
    remove(id);
    if (notaSelecionada?.id === id) {
      setNotaSelecionada(null);
      setEditando(false);
    }
  };

  const toggleFoco = () => {
    setFocoMode(prev => !prev);
  };

  const handleTagsOpen = async () => {
    if (!notaSelecionada) return;
    setAiLoadingTags(true);
    const tags = await suggestTags(notaSelecionada, 8);
    setTagsSugeridas(tags);
    setAiLoadingTags(false);
    if (tags.length > 0) setShowTagPicker(true);
  };

  const handleResumoOpen = async () => {
    if (!notaSelecionada || !editor) return;
    setAiLoadingResumo(true);
    const resumo = await summarizeContent(notaSelecionada.conteudo || '');
    setResumoPreview(resumo);
    setAiLoadingResumo(false);
    if (resumo) {
      if (window.confirm(`Resumo gerado:\n\n${resumo}\n\nInserir no topo da nota?`)) {
        editor.chain().focus().setParagraph().insertContentAt(0, `<blockquote class="ai-resumo"><p>${resumo.replace(/"/g, '&quot;')}</p></blockquote><p></p>`).run();
        salvarNota();
      }
    }
  };

  const handleCardsOpen = async () => {
    if (!notaSelecionada) return;
    setAiLoadingCards(true);
    const cards = await generateFlashcards(notaSelecionada, 5);
    setCardsSugeridos(cards);
    setAiLoadingCards(false);
    if (cards.length > 0) setShowCardApprove(true);
  };

  const handleChatOpen = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'ai' }));
  };

  const handleTagsConfirm = (tagsAceitas) => {
    tagsAceitas.forEach(t => addTag(notaSelecionada.id, t));
    setNotaSelecionada(prev => ({ ...prev, tags: [...(prev.tags || []), ...tagsAceitas] }));
    setShowTagPicker(false);
  };

  const handleCardsConfirm = (cardsAceitos) => {
    setShowCardApprove(false);
  };

  return (
    <div className={`flex h-full ${focoMode ? 'bg-bg-primary' : ''}`}>
      <AnimatePresence>
        {!focoMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border-subtle flex flex-col bg-bg-secondary overflow-hidden"
          >
            <div className="p-3 border-b border-border-subtle">
              <div className="flex items-center gap-2 mb-3">
                <Search size={14} className="text-text-muted flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar notas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-2 py-1 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => criarNota('nota')}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent-main rounded text-xs font-medium hover:bg-accent-main/90 transition-colors cursor-pointer"
                >
                  <Plus size={12} /> Nota
                </button>
                <button
                  onClick={() => criarNota('livro')}
                  className="px-2 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main transition-colors cursor-pointer"
                  title="Novo Livro"
                >
                  <BookOpen size={12} />
                </button>
                <button
                  onClick={() => criarNota('ideia')}
                  className="px-2 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs hover:border-accent-main transition-colors cursor-pointer"
                  title="Nova Ideia"
                >
                  <Lightbulb size={12} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {notasFiltradas.length === 0 ? (
                <div className="p-4 text-center text-text-muted">
                  <FileText size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Nenhuma nota</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {notasFiltradas.map(nota => {
                    const Icon = tipoIcons[nota.tipo] || FileText;
                    const cor = tipoCores[nota.tipo] || '#6C63FF';
                    const preview = nota.conteudo?.replace(/<[^>]*>/g, '').substring(0, 60);
                    return (
                      <button
                        key={nota.id}
                        onClick={() => { setNotaSelecionada(nota); setEditando(false); }}
                        className={`w-full p-3 text-left hover:bg-bg-tertiary transition-colors cursor-pointer ${
                          notaSelecionada?.id === nota.id ? 'bg-bg-tertiary border-l-2' : ''
                        }`}
                        style={{ borderLeftColor: notaSelecionada?.id === nota.id ? cor : 'transparent' }}
                      >
                        <div className="flex items-start gap-2">
                          <Icon size={14} style={{ color: cor }} className="flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-text-primary truncate">{nota.titulo}</p>
                            {preview && (
                              <p className="text-xs text-text-muted truncate mt-0.5">{preview}...</p>
                            )}
                            {nota.tags?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {nota.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-bg-tertiary text-text-muted">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!focoMode && (
        <BibliotecaPanel
          pastas={[]}
          notas={notas}
          notaSelecionada={notaSelecionada}
          onMoverNota={(notaId, pastaId) => {
            update(notaId, { pasta_id: pastaId });
            if (notaSelecionada?.id === notaId) {
              const atualizada = getById(notaId);
              setNotaSelecionada(atualizada);
            }
          }}
          onCriarPasta={() => {}}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {notaSelecionada ? (
          <>
            {!focoMode && (
              <div className="p-3 border-b border-border-subtle flex items-center gap-2 bg-bg-secondary/50">
                <input
                  type="text"
                  value={notaSelecionada.titulo}
                  onChange={(e) => setNotaSelecionada({ ...notaSelecionada, titulo: e.target.value })}
                  className="flex-1 bg-transparent text-lg font-bold text-text-primary focus:outline-none"
                  placeholder="Título da nota"
                />
                <button
                  onClick={() => setMostrandoAI(prev => !prev)}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                    mostrandoAI
                      ? 'bg-accent-main text-white border-accent-main'
                      : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-accent-main'
                  }`}
                >
                  IA
                </button>
                <button
                  onClick={() => setMostrandoMeta(prev => !prev)}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                    mostrandoMeta
                      ? 'bg-accent-main text-white border-accent-main'
                      : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-accent-main'
                  }`}
                >
                  Info
                </button>
                <button
                  onClick={() => setMostrandoTags(prev => !prev)}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                    mostrandoTags
                      ? 'bg-accent-main text-white border-accent-main'
                      : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-accent-main'
                  }`}
                >
                  Tags
                </button>
                {editando ? (
                  <button
                    onClick={salvarNota}
                    className="px-3 py-1.5 bg-success rounded text-xs font-medium hover:bg-success/90 transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                ) : (
                  <button
                    onClick={() => setEditando(true)}
                    className="px-3 py-1.5 bg-accent-main rounded text-xs font-medium hover:bg-accent-main/90 transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => excluirNota(notaSelecionada.id)}
                  className="p-1.5 text-text-muted hover:text-danger transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            {mostrandoTags && (
              <div className="px-4 py-2 border-b border-border-subtle bg-bg-secondary/30">
                <TagInput
                  tags={notaSelecionada.tags || []}
                  onAdd={(tag) => {
                    addTag(notaSelecionada.id, tag);
                    setNotaSelecionada(prev => ({
                      ...prev,
                      tags: [...(prev.tags || []), tag],
                    }));
                  }}
                  onRemove={(tag) => {
                    removeTag(notaSelecionada.id, tag);
                    setNotaSelecionada(prev => ({
                      ...prev,
                      tags: (prev.tags || []).filter(t => t !== tag),
                    }));
                  }}
                />
              </div>
            )}

            <EditorToolbar
              editor={editor}
              focusMode={focoMode}
              onToggleFocus={toggleFoco}
            />

            <AIBar
              nota={notaSelecionada}
              onTagsOpen={handleTagsOpen}
              onResumoOpen={handleResumoOpen}
              onCardsOpen={handleCardsOpen}
              onChatOpen={handleChatOpen}
            />

            <div className={`flex-1 overflow-auto ${focoMode ? 'max-w-3xl mx-auto w-full px-8 py-12' : ''}`}>
              <EditorContent editor={editor} className="h-full" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-25" />
              <p className="text-lg">Selecione uma nota</p>
              <p className="text-sm mt-1">ou crie uma nova</p>
            </div>
          </div>
        )}
      </div>

      {mostrandoAI && notaSelecionada && (
        <div className="w-64 border-l border-border-subtle bg-bg-secondary overflow-auto">
          <AIPanel
            nota={notaSelecionada}
            onTagsUpdate={(tags) => {
              tags.forEach(t => addTag(notaSelecionada.id, t));
              setNotaSelecionada(prev => ({ ...prev, tags: [...(prev.tags || []), ...tags] }));
            }}
            onResumoUpdate={(resumo) => {
              update(notaSelecionada.id, { resumo_ia: resumo });
              setNotaSelecionada(prev => ({ ...prev, resumo_ia: resumo }));
            }}
            onFlashcardsCreate={(cards) => {
              cards.forEach(c => createCard({ frente: c.frente, verso: c.verso, materia: notaSelecionada.tipo }));
            }}
          />
        </div>
      )}

      {mostrandoMeta && notaSelecionada && (
        <NoteMetadata
          nota={notaSelecionada}
          onUpdate={(data) => {
            update(notaSelecionada.id, data);
            setNotaSelecionada(prev => ({ ...prev, ...data }));
          }}
        />
      )}

      {showTagPicker && (
        <TagPickerModal
          tagsSugeridas={tagsSugeridas}
          loading={aiLoadingTags}
          onConfirm={handleTagsConfirm}
          onCancel={() => setShowTagPicker(false)}
          modelo={getModel()}
        />
      )}

      {showCardApprove && (
        <FlashcardApproveModal
          cards={cardsSugeridos}
          loading={aiLoadingCards}
          onCancel={() => setShowCardApprove(false)}
          modelo={getModel()}
          notaTitulo={notaSelecionada?.titulo}
        />
      )}
    </div>
  );
}