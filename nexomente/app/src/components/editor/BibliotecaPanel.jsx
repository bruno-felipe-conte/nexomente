import { useState } from 'react';
import {
  FolderOpen, Plus, Folder, FileText, BookOpen, Lightbulb,
  Calendar, Bookmark, BookMarked, ChevronRight
} from 'lucide-react';

const tipoIcones = {
  pasta_raiz: FolderOpen,
  livros: BookOpen,
  projetos: Folder,
  ideias: Lightbulb,
  diario: Calendar,
  estudo: BookMarked,
  biblia: Bookmark,
  inbox: FileText,
};

const tipoCores = {
  pasta_raiz: '#6C63FF',
  livros: '#8B5CF6',
  projetos: '#3B82F6',
  ideias: '#EC4899',
  diario: '#10B981',
  estudo: '#F59E0B',
  biblia: '#F59E0B',
  inbox: '#9CA3AF',
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
    if (catId === 'pasta_raiz') return notas;
    if (catId === 'inbox') return notas.filter(n => !n.pasta_id || n.pasta_id === 'inbox');
    return notas.filter(n => n.tipo === catId);
  };

  const countCategoria = (catId) => {
    return notasPorCategoria(catId).length;
  };

  return (
    <div className="w-60 border-r border-border-subtle flex flex-col bg-bg-secondary">
      <div className="p-3 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Bibliotecas</span>
        <button
          onClick={() => {
            const id = `pasta_${Date.now()}`;
            if (novaPasta.trim()) {
              onCriarPasta?.({ id, nome: novaPasta.trim(), tipo: 'pasta_raiz' });
              setNovaPasta('');
            } else {
              setNovaPasta('__new__');
            }
          }}
          className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-accent-main cursor-pointer"
          title="Nova biblioteca"
        >
          <Plus size={14} />
        </button>
      </div>

      {novaPasta === '__new__' && (
        <div className="px-3 py-2 border-b border-border-subtle">
          <input
            autoFocus
            type="text"
            value={novaPasta === '__new__' ? '' : novaPasta}
            onChange={(e) => setNovaPasta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && novaPasta.trim()) {
                onCriarPasta?.({ id: `pasta_${Date.now()}`, nome: novaPasta.trim(), tipo: 'pasta_raiz' });
                setNovaPasta('');
              } else if (e.key === 'Escape') {
                setNovaPasta('');
              }
            }}
            onBlur={() => {
              if (novaPasta.trim()) {
                onCriarPasta?.({ id: `pasta_${Date.now()}`, nome: novaPasta.trim(), tipo: 'pasta_raiz' });
              }
              setNovaPasta('');
            }}
            placeholder="Nome da biblioteca..."
            className="w-full bg-bg-tertiary border border-border-subtle rounded px-2 py-1 text-sm text-text-primary placeholder-text-muted focus:border-accent-main focus:outline-none"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto py-1">
        {categorias.map(cat => {
          const Icon = tipoIcones[cat.id] || Folder;
          const cor = tipoCores[cat.id] || '#6C63FF';
          const count = countCategoria(cat.id);
          const expandida = categoriaExpandida === cat.id;
          const notasCat = notasPorCategoria(cat.id);

          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategoria(cat.id)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-bg-tertiary cursor-pointer ${
                  notaSelecionada?.pasta_id === cat.id || notaSelecionada?.tipo === cat.id
                    ? 'bg-bg-tertiary border-l-2'
                    : ''
                }`}
                style={{ borderLeftColor: notaSelecionada?.pasta_id === cat.id || notaSelecionada?.tipo === cat.id ? cor : 'transparent' }}
              >
                <ChevronRight
                  size={12}
                  className={`text-text-muted transition-transform ${expandida ? 'rotate-90' : ''}`}
                />
                <Icon size={14} style={{ color: cor }} />
                <span className="flex-1 text-left text-text-primary truncate">{cat.nome}</span>
                <span className="text-xs text-text-muted tabular-nums">{count}</span>
              </button>

              {expandida && notasCat.length > 0 && (
                <div className="ml-4 border-l border-border-subtle/50">
                  {notasCat.slice(0, 20).map(nota => {
                    const NotaIcon = tipoIcones[nota.tipo] || FileText;
                    const NotaCor = tipoCores[nota.tipo] || '#6C63FF';
                    return (
                      <button
                        key={nota.id}
                        onClick={() => onMoverNota?.(nota.id, cat.id)}
                        className={`w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-bg-tertiary cursor-pointer ${
                          notaSelecionada?.id === nota.id ? 'bg-accent-main/10' : ''
                        }`}
                        title={`Mover "${nota.titulo}" para ${cat.nome}`}
                      >
                        <NotaIcon size={10} style={{ color: NotaCor }} />
                        <span className="flex-1 text-left text-text-secondary truncate">
                          {nota.titulo}
                        </span>
                      </button>
                    );
                  })}
                  {notasCat.length > 20 && (
                    <p className="px-3 py-1 text-xs text-text-muted">
                      +{notasCat.length - 20} mais
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}