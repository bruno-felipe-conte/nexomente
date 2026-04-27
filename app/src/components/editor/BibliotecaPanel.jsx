import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FileText, BookOpen, Lightbulb,
  Calendar, Bookmark, BookMarked, Plus
} from 'lucide-react';

const tipoIcons = {
  pasta_raiz: BookOpen,
  livros: BookOpen,
  projetos: FileText,
  ideias: Lightbulb,
  diario: Calendar,
  estudo: BookMarked,
  biblia: Bookmark,
  inbox: FileText,
};

export default function BibliotecaPanel({ pastas, notas, notaSelecionada, onMoverNota, onCriarPasta }) {
  const [categoriaExpandida, setCategoriaExpandida] = useState('pasta_raiz');
  const [novaPasta, setNovaPasta] = useState('');

  const categorias = [
    { id: 'pasta_raiz', nome: 'Todas', tipo: 'pasta_raiz' },
    { id: 'inbox', nome: 'Inbox', tipo: 'inbox' },
    { id: 'livros', nome: 'Livros', tipo: 'livros' },
    { id: 'projetos', nome: 'Projetos', tipo: 'projetos' },
    { id: 'ideias', nome: 'Ideias', tipo: 'ideias' },
    { id: 'estudo', nome: 'Estudo', tipo: 'estudo' },
    { id: 'biblia', nome: 'Bíblia', tipo: 'biblia' },
  ];

  const toggleCategoria = (id) => {
    setCategoriaExpandida(prev => prev === id ? null : id);
  };

  const notasPorCategoria = (catId) => {
    const list = notas || [];
    if (catId === 'pasta_raiz') return list;
    if (catId === 'inbox') return list.filter(n => !n.pasta_id || n.pasta_id === 'inbox');
    return list.filter(n => n.tipo === catId);
  };

  const countCategoria = (catId) => {
    return notasPorCategoria(catId).length;
  };

  return (
    <div className="flex flex-col h-full pt-6 bg-bg-secondary/20">
      <div className="px-5 mb-6 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-lo/40">Bibliotecas</span>
        <button 
          onClick={() => setNovaPasta('__new__')}
          className="p-1 text-text-lo/40 hover:text-accent-main transition-colors cursor-pointer"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex flex-col">
        {categorias.map(cat => {
          const Icon = tipoIcons[cat.id] || FileText;
          const count = countCategoria(cat.id);
          const isActive = notaSelecionada?.tipo === cat.id || (cat.id === 'pasta_raiz' && !notaSelecionada?.tipo);

          return (
            <button
              key={cat.id}
              onClick={() => toggleCategoria(cat.id)}
              className={`w-full px-5 py-2.5 flex items-center gap-3 text-[12px] transition-all cursor-pointer relative group ${
                isActive 
                  ? 'bg-white/5 text-text-hi border-l-2 border-accent-main' 
                  : 'text-text-lo/60 hover:text-text-hi hover:bg-white/[0.02] border-l-2 border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-accent-main' : 'opacity-40 group-hover:opacity-100'} />
              <span className={`flex-1 text-left truncate font-medium ${isActive ? 'font-bold' : ''}`}>
                {cat.nome}
              </span>
              <span className="text-[9px] font-mono opacity-20 group-hover:opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

BibliotecaPanel.propTypes = {
  pastas: PropTypes.array,
  notas: PropTypes.array,
  notaSelecionada: PropTypes.object,
  onMoverNota: PropTypes.func,
  onCriarPasta: PropTypes.func,
};
