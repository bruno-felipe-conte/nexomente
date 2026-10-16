/**
 * NotasPage — página principal de notas do NexoMente.
 *
 * Refatorado (Tarefa 4.1): lógica extraída para:
 *   - useNotaEditor  → editor TipTap + ações de IA
 *   - NotaLista      → painel lateral de busca/listagem
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { EditorContent } from '@tiptap/react';
import { FileText, Trash2 } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useNotaEditor } from '../hooks/useNotaEditor';
import NotaLista from '../components/editor/NotaLista';
import EditorToolbar from '../components/editor/EditorToolbar';
import BibliotecaPanel from '../components/editor/BibliotecaPanel';
import NoteMetadata from '../components/editor/NoteMetadata';
import TagInput from '../components/editor/TagInput';
import AIBar from '../components/editor/AIBar';
import FlashcardApproveModal from '../components/editor/FlashcardApproveModal';
import TagPickerModal from '../components/editor/TagPickerModal';
import EditorContextMenus from '../components/editor/EditorContextMenus';
import { getModel } from '../lib/ai/lmStudioService';
import Button from '../components/ui/Button';
import { useUIStore } from '../store/useUIStore';

export default function NotasPage() {
  const { notas, create, update, remove, search, getById, addTag, removeTag } = useNotes();

  const [categoriaAtiva, setCategoriaAtiva] = useState('pasta_raiz');
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [editando, setEditando] = useState(true);
  const [busca, setBusca] = useState('');
  const [focoMode, setFocoMode] = useState(false);
  const [mostrandoTags, setMostrandoTags] = useState(false);
  const [mostrandoMeta, setMostrandoMeta] = useState(false);

  const {
    editor,
    saveStatus,
    lastSavedAt,
    aiLoadingTags,
    aiLoadingResumo,
    aiLoadingCards,
    tagsSugeridas,
    cardsSugeridos,
    showTagPicker,
    showCardApprove,
    setShowTagPicker,
    setShowCardApprove,
    handleTagsOpen, handleResumoOpen, handleCardsOpen, handleChatOpen,
    handleTagsConfirm,
    salvarImediato,
  } = useNotaEditor({ notaSelecionada, editando, update, addTag, setNotaSelecionada });

  const notasFiltradas = useMemo(() => {
    let base = busca ? search(busca) : (notas || []);
    if (categoriaAtiva && categoriaAtiva !== 'pasta_raiz') {
      if (categoriaAtiva === 'inbox') {
        base = base.filter(n => !n.pasta_id || n.pasta_id === 'inbox');
      } else {
        base = base.filter(n => n.tipo === categoriaAtiva);
      }
    }
    return base;
  }, [notas, busca, search, categoriaAtiva]);

  const criarNota = useCallback((tipoCustom) => {
    const tipoExplicito = typeof tipoCustom === 'string' ? tipoCustom : null;
    const defaultTipo = categoriaAtiva !== 'pasta_raiz' && categoriaAtiva !== 'inbox'
      ? categoriaAtiva
      : 'nota';
    const tipo = tipoExplicito || defaultTipo;
    const pasta_id = categoriaAtiva === 'inbox' ? 'inbox' : 'pasta_raiz';
    const status = categoriaAtiva === 'inbox' ? 'inbox' : 'ativo';
    const id = create({ titulo: 'Nova Nota', tipo, pasta_id, status });
    const nova = getById(id) || { id, titulo: 'Nova Nota', tipo, pasta_id, status, conteudo: '', tags: [] };
    setNotaSelecionada(nova);
    setEditando(true);
  }, [create, getById, categoriaAtiva]);

  const salvarNota = useCallback(() => {
    salvarImediato();
  }, [salvarImediato]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S: Salvar Nota Imediatamente
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        salvarImediato();
      }
      // Ctrl+Shift+N: Nova Nota
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        criarNota();
      }
      // Ctrl+Shift+F: Alternar Modo Foco
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocoMode(prev => !prev);
      }
      // Esc: Fechar painéis/modais
      if (e.key === 'Escape') {
        setMostrandoMeta(false);
        setMostrandoTags(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [criarNota, salvarImediato]);

  const pendingNoteAction = useUIStore((s) => s.pendingNoteAction);
  const setPendingNoteAction = useUIStore((s) => s.setPendingNoteAction);
  const pendingNoteCategory = useUIStore((s) => s.pendingNoteCategory);
  const setPendingNoteCategory = useUIStore((s) => s.setPendingNoteCategory);

  useEffect(() => {
    if (!pendingNoteCategory) return;
    queueMicrotask(() => {
      setCategoriaAtiva(pendingNoteCategory === 'nota' ? 'pasta_raiz' : pendingNoteCategory);
    });
    setPendingNoteCategory(null);
  }, [pendingNoteCategory, setPendingNoteCategory]);

  // Consome ação pendente vinda do useUIStore (Dashboard, navegação direta)
  useEffect(() => {
    if (!pendingNoteAction) return;

    if (pendingNoteAction.noteId) {
      const target = getById(pendingNoteAction.noteId);
      if (target) {
        queueMicrotask(() => {
          setNotaSelecionada(target);
          setEditando(true);
        });
      }
      setPendingNoteAction(null);
    } else if (pendingNoteAction.action === 'create') {
      queueMicrotask(() => {
        criarNota();
      });
      setPendingNoteAction(null);
    }
  }, [pendingNoteAction, getById, criarNota, setPendingNoteAction]);

  // Listener fallback para abrir nota via evento customizado
  useEffect(() => {
    const handleOpenNoteEvent = (e) => {
      if (e.detail?.noteId) {
        const target = getById(e.detail.noteId);
        if (target) {
          setNotaSelecionada(target);
          setEditando(true);
        }
      } else if (e.detail?.action === 'create') {
        criarNota();
      }
    };
    window.addEventListener('open-note', handleOpenNoteEvent);
    return () => window.removeEventListener('open-note', handleOpenNoteEvent);
  }, [getById, criarNota]);

  const excluirNota = (id) => {
    const titulo = notaSelecionada?.titulo || 'esta nota';
    if (!window.confirm(`Deseja realmente excluir "${titulo}"?`)) return;
    remove(id);
    if (notaSelecionada?.id === id) {
      setNotaSelecionada(null);
      setEditando(true);
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
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={(catId) => setCategoriaAtiva(catId)}
            onMoverNota={update}
            onCriarPasta={() => criarNota()}
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
              const notaAtualizada = getById(n.id) || n;
              setNotaSelecionada(notaAtualizada);
              setEditando(true);
            }}
            onCriar={() => criarNota()}
          />
        </div>
      )}

      {/* Coluna 3: EDITOR (Conteúdo) */}
      <div className="flex-1 flex flex-col relative bg-bg-primary/5">
        {notaSelecionada ? (
          <>
            {/* Breadcrumbs & Status */}
            <div className="h-10 px-6 flex items-center justify-between border-b border-white/5 bg-bg-primary/20">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-lo/50">
                <span>Bibliotecas</span>
                <span className="opacity-30">/</span>
                <span className="text-text-lo">{notaSelecionada.tipo || 'Nota'}</span>
                <span className="opacity-30">/</span>
                <span className="text-text-hi">{notaSelecionada.titulo}</span>
              </div>
              <div className="flex items-center gap-4">
                <span
                  data-testid="save-status"
                  className={`text-[10px] font-mono uppercase tracking-widest ${saveStatus === 'saving' ? 'text-warning' : 'text-text-lo/50'}`}
                >
                  {saveStatus === 'saving' ? 'Salvando…' : 'Salvo'}
                </span>
              </div>
            </div>

            {/* Barra de título + ações */}
            {!focoMode && (
              <div className="p-3 border-b border-border-subtle flex items-center gap-2 bg-bg-secondary/50">
                <input
                  type="text"
                  aria-label="Título da nota"
                  value={notaSelecionada.titulo}
                  onChange={(e) => {
                    const novoTitulo = e.target.value;
                    const conteudoAtual = editor ? editor.getHTML() : (notaSelecionada.conteudo || '');
                    setNotaSelecionada(prev => ({ ...prev, titulo: novoTitulo, conteudo: conteudoAtual }));
                    update(notaSelecionada.id, { titulo: novoTitulo, conteudo: conteudoAtual });
                  }}
                  className="flex-1 bg-transparent text-lg font-bold text-text-primary focus:outline-none"
                  placeholder="Título da nota"
                />
                {['Info', 'Tags'].map((label) => {
                  const show = label === 'Info' ? mostrandoMeta : mostrandoTags;
                  const toggle = label === 'Info'
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
                <Button
                  onClick={salvarNota}
                  variant="primary"
                  size="sm"
                  className="bg-success hover:bg-success/90"
                  title="Salvar nota imediatamente (Ctrl+S)"
                >
                  {saveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  onClick={() => excluirNota(notaSelecionada.id)}
                  variant="ghost"
                  size="none"
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
              <AIBar
                nota={notaSelecionada}
                onTagsOpen={handleTagsOpen}
                onResumoOpen={handleResumoOpen}
                onCardsOpen={handleCardsOpen}
                onChatOpen={handleChatOpen}
                loadingTags={aiLoadingTags}
                loadingResumo={aiLoadingResumo}
                loadingCards={aiLoadingCards}
              />
            )}

            <div className={`flex-1 overflow-auto relative ${focoMode ? 'max-w-3xl mx-auto w-full px-8 py-12' : ''}`}>
              <EditorContextMenus editor={editor} onAIAction={(action) => action === 'summarize' && handleResumoOpen()} />
              <EditorContent editor={editor} className="h-full" />
            </div>

            {/* Barra de Status Inferior (Palavras, Leitura, Salvamento) */}
            <div className="h-7 px-4 border-t border-white/5 bg-bg-primary/20 flex items-center justify-between text-[11px] text-text-lo/60 font-mono select-none">
              <div className="flex items-center gap-3">
                {(() => {
                  const texto = editor?.getText() || '';
                  const palavras = texto.trim() ? texto.trim().split(/\s+/).filter(Boolean).length : 0;
                  const tempoMin = Math.max(1, Math.ceil(palavras / 200));
                  return (
                    <>
                      <span>{palavras} {palavras === 1 ? 'palavra' : 'palavras'}</span>
                      <span className="opacity-30">•</span>
                      <span>~{tempoMin} min de leitura</span>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {saveStatus === 'saving'
                    ? 'Salvando alterações…'
                    : lastSavedAt
                      ? `Salvo às ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Todas as alterações salvas'}
                </span>
                <span className="opacity-30">•</span>
                <span className="text-[10px] uppercase tracking-wider text-text-lo/40">Ctrl+S salva</span>
              </div>
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

      {/* Painel lateral de metadados */}
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
          tagsSugeridas={tagsSugeridas}
          loading={aiLoadingTags}
          onConfirm={handleTagsConfirm}
          onCancel={() => setShowTagPicker(false)}
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