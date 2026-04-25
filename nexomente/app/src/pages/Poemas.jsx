import { useState, useEffect } from 'react';
import {
  Book, Mic, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2, Settings, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePoemas } from '../hooks/useMaterias';

export default function PoemasPage() {
  const { poemas, create, update, remove, registrarRecitacao, getById, proximoPoema, poemaAnterior } = usePoemas();
  
  // 'leitura' | 'gerenciar' | 'editar'
  const [tela, setTela] = useState('leitura');
  
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);
  const [editForm, setEditForm] = useState({ id: null, titulo: '', autor: '', ano: '', corpo: '', formato: 'verso' });
  const [busca, setBusca] = useState('');

  // Seta um poema inicial se não houver
  useEffect(() => {
    if (poemas.length > 0 && !poemaSelecionado) {
      setPoemaSelecionado(poemas[0]);
    }
  }, [poemas, poemaSelecionado]);

  const navegar = (direcao) => {
    if (!poemaSelecionado) return;
    const p = direcao === 'prox' ? proximoPoema(poemaSelecionado.id) : poemaAnterior(poemaSelecionado.id);
    setPoemaSelecionado(p);
  };

  const iniciarEdicao = (poema) => {
    setEditForm({
      id: poema.id,
      titulo: poema.titulo,
      autor: poema.autor || '',
      ano: poema.ano || '',
      corpo: poema.corpo || '',
      formato: poema.formato || 'verso',
    });
    setTela('editar');
  };

  const salvarEdicao = () => {
    if (editForm.id) {
      update(editForm.id, editForm);
      if (poemaSelecionado?.id === editForm.id) {
        setPoemaSelecionado(getById(editForm.id));
      }
    } else {
      const novoId = create(editForm);
      setPoemaSelecionado(getById(novoId));
    }
    setTela('gerenciar');
  };

  const criarPoema = () => {
    setEditForm({ id: null, titulo: 'Novo Poema', autor: '', ano: '', corpo: '', formato: 'verso' });
    setTela('editar');
  };

  const poemasFiltrados = poemas.filter(p => 
    p.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    (p.autor && p.autor.toLowerCase().includes(busca.toLowerCase()))
  );

  // ─── TELA: LEITURA ─────────────────────────────────────────────
  if (tela === 'leitura') {
    if (!poemaSelecionado && poemas.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted h-full p-8">
          <Book size={48} className="mb-4 opacity-25" />
          <p className="text-lg mb-2">Nenhum poema cadastrado</p>
          <button
            onClick={() => setTela('gerenciar')}
            className="mt-4 px-4 py-2 bg-accent-main rounded-lg text-sm font-medium hover:bg-accent-main/90 text-white cursor-pointer"
          >
            Ir para Gerenciamento
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Leitura */}
        <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-secondary shrink-0">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Modo Leitura</h1>
            <p className="text-xs text-text-muted">Recite e memorize seus poemas</p>
          </div>
          <button 
            onClick={() => setTela('gerenciar')}
            className="px-4 py-2 bg-bg-tertiary hover:bg-accent-main/10 text-accent-main rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 border border-accent-main/30"
          >
            <Settings size={16} /> Gerenciar Poemas
          </button>
        </div>

        {/* Content Leitura */}
        <div className="flex-1 flex flex-col items-center overflow-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={poemaSelecionado?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                className="text-xl leading-loose font-serif text-text-primary whitespace-pre-wrap"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {poemaSelecionado?.corpo}
              </pre>
            </motion.div>
          </AnimatePresence>

          {/* Controles de Navegação */}
          <div className="mt-12 flex items-center gap-6 pb-8">
            <button
              onClick={() => navegar('ant')}
              className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
              title="Poema anterior"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex flex-col items-center">
              <button
                onClick={() => registrarRecitacao(poemaSelecionado.id)}
                className="px-8 py-4 bg-success rounded-full text-base font-medium hover:bg-success/80 transition-colors cursor-pointer shadow-lg flex items-center gap-2"
                title="Marcar como recitado hoje"
              >
                <Mic size={20} /> Recitei!
              </button>
              {poemaSelecionado?.streak_recitacao > 0 && (
                <p className="mt-3 text-sm font-medium text-xp-gold">
                  🔥 Streak: {poemaSelecionado.streak_recitacao} dia{poemaSelecionado.streak_recitacao > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <button
              onClick={() => navegar('prox')}
              className="p-3 bg-bg-secondary border border-border-subtle rounded-full hover:border-accent-main transition-colors cursor-pointer"
              title="Próximo poema"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA: GERENCIAR ───────────────────────────────────────────
  if (tela === 'gerenciar') {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Gerenciar Poemas</h1>
            <p className="text-sm text-text-muted">Adicione, edite ou remova seus poemas</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setTela('leitura')}
              className="px-4 py-2 bg-bg-tertiary hover:bg-border-subtle rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 text-text-secondary"
            >
              <ArrowLeft size={16} /> Voltar para Leitura
            </button>
            <button 
              onClick={criarPoema}
              className="px-4 py-2 bg-accent-main rounded-lg text-sm font-medium hover:bg-accent-main/90 text-white cursor-pointer flex items-center gap-2"
            >
              <Plus size={16} /> Novo Poema
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <input 
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou autor..."
              className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg text-sm focus:border-accent-main focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-border-subtle rounded-lg bg-bg-secondary">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-tertiary sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">Título</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Autor</th>
                <th className="px-4 py-3 font-medium text-text-secondary text-center">Streak</th>
                <th className="px-4 py-3 font-medium text-text-secondary text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {poemasFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-text-muted">Nenhum poema encontrado.</td>
                </tr>
              ) : (
                poemasFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{p.titulo}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.autor || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {p.streak_recitacao > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xp-gold bg-xp-gold/10 px-2 py-0.5 rounded-full text-xs font-bold">
                          🔥 {p.streak_recitacao}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setPoemaSelecionado(p); setTela('leitura'); }}
                          className="p-1.5 text-text-muted hover:text-accent-main rounded transition-colors"
                          title="Ler poema"
                        >
                          <Book size={16} />
                        </button>
                        <button 
                          onClick={() => iniciarEdicao(p)}
                          className="p-1.5 text-text-muted hover:text-text-primary rounded transition-colors"
                          title="Editar poema"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => remove(p.id)}
                          className="p-1.5 text-text-muted hover:text-danger rounded transition-colors"
                          title="Excluir poema"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── TELA: EDITAR / NOVO ───────────────────────────────────────
  if (tela === 'editar') {
    return (
      <div className="flex flex-col h-full p-6 max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {editForm.id ? 'Editar Poema' : 'Novo Poema'}
          </h1>
          <button 
            onClick={() => setTela('gerenciar')}
            className="px-4 py-2 bg-bg-tertiary hover:bg-border-subtle rounded-lg text-sm transition-colors text-text-secondary cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
        </div>

        <div className="space-y-6 flex-1 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase">Título</label>
              <input
                value={editForm.titulo}
                onChange={(e) => setEditForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: O Corvo"
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-4 py-2 focus:border-accent-main focus:outline-none text-text-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase">Autor</label>
              <input
                value={editForm.autor}
                onChange={(e) => setEditForm(f => ({ ...f, autor: e.target.value }))}
                placeholder="Ex: Edgar Allan Poe"
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-4 py-2 focus:border-accent-main focus:outline-none text-text-primary"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase">Ano (Opcional)</label>
            <input
              value={editForm.ano}
              onChange={(e) => setEditForm(f => ({ ...f, ano: e.target.value }))}
              placeholder="Ex: 1845"
              className="w-full md:w-1/3 bg-bg-secondary border border-border-subtle rounded-lg px-4 py-2 focus:border-accent-main focus:outline-none text-text-primary"
            />
          </div>

          <div className="space-y-1 flex-1 flex flex-col">
            <label className="text-xs font-medium text-text-secondary uppercase">Corpo do Poema</label>
            <textarea
              value={editForm.corpo}
              onChange={(e) => setEditForm(f => ({ ...f, corpo: e.target.value }))}
              placeholder="Cole o poema aqui..."
              className="w-full flex-1 bg-bg-secondary border border-border-subtle rounded-lg p-4 text-base leading-relaxed font-serif focus:border-accent-main focus:outline-none resize-none text-text-primary"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={salvarEdicao}
              disabled={!editForm.titulo.trim()}
              className="px-6 py-2.5 bg-accent-main text-white rounded-lg font-medium hover:bg-accent-main/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Salvar Poema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}