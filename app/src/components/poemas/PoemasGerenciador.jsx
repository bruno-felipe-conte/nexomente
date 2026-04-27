import { useState } from 'react';
import { Search, Plus, ArrowLeft, Book, Edit3, Trash2 } from 'lucide-react';
import { usePoemas } from '../../hooks/useMaterias';
import PropTypes from 'prop-types';

export default function PoemasGerenciador({ onLeitura, onSelectPoema }) {
  const { poemas, create, update, remove } = usePoemas();
  
  const [tela, setTela] = useState('lista'); // 'lista' | 'editar'
  const [editForm, setEditForm] = useState({ id: null, titulo: '', autor: '', ano: '', corpo: '', formato: 'verso' });
  const [busca, setBusca] = useState('');

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
    } else {
      create(editForm);
    }
    setTela('lista');
  };

  const criarPoema = () => {
    setEditForm({ id: null, titulo: 'Novo Poema', autor: '', ano: '', corpo: '', formato: 'verso' });
    setTela('editar');
  };

  const poemasFiltrados = poemas.filter(p => 
    p.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    (p.autor && p.autor.toLowerCase().includes(busca.toLowerCase()))
  );

  if (tela === 'editar') {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (editForm.titulo.trim()) salvarEdicao();
      }
      if (e.key === 'Escape') setTela('lista');
    };

    return (
      <div className="flex flex-col h-full p-6 max-w-3xl mx-auto w-full" onKeyDown={handleKeyDown}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {editForm.id ? 'Editar Poema' : 'Novo Poema'}
          </h1>
          <button 
            onClick={() => setTela('lista')}
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
                autoFocus
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

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gerenciar Poemas</h1>
          <p className="text-sm text-text-muted">Adicione, edite ou remova seus poemas</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onLeitura}
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
                        onClick={() => onSelectPoema(p)}
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

PoemasGerenciador.propTypes = {
  onLeitura: PropTypes.func,
  onSelectPoema: PropTypes.func,
};
