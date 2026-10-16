import PropTypes from 'prop-types';
import {
  FileText, BookOpen, Lightbulb,
  Calendar, Bookmark, BookMarked, Plus
} from 'lucide-react';

const tipoIcons = {
  pasta_raiz: BookOpen,
  livro: BookOpen,
  projeto: FileText,
  ideia: Lightbulb,
  diario: Calendar,
  estudo: BookMarked,
  biblia: Bookmark,
  inbox: FileText,
};

export default function BibliotecaPanel({
  notas,
  notaSelecionada,
  categoriaAtiva = 'pasta_raiz',
  onSelectCategoria,
  onCriarPasta
}) {
  const categorias = [
    { id: 'pasta_raiz', nome: 'Todas', tipo: 'pasta_raiz' },
    { id: 'inbox', nome: 'Inbox', tipo: 'inbox' },
    { id: 'livro', nome: 'Livros', tipo: 'livro' },
    { id: 'projeto', nome: 'Projetos', tipo: 'projeto' },
    { id: 'ideia', nome: 'Ideias', tipo: 'ideia' },
    { id: 'estudo', nome: 'Estudo', tipo: 'estudo' },
    { id: 'biblia', nome: 'Bíblia', tipo: 'biblia' },
  ];

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
          onClick={onCriarPasta}
          title="Nova nota nesta categoria"
          aria-label="Nova nota nesta categoria"
          className="p-1 text-text-lo/40 hover:text-accent-main transition-colors cursor-pointer"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex flex-col">
        {categorias.map(cat => {
          const Icon = tipoIcons[cat.id] || FileText;
          const count = countCategoria(cat.id);
          const isActive = categoriaAtiva
            ? categoriaAtiva === cat.id
            : (notaSelecionada?.tipo === cat.id || (cat.id === 'pasta_raiz' && !notaSelecionada?.tipo));

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategoria?.(cat.id)}
              className={`w-full px-5 py-2.5 flex items-center gap-3 text-[12px] transition-all cursor-pointer relative group ${
                isActive
                  ? 'bg-white/5 text-text-hi border-l-2 border-accent-main font-bold'
                  : 'text-text-lo/60 hover:text-text-hi hover:bg-white/[0.02] border-l-2 border-transparent'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-accent-main' : 'opacity-40 group-hover:opacity-100'} />
              <span className="flex-1 text-left truncate font-medium">
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
  categoriaAtiva: PropTypes.string,
  onSelectCategoria: PropTypes.func,
  onMoverNota: PropTypes.func,
  onCriarPasta: PropTypes.func,
};
