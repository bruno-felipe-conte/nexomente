import { useState, useEffect, useCallback } from 'react';
import {
  FileText, BookOpen, Lightbulb, Calendar, Bookmark, Search, Trash2,
  Plus, BookMarked, ChevronLeft, ChevronRight, Star, Edit3, Save, Clock, Book, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePoemas } from '../hooks/useMaterias';

const tipoCores = {
  nota: '#6C63FF', livro: '#8B5CF6', ideia: '#EC4899',
  diario: '#10B981', biblia: '#F59E0B', estudo: '#3B82F6',
};

export default function PoemasPage() {
  const { poemas, create, update, remove, registrarRecitacao, getById, proximoPoema, poemaAnterior } = usePoemas();
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState({ titulo: '', autor: '', ano: '', corpo: '', formato: 'verso' });

  useEffect(() => {
    if (poemas.length > 0 && !poemaSelecionado) {
      setPoemaSelecionado(poemas[0]);
    }
  }, [poemas]);

  const navegar = (direcao) => {
    if (!poemaSelecionado) return;
    const p = direcao === 'prox' ? proximoPoema(poemaSelecionado.id) : poemaAnterior(poemaSelecionado.id);
    setPoemaSelecionado(p);
    setEditando(false);
  };

  const iniciarEdicao = (poema) => {
    setEditForm({
      titulo: poema.titulo,
      autor: poema.autor || '',
      ano: poema.ano || '',
      corpo: poema.corpo || '',
      formato: poema.formato || 'verso',
    });
    setEditando(true);
  };

  const salvarEdicao = () => {
    if (!poemaSelecionado) return;
    update(poemaSelecionado.id, editForm);
    setPoemaSelecionado(getById(poemaSelecionado.id));
    setEditando(false);
  };

  const criarPoema = () => {
    const id = create({ titulo: 'Novo Poema', corpo: '' });
    setPoemaSelecionado(getById(id));
    setEditando(true);
    setEditForm({ titulo: 'Novo Poema', autor: '', ano: '', corpo: '', formato: 'verso' });
  };

  if (!poemaSelecionado && poemas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <div className="text-center">
          <Book size={48} className="mx-auto mb-4 opacity-25" />
          <p className="text-lg mb-2">Nenhum poema cadastrado</p>
          <button
            onClick={criarPoema}
            className="mt-4 px-4 py-2 bg-accent-main rounded-lg text-sm font-medium hover:bg-accent-main/90 cursor-pointer"
          >
            Cadastrar primeiro poema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {editando ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl space-y-4"
          >
            <input
              value={editForm.titulo}
              onChange={(e) => setEditForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Título do poema"
              className="w-full bg-transparent text-2xl font-bold text-text-primary text-center focus:outline-none border-b border-border-subtle pb-2"
            />
            <div className="flex gap-4 justify-center">
              <input
                value={editForm.autor}
                onChange={(e) => setEditForm(f => ({ ...f, autor: e.target.value }))}
                placeholder="Autor"
                className="bg-transparent text-sm text-text-secondary text-center focus:outline-none"
              />
              <input
                value={editForm.ano}
                onChange={(e) => setEditForm(f => ({ ...f, ano: e.target.value }))}
                placeholder="Ano"
                className="w-16 bg-transparent text-sm text-text-secondary text-center focus:outline-none"
              />
            </div>
            <textarea
              value={editForm.corpo}
              onChange={(e) => setEditForm(f => ({ ...f, corpo: e.target.value }))}
              placeholder="Cole o poema aqui..."
              rows={12}
              className="w-full bg-bg-secondary border border-border-subtle rounded-lg p-6 text-lg text-text-primary leading-loose font-serif focus:border-accent-main focus:outline-none resize-none"
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="flex justify-center gap-2">
              <button
                onClick={salvarEdicao}
                className="px-4 py-2 bg-success rounded-lg text-sm cursor-pointer"
              >
                <Save size={14} className="inline mr-1" /> Salvar
              </button>
              <button
                onClick={() => setEditando(false)}
                className="px-4 py-2 bg-bg-tertiary border border-border-subtle rounded-lg text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              key={poemaSelecionado?.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-2xl text-center"
            >
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {poemaSelecionado?.titulo}
              </h1>
              <p className="text-sm text-text-muted mb-8">
                {poemaSelecionado?.autor}
                {poemaSelecionado?.ano && ` · ${poemaSelecionado.ano}`}
              </p>
              <pre
                className="text-xl leading-loose font-serif text-text-primary whitespace-pre-wrap select-all"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {poemaSelecionado?.corpo}
              </pre>
            </motion.div>

            <div className="mt-12 flex items-center gap-4">
              <button
                onClick={() => navegar('ant')}
                className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
                title="Poema anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => {
                  registrarRecitacao(poemaSelecionado.id);
                }}
                className="px-6 py-3 bg-success rounded-full text-sm font-medium hover:bg-success/80 transition-colors cursor-pointer"
                title="Recitei!"
              >
                <Mic size={16} className="inline mr-2" /> Recitei!
              </button>
              <button
                onClick={() => navegar('prox')}
                className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
                title="Próximo"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {poemaSelecionado?.streak_recitacao > 0 && (
              <p className="mt-4 text-sm text-xp-gold">
                🔥 Streak: {poemaSelecionado.streak_recitacao} dia{poemaSelecionado.streak_recitacao > 1 ? 's' : ''}
              </p>
            )}

            <button
              onClick={() => iniciarEdicao(poemaSelecionado)}
              className="mt-4 px-3 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs cursor-pointer"
            >
              <Edit3 size={12} className="inline mr-1" /> Editar
            </button>
          </>
        )}
      </div>

      <div className="w-48 border-l border-border-subtle bg-bg-secondary overflow-auto">
        <div className="p-2 border-b border-border-subtle">
          <button
            onClick={criarPoema}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-accent-main rounded text-xs font-medium cursor-pointer"
          >
            <Plus size={12} /> Poema
          </button>
        </div>
        <div className="divide-y divide-border-subtle">
          {poemas.map(p => (
            <button
              key={p.id}
              onClick={() => { setPoemaSelecionado(p); setEditando(false); }}
              className={`w-full p-2 text-left text-xs hover:bg-bg-tertiary cursor-pointer ${
                poemaSelecionado?.id === p.id ? 'bg-bg-tertiary border-l-2 border-accent-main' : ''
              }`}
            >
              <p className="font-medium text-text-primary truncate">{p.titulo}</p>
              <p className="text-text-muted truncate">{p.autor}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}