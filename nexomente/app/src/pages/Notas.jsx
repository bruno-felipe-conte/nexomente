/**
 * NotasPage — página principal de notas do NexoMente.
 *
 * Refatorado (Tarefa 4.1): lógica extraída para:
 *   - useNotaEditor  → editor TipTap + ações de IA
 *   - NotaLista      → painel lateral de busca/listagem
 */
import { useState, useMemo } from 'react';
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
import TagPickerModal from '../components/editor/TagPickerModal';
import FlashcardApproveModal from '../components/editor/FlashcardApproveModal';
import { getModel } from '../lib/ai/lmStudioService';

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

  const excluirNota = (id) => {
    remove(id);
    if (notaSelecionada?.id === id) {
      setNotaSelecionada(null);
      setEditando(false);
    }
  };

  return (
    <div className={`flex h-full ${focoMode ? 'bg-bg-primary' : ''}`}>
      {/* Painel lateral — lista de notas */}
      <AnimatePresence>
        {!focoMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border-subtle flex flex-col bg-bg-secondary overflow-hidden"
          >
            <NotaLista
              notas={notasFiltradas}
              notaSelecionada={notaSelecionada}
              busca={busca}
              onBuscaChange={setBusca}
              onSelect={(nota) => { setNotaSelecionada(nota); setEditando(false); }}
              onCriar={criarNota}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painel biblioteca */}
      {!focoMode && (
        <BibliotecaPanel
          pastas={[]}
          notas={notas}
          notaSelecionada={notaSelecionada}
          onMoverNota={(notaId, pastaId) => {
            update(notaId, { pasta_id: pastaId });
            if (notaSelecionada?.id === notaId) setNotaSelecionada(getById(notaId));
          }}
          onCriarPasta={() => {}}
        />
      )}

      {/* Área principal do editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {notaSelecionada ? (
          <>
            {/* Barra de título + ações */}
            {!focoMode && (
              <div className="p-3 border-b border-border-subtle flex items-center gap-2 bg-bg-secondary/50">
                <input
                  type="text"
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
                    <button key={label} onClick={toggle}
                      className={`px-3 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                        show ? 'bg-accent-main text-white border-accent-main'
                             : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-accent-main'
                      }`}
                    >{label}</button>
                  );
                })}
                {editando ? (
                  <button onClick={salvarNota}
                    className="px-3 py-1.5 bg-success rounded text-xs font-medium hover:bg-success/90 transition-colors cursor-pointer">
                    Salvar
                  </button>
                ) : (
                  <button onClick={() => setEditando(true)}
                    className="px-3 py-1.5 bg-accent-main rounded text-xs font-medium hover:bg-accent-main/90 transition-colors cursor-pointer">
                    Editar
                  </button>
                )}
                <button onClick={() => excluirNota(notaSelecionada.id)}
                  className="p-1.5 text-text-muted hover:text-danger transition-colors cursor-pointer">
                  <Trash2 size={14} />
                </button>
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
            <AIBar nota={notaSelecionada}
              onTagsOpen={handleTagsOpen} onResumoOpen={handleResumoOpen}
              onCardsOpen={handleCardsOpen} onChatOpen={handleChatOpen}
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
          onUpdate={(data) => {
            update(notaSelecionada.id, data);
            setNotaSelecionada(prev => ({ ...prev, ...data }));
          }}
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