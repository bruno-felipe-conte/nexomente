/**
 * NotasPage — página principal de notas do NexoMente.
 *
 * Refatorado (Tarefa 4.1): lógica extraída para:
 *   - useNotaEditor  → editor TipTap + ações de IA
 *   - NotaLista      → painel lateral de busca/listagem
 */
import { useState, useMemo, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import { useNotaEditor } from '../hooks/useNotaEditor';
import NotaLista from '../components/editor/NotaLista';
import EditorToolbar from '../components/editor/EditorToolbar';
import BibliotecaPanel from '../components/editor/BibliotecaPanel';
import NoteMetadata from '../components/editor/NoteMetadata';
import TagInput from '../components/editor/TagInput';
import AIPanel from '../components/editor/AIPanel';
import AIBar from '../components/editor/AIBar';
import FlashcardApproveModal from '../components/editor/FlashcardApproveModal';
import EditorContextMenus from '../components/editor/EditorContextMenus';
import { getModel } from '../lib/ai/lmStudioService';
import Button from '../components/ui/Button';

export default function NotasPage() {
  const { notas, create, update, remove, search, getById, addTag, removeTag } = useNotes();
  const { create: createCard } = useFlashcards();

  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [editando, setEditando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');
  const [focoMode, setFocoMode] = useState(false);
  const [mostrandoTags, setMostrandoTags] = useState(false);
  const [mostrandoMeta, setMostrandoMeta] = useState(false);
  const [mostrandoAI, setMostrandoAI] = useState(false);

  const {
    editor,
    aiLoadingTags, aiLoadingResumo, aiLoadingCards,
    tagsSugeridas, cardsSugeridos,
    showTagPicker, showCardApprove,
    setShowTagPicker, setShowCardApprove,
    handleTagsOpen, handleResumoOpen, handleCardsOpen, handleChatOpen,
    handleTagsConfirm, handleCardsConfirm,
    salvarNota: _salvarNota,
  } = useNotaEditor({ notaSelecionada, editando, update, addTag, setNotaSelecionada });

  const notasFiltradas = useMemo(
    () => (busca ? search(busca) : notas),
    [notas, busca, search]
  );

  const criarNota = (tipo = 'nota') => {
    const id = create({ titulo: 'Nova Nota', tipo, pasta_id: 'inbox', status: 'inbox' });
    const nova = getById(id);
    setNotaSelecionada(nova);
    setEditando(true);
    setCriando(true);
  };

  const salvarNota = () => {
    _salvarNota();
    setEditando(false);
    setCriando(false);
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+N: Nova Nota
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        criarNota('nota');
      }
      // Esc: Fechar painéis/modais
      if (e.key === 'Escape') {
        setMostrandoAI(false);
        setMostrandoMeta(false);
        setMostrandoTags(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const excluirNota = (id) => {
    remove(id);
    if (notaSelecionada?.id === id) {
      setNotaSelecionada(null);
      setEditando(false);
    }
  };

  return (
    <div className={`flex h-full ${focoMode ? 'bg-bg-primary' : ''}`}>
      {/* Coluna 1: BIBLIOTECAS (Navegação Estrutural) */}
      {!focoMode && (
        <div className="w-64 border-r border-white/5 flex flex-col bg-bg-secondary/20">
          <BibliotecaPanel
            pastas={[]}
            notas={notas}
            notaSelecionada={notaSelecionada}
            onMoverNota={update}
            onCriarPasta={() => {}}
          />
        </div>
      )}

      {/* Coluna 2: LISTA DE NOTAS (Navegação de Itens) */}
      {!focoMode && (
        <div className="w-72 border-r border-white/5 flex flex-col bg-bg-primary/10">
          <NotaLista
            notas={notasFiltradas}
            notaSelecionada={notaSelecionada}
            busca={busca}
            onBuscaChange={setBusca}
            onSelect={(n) => {
              setNotaSelecionada(n);
              setEditando(false);
            }}
            onCriar={criarNota}
          />
        </div>
      )}

      {/* Coluna 3: EDITOR (Conteúdo) */}
      <div className="flex-1 flex flex-col relative bg-bg-primary/5">
        {notaSelecionada ? (
          <>
            {/* Breadcrumbs & Actions */}
            <div className="h-10 px-6 flex items-center justify-between border-b border-white/5 bg-bg-primary/20">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-lo/50">
                <span>Bibliotecas</span>
                <span className="opacity-30">/</span>
                <span className="text-text-lo">{notaSelecionada.tipo || 'Nota'}</span>
                <span className="opacity-30">/</span>
                <span className="text-text-hi">{notaSelecionada.titulo}</span>
              </div>
              <div className="flex items-center gap-4">
                {['IA', 'Info', 'Tags'].map(label => {
                  const show = label === 'IA' ? mostrandoAI : label === 'Info' ? mostrandoMeta : mostrandoTags;
                  return (
                    <button
                      key={label}
                      onClick={() => label === 'IA' ? setMostrandoAI(!mostrandoAI) : label === 'Info' ? setMostrandoMeta(!mostrandoMeta) : setMostrandoTags(!mostrandoTags)}
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${show ? 'text-accent-main' : 'text-text-lo hover:text-text-hi'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra de título + ações */}
            {!focoMode && (
              <div className="p-3 border-b border-border-subtle flex items-center gap-2 bg-bg-secondary/50">
                <input
                  type="text"
                  aria-label="Título da nota"
                  value={notaSelecionada.titulo}
                  onChange={(e) => setNotaSelecionada({ ...notaSelecionada, titulo: e.target.value })}
                  className="flex-1 bg-transparent text-lg font-bold text-text-primary focus:outline-none"
                  placeholder="Título da nota"
                />
                {['IA', 'Info', 'Tags'].map((label) => {
                  const show = label === 'IA' ? mostrandoAI : label === 'Info' ? mostrandoMeta : mostrandoTags;
                  const toggle = label === 'IA'
                    ? () => setMostrandoAI(p => !p)
                    : label === 'Info'
                      ? () => setMostrandoMeta(p => !p)
                      : () => setMostrandoTags(p => !p);
                  return (
                    <Button 
                      key={label} 
                      onClick={toggle}
                      variant={show ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      {label}
                    </Button>
                  );
                })}
                {editando ? (
                  <Button onClick={salvarNota} variant="primary" size="sm" className="bg-success hover:bg-success/90">
                    Salvar
                  </Button>
                ) : (
                  <Button onClick={() => setEditando(true)} variant="primary" size="sm">
                    Editar
                  </Button>
                )}
                <Button 
                  onClick={() => excluirNota(notaSelecionada.id)}
                  variant="ghost" 
                  size="icon-only"
                  aria-label="Excluir nota" 
                  title="Excluir nota"
                  className="text-text-muted hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}

            {/* Barra de tags */}
            {mostrandoTags && (
              <div className="px-4 py-2 border-b border-border-subtle bg-bg-secondary/30">
                <TagInput
                  tags={notaSelecionada.tags || []}
                  onAdd={(tag) => {
                    addTag(notaSelecionada.id, tag);
                    setNotaSelecionada(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
                  }}
                  onRemove={(tag) => {
                    removeTag(notaSelecionada.id, tag);
                    setNotaSelecionada(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
                  }}
                />
              </div>
            )}

            <EditorToolbar editor={editor} focusMode={focoMode} onToggleFocus={() => setFocoMode(p => !p)} />
            
            {!focoMode && (
              <AIBar nota={notaSelecionada}
                onTagsOpen={handleTagsOpen} onResumoOpen={handleResumoOpen}
                onCardsOpen={handleCardsOpen} onChatOpen={handleChatOpen}
              />
            )}

            <div className={`flex-1 overflow-auto relative ${focoMode ? 'max-w-3xl mx-auto w-full px-8 py-12' : ''}`}>
              <EditorContextMenus editor={editor} onAIAction={(action) => action === 'summarize' && handleResumoOpen()} />
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

      {/* Painéis laterais opcionais */}
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
          editor={editor}
          onUpdate={(data) => {
            update(notaSelecionada.id, data);
            setNotaSelecionada(prev => ({ ...prev, ...data }));
          }}
          onClose={() => setMostrandoMeta(false)}
        />
      )}

      {/* Modais de IA */}
      {showTagPicker && (
        <TagPickerModal
          tagsSugeridas={tagsSugeridas} loading={aiLoadingTags}
          onConfirm={handleTagsConfirm} onCancel={() => setShowTagPicker(false)}
          modelo={getModel()}
        />
      )}
      {showCardApprove && (
        <FlashcardApproveModal
          cards={cardsSugeridos} loading={aiLoadingCards}
          onCancel={() => setShowCardApprove(false)}
          modelo={getModel()} notaTitulo={notaSelecionada?.titulo}
        />
      )}
    </div>
  );
}