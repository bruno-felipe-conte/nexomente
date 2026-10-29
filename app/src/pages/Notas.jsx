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

  const criarNota = useCallback((tipoCustom, tituloCustom) => {
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

    const tituloFinal = (typeof tituloCustom === 'string' && tituloCustom.trim()) ? tituloCustom.trim() : 'Nova Nota';
    const id = create({ titulo: tituloFinal, tipo, pasta_id, status });
    const nova = getById(id) || { id, titulo: tituloFinal, tipo, pasta_id, status, conteudo: '', tags: [] };
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
        criarNota(null, pendingNoteAction.title);
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
    <div className={`h-full w-full overflow-hidden ${focoMode ? 'p-0' : 'nx-notes-layout'}`}>
      {/* Coluna 1: LISTA E CATEGORIAS (Painel de Vidro Apple-style) */}
      {!focoMode && (
        <div className="nx-glass nx-notes-list flex flex-col h-full min-h-0">
          <NotaLista
            notas={notasFiltradas}
            todasNotas={notas || []}
            notaSelecionada={notaSelecionada}
            busca={busca}
            onBuscaChange={setBusca}
            categoriaAtiva={categoriaAtiva}
            onSelectCategoria={(catId) => setCategoriaAtiva(catId)}
            onSelect={(n) => {
              salvarImediato();
              const notaAtualizada = getById(n.id) || n;
              setNotaSelecionada(notaAtualizada);
              setEditando(true);
            }}
            onCriar={() => criarNota()}
            onImport={() => setShowImporter(true)}
          />
        </div>
      )}

      {/* Coluna 2: WORKSPACE DO EDITOR (Folha de Escrita em Vidro Translúcido) */}
      <div className={`nx-glass-strong nx-notes-editor flex-1 flex flex-col min-w-0 h-full overflow-hidden ${focoMode ? 'rounded-none border-none shadow-none' : ''}`}>
        {notaSelecionada ? (
          <>
            {/* 1. BARRA SUPERIOR ÚNICA E COMPACTA (Breadcrumb à esquerda | Ações à direita) */}
            <div className="h-12 px-5 md:px-6 flex items-center justify-between border-b border-nx-border/70 bg-nx-depth/35 shrink-0 gap-4">
              {/* Breadcrumb sutil */}
              <div className="flex items-center gap-2 text-[10.5px] font-mono font-bold uppercase tracking-wider text-nx-dim truncate">
                <span>Vault</span>
                <span className="opacity-40">/</span>
                <span className="text-nx-secondary">{notaSelecionada.tipo || 'Nota'}</span>
                <span className="opacity-40">/</span>
                <span className="text-nx-bright truncate max-w-[180px]">{notaSelecionada.titulo}</span>
              </div>

              {/* Indicadores & Ações agrupados à direita na mesma linha */}
              <div className="flex items-center gap-2">
                {/* Indicador de Status Auto-Save */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10.5px] font-mono text-nx-dim mr-2" title="Salvamento contínuo em background">
                  <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-nx-accent animate-pulse' : 'bg-nx-secondary'}`} />
                  <span data-testid="save-status">{saveStatus === 'saving' ? 'Salvando…' : 'Salvo'}</span>
                </div>

                {/* Ações de IA: Pílulas limpas */}
                <button
                  onClick={handleResumoOpen}
                  disabled={aiLoadingResumo}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nx-surface hover:bg-nx-overlay text-nx-bright text-xs font-semibold border border-nx-border transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Resumo via IA local"
                >
                  {aiLoadingResumo ? <Loader2 size={12} className="animate-spin text-nx-primary" /> : <Sparkles size={12} className="text-nx-primary" />}
                  <span className="hidden md:inline">Resumo IA</span>
                </button>

                <button
                  onClick={handleTagsOpen}
                  disabled={aiLoadingTags}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nx-surface hover:bg-nx-overlay text-nx-bright text-xs font-semibold border border-nx-border transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Sugerir tags semânticas"
                >
                  {aiLoadingTags ? <Loader2 size={12} className="animate-spin text-nx-secondary" /> : <Tag size={12} className="text-nx-secondary" />}
                  <span className="hidden md:inline">Tags</span>
                </button>

                <button
                  onClick={handleCardsOpen}
                  disabled={aiLoadingCards}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nx-primary-bg hover:bg-nx-primary/15 text-nx-primary text-xs font-semibold border border-nx-primary/30 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Forjar flashcards para repetição espaçada"
                >
                  {aiLoadingCards ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                  <span className="hidden md:inline">Forjar Cards</span>
                </button>

                <div className="h-4 w-px bg-nx-border mx-1" />

                {/* Info / Metadados */}
                <button
                  onClick={() => setMostrandoMeta(p => !p)}
                  aria-label="Metadados da nota"
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    mostrandoMeta ? 'bg-nx-overlay text-nx-bright border-nx-border' : 'text-nx-dim border-transparent hover:text-nx-bright hover:bg-nx-overlay/60'
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
                    focoMode ? 'bg-nx-primary-bg text-nx-primary border-nx-primary/30' : 'text-nx-dim border-transparent hover:text-nx-bright hover:bg-nx-overlay/60'
                  }`}
                  title={focoMode ? 'Sair do Modo Foco' : 'Modo Foco Zen'}
                >
                  {focoMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {/* Excluir Nota */}
                <button
                  onClick={() => excluirNota(notaSelecionada.id)}
                  className="p-1.5 rounded-lg text-nx-dim hover:text-nx-error hover:bg-nx-error-bg transition-all cursor-pointer"
                  title="Excluir nota"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* 2. ÁREA DE ESCRITA RESPIRÁVEL (Folha Pautada do Editor) */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="nx-editor-paper">
                {/* TÍTULO GRANDE DIRETAMENTE ACIMA DO TEXTO (Tipografia Lora) */}
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
                  className="w-full bg-transparent text-3xl md:text-4xl font-display font-bold text-nx-bright placeholder:text-nx-subtle/30 focus:outline-none border-none p-0 mb-3 tracking-tight"
                  placeholder="Título da nota..."
                />

                {/* Tags em pílulas editoriais */}
                <div className="mb-4">
                  <TagInput
                    key={notaSelecionada.id}
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

                {/* Micro-dock minimalista de formatação */}
                <div className="mb-5 sticky top-0 z-20 py-1 bg-nx-surface/90 backdrop-blur-md rounded-xl">
                  <EditorToolbar editor={editor} />
                </div>

                {/* Corpo do editor TipTap */}
                <div className="flex-1 min-h-[420px]">
                  <EditorContextMenus editor={editor} onAIAction={(action) => action === 'summarize' && handleResumoOpen()} />
                  <EditorContent editor={editor} className="max-w-none focus:outline-none min-h-[420px] text-nx-text" />
                </div>
              </div>
            </div>

            {/* 3. BARRA DE STATUS INFERIOR DISCRETA */}
            <div className="h-7 px-6 border-t border-nx-border/60 bg-nx-depth/35 flex items-center justify-between text-[11px] text-nx-dim font-mono select-none shrink-0">
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
                <span className="text-[10px] uppercase tracking-wider text-nx-subtle">Ctrl+S salva</span>
              </div>
            </div>
          </>
        ) : (
          <div className="nx-empty">
            <FileText strokeWidth={1.5} />
            <h3 className="text-lg font-display font-bold text-nx-bright">
              Selecione uma nota do Vault
            </h3>
            <p className="text-xs text-nx-dim max-w-sm leading-relaxed">
              {(notas || []).length > 0
                ? 'Escolha um card ao lado para continuar sua escrita, ou use o botão + no topo da lista (Ctrl+Shift+N) para criar uma nova nota.'
                : 'Seu Vault está pronto para receber suas reflexões, sínteses e conexões neurais.'}
            </p>
            {/* CTA único de boas-vindas exibido apenas quando não houver notas cadastradas */}
            {(notas || []).length === 0 && (
              <button
                onClick={() => criarNota()}
                className="mt-2 nx-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                + Criar Primeira Nota
              </button>
            )}
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