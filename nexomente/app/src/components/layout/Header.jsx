import { Menu, Search } from 'lucide-react';

const pageTitles = {
  dashboard: 'Dashboard',
  notes: 'Notas',
  study: 'Estudo',
  flashcards: 'Flashcards',
  graph: 'Grafo de Conexões',
  statistics: 'Estatísticas',
  settings: 'Configurações',
};

export default function Header({ title, onToggleSidebar }) {
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-bg-secondary border-b border-border-subtle">
      {/* Left: Menu toggle + Breadcrumb */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 rounded hover:bg-bg-tertiary text-text-secondary"
        >
          <Menu size={20} />
        </button>
        
        <nav className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-accent-main font-medium">NexoMente</span>
          <span>/</span>
          <span className="text-text-primary">{pageTitles[title] || title}</span>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Buscar... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-lg
                       text-text-primary placeholder-text-muted
                       focus:border-accent-main focus:outline-none"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Future: user menu, notifications, etc */}
      </div>
    </header>
  );
}