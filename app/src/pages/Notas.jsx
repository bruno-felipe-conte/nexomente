/**
 * NotasPage — Vault de Notas do NexoMente em 2 Colunas (Estilo Notion / Obsidian Clean)
 *
 * - Coluna 1: Lista e Navegação (Busca, pílulas de pastas/categorias no topo e listagem de notas)
 * - Coluna 2: Workspace limpo e respirável
 *   - Barra superior única (Breadcrumb à esquerda, Salvo, Ações IA, Info, Zen e Excluir à direita)
 *   - Área centralizada (Título grande diretamente acima do texto, sem linhas cortando o conteúdo)
 *   - Toolbar minimalista em micro-dock
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { EditorContent } from '@tiptap/react';
import {
  FileText, Trash2, Sparkles, Tag, Layers,
  Maximize2, Minimize2, Loader2, Info
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useFlashcards } from '../hooks/useFlashcards';
import { useNotaEditor } from '../hooks/useNotaEditor';
import NotaLista from '../components/editor/NotaLista';
import EditorToolbar from '../components/editor/EditorToolbar';
import NoteMetadata from '../components/editor/NoteMetadata';
import TagInput from '../components/editor/TagInput';
import FlashcardApproveModal from '../components/editor/FlashcardApproveModal';
import TagPickerModal from '../components/editor/TagPickerModal';
import EditorContextMenus from '../components/editor/EditorContextMenus';
import ImporterModal from '../components/common/ImporterModal';
import { getModel } from '../lib/ai/aiProvider';
import { useUIStore } from '../store/useUIStore';
import toast from 'react-hot-toast';

export default function NotasPage() {
  const { notas, create, update, remove, search, getById, addTag, removeTag } = useNotes();
  const { create: createCard } = useFlashcards();

  const [categoriaAtiva, setCategoriaAtiva] = useState('pasta_raiz');
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [editando, setEditando] = useState(true);
  const [busca, setBusca] = useState('');
  const [focoMode, setFocoMode] = useState(false);
  const [mostrandoMeta, setMostrandoMeta] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

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
    handleTagsOpen, handleResumoOpen, handleCardsOpen,
    handleTagsConfirm,
    salvarImediato,
  } = useNotaEditor({ notaSelecionada, editando, update, addTag, setNotaSelecionada });

  const notasFiltradas = useMemo(() => {
    let base = busca ? search(busca) : (notas || []);
    if (categoriaAtiva && categoriaAtiva !== 'pasta_raiz') {
      if (categoriaAtiva === 'inbox') {
        base = base.filter(n => !n.pasta_id || n.pasta_id === 'inbox' || n.tipo === 'inbox');
      } else {
        base = base.filter(n => n.tipo === categoriaAtiva || n.pasta_id === categoriaAtiva);
      }
    }
    return base;
  }, [notas, busca, search, categoriaAtiva]);

  const criarNota = useCallback((tipoCustom) => {
    const cat = (typeof tipoCustom === 'string' && tipoCustom) ? tipoCustom : categoriaAtiva;
    let tipo = 'nota';
    let pasta_id = 'pasta_raiz';
    let status = 'ativo';

    if (cat && cat !== 'pasta_raiz') {
      if (cat === 'inbox') {
        tipo = 'inbox';
        pasta_id = 'inbox';
        status = 'inbox';
      } else {
        tipo = cat;
        pasta_id = cat;
        status = 'ativo';
      }
    }

    const id = create({ titulo: 'Nova Nota', tipo, pasta_id, status });
    const nova = getById(id) || { id, titulo: 'Nova Nota', tipo, pasta_id, status, conteudo: '', tags: [] };
    setNotaSelecionada(nova);
    setEditando(true);
  }, [create, getById, categoriaAtiva]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        salvarImediato();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        criarNota();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocoMode(prev => !prev);
      }
      if (e.key === 'Escape') {
        setMostrandoMeta(false);
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
    <div className={`flex h-full w-full overflow-hidden ${focoMode ? 'bg-bg-primary' : ''}`}>
      {/* Coluna 1: LISTA E CATEGORIAS (Navegação Unificada em 2 Colunas) */}
      {!focoMode && (
        <div className="w-80 md:w-96 border-r border-white/5 flex flex-col bg-bg-secondary/15 shrink-0 h-full">
          <NotaLista
            notas={notasFiltradas}
            todasNotas={notas || []}
            notaSelecionada={notaSelecionada}
            busca={busca}
            onBuscaChange={setBusca}
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={(catId) => setCategoriaAtiva(catId)}
            onSelect={(n) => {
              const notaAtualizada = getById(n.id) || n;
              setNotaSelecionada(notaAtualizada);
              setEditando(true);
            }}
            onCriar={() => criarNota()}
            onImport={() => setShowImporter(true)}
          />
        </div>
      )}

      {/* Coluna 2: WORKSPACE DO EDITOR (Notion / Obsidian Clean) */}
      <div className="flex-1 flex flex-col relative bg-bg-primary/5 min-w-0 h-full overflow-hidden">
        {notaSelecionada ? (
          <>
            {/* 1. BARRA SUPERIOR ÚNICA E COMPACTA (Breadcrumb à esquerda | Ações à direita) */}
            <div className="h-12 px-6 flex items-center justify-between border-b border-white/[0.06] bg-bg-secondary/20 shrink-0 gap-4">
              {/* Breadcrumb sutil */}
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-lo/40 truncate">
                <span>Vault</span>
                <span className="opacity-30">/</span>
                <span className="text-text-lo/70">{notaSelecionada.tipo || 'Nota'}</span>
                <span className="opacity-30">/</span>
                <span className="text-text-hi truncate max-w-[160px]">{notaSelecionada.titulo}</span>
              </div>

              {/* Indicadores & Ações agrupados à direita na mesma linha */}
              <div className="flex items-center gap-2.5">
                {/* Indicador de Status Auto-Save com micro ponto */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-lo/50 mr-2" title="Salvamento contínuo em background">
                  <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span data-testid="save-status">{saveStatus === 'saving' ? 'Salvando…' : 'Salvo'}</span>
                </div>

                {/* Ações de IA: Pílulas limpas */}
                <button
                  onClick={handleResumoOpen}
                  disabled={aiLoadingResumo}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-text-hi text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-40"
                  title="Resumo via IA local"
                >
                  {aiLoadingResumo ? <Loader2 size={12} className="animate-spin text-accent-main" /> : <Sparkles size={12} className="text-accent-main" />}
                  <span className="hidden sm:inline">Resumo IA</span>
                </button>

                <button
                  onClick={handleTagsOpen}
                  disabled={aiLoadingTags}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-text-hi text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-40"
                  title="Sugerir tags semânticas"
                >
                  {aiLoadingTags ? <Loader2 size={12} className="animate-spin text-accent-main" /> : <Tag size={12} className="text-accent-main" />}
                  <span className="hidden sm:inline">Tags</span>
                </button>

                <button
                  onClick={handleCardsOpen}
                  disabled={aiLoadingCards}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-main/15 hover:bg-accent-main/25 text-accent-main text-xs font-semibold border border-accent-main/30 transition-all cursor-pointer disabled:opacity-40"
                  title="Forjar flashcards para repetição espaçada"
                >
                  {aiLoadingCards ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                  <span className="hidden sm:inline">Forjar Cards</span>
                </button>

                <div className="h-4 w-px bg-white/10 mx-0.5" />

                {/* Info / Metadados */}
                <button
                  onClick={() => setMostrandoMeta(p => !p)}
                  aria-label="Metadados da nota"
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    mostrandoMeta ? 'bg-white/10 text-text-hi border-white/20' : 'text-text-lo/40 border-transparent hover:text-text-hi'
                  }`}
                  title="Metadados da nota"
                >
                  <Info size={15} />
                  <span className="sr-only">Info</span>
                </button>

                {/* Modo Foco Zen */}
                <button
                  onClick={() => setFocoMode(p => !p)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    focoMode ? 'bg-accent-main/20 text-accent-main border-accent-main/30' : 'text-text-lo/40 border-transparent hover:text-text-hi'
                  }`}
                  title={focoMode ? 'Sair do Modo Foco' : 'Modo Foco Zen'}
                >
                  {focoMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {/* Excluir Nota */}
                <button
                  onClick={() => excluirNota(notaSelecionada.id)}
                  className="p-1.5 rounded-lg text-text-lo/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Excluir nota"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* 2. ÁREA DE ESCRITA RESPIRÁVEL (Notion / Obsidian Clean) */}
            <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-none">
              <div className="max-w-3xl mx-auto w-full flex flex-col">
                {/* TÍTULO GRANDE E LIMPO DIRETAMENTE ACIMA DO TEXTO (Sem linhas cortando) */}
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
                  className="w-full bg-transparent text-3xl md:text-4xl font-serif font-bold text-text-hi placeholder:text-text-lo/20 focus:outline-none border-none p-0 mb-3 tracking-tight"
                  placeholder="Título da nota..."
                />

                {/* Tags em pílulas logo abaixo do título */}
                <div className="mb-4">
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

                {/* Micro-dock minimalista de formatação (Sem barra dura de tela inteira) */}
                <div className="mb-5 sticky top-0 z-20 py-1 bg-nx-void/90 backdrop-blur-md">
                  <EditorToolbar editor={editor} />
                </div>

                {/* Corpo do editor TipTap */}
                <div className="flex-1 min-h-[420px]">
                  <EditorContextMenus editor={editor} onAIAction={(action) => action === 'summarize' && handleResumoOpen()} />
                  <EditorContent editor={editor} className="prose prose-invert max-w-none focus:outline-none min-h-[420px] leading-relaxed text-text-hi" />
                </div>
              </div>
            </div>

            {/* 3. BARRA DE STATUS INFERIOR DISCRETA */}
            <div className="h-7 px-6 border-t border-white/[0.05] bg-bg-primary/20 flex items-center justify-between text-[11px] text-text-lo/50 font-mono select-none shrink-0">
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
          <div className="flex-1 flex items-center justify-center text-text-lo/40 p-10">
            <div className="text-center space-y-3">
              <FileText size={48} className="mx-auto opacity-20" />
              <p className="text-base font-semibold text-text-hi">Selecione uma nota do Vault</p>
              <p className="text-xs text-text-lo/50">Ou crie uma nova nota para começar a escrever</p>
              <button
                onClick={() => criarNota()}
                className="mt-2 px-4 py-2 rounded-xl bg-accent-main/15 text-accent-main border border-accent-main/30 text-xs font-bold hover:bg-accent-main/25 transition-all cursor-pointer"
              >
                + Nova Nota
              </button>
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
          cards={cardsSugeridos}
          loading={aiLoadingCards}
          onCancel={() => setShowCardApprove(false)}
          modelo={getModel()}
          notaTitulo={notaSelecionada?.titulo}
        />
      )}
      <ImporterModal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        initialTab="notes"
        onImportNotes={(parsedNotes) => {
          let lastCreated = null;
          const tipo = categoriaAtiva && categoriaAtiva !== 'pasta_raiz' ? categoriaAtiva : 'nota';
          const pasta_id = categoriaAtiva || 'pasta_raiz';
          parsedNotes.forEach((n) => {
            const html = n.htmlContent || n.content || '';
            const id = create({
              titulo: n.title || 'Nota Importada',
              conteudo: html,
              tipo,
              pasta_id,
              status: tipo === 'inbox' ? 'inbox' : 'ativo',
            });
            lastCreated = getById(id) || {
              id,
              titulo: n.title || 'Nota Importada',
              conteudo: html,
              tipo,
              pasta_id,
              tags: [],
            };
          });
          if (lastCreated) {
            setNotaSelecionada(lastCreated);
            setEditando(true);
          }
          toast.success(`${parsedNotes.length} nota(s) Markdown importada(s) no Vault!`);
          setShowImporter(false);
        }}
        onImportCards={(validCards) => {
          validCards.forEach((c) => {
            createCard({
              frente: c.front,
              verso: c.back,
              materia_id: (c.deck || 'geral').toLowerCase(),
              nota_id: notaSelecionada?.id || null,
            });
          });
          toast.success(`${validCards.length} flashcard(s) importado(s) com sucesso!`);
          setShowImporter(false);
        }}
      />
    </div>
  );
}