import { Menu, Search, Minus, Square, X } from 'lucide-react';
import PropTypes from 'prop-types';

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
    <header 
      className="flex items-center justify-between h-14 px-4 bg-bg-secondary border-b border-border-subtle"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: Menu toggle + Breadcrumb */}
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          onClick={onToggleSidebar}
          aria-label="Alternar menu lateral"
          title="Alternar menu lateral"
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
      <div className="flex-1 max-w-md mx-8" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            aria-label="Buscar notas"
            placeholder="Buscar... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-subtle rounded-lg
                       text-text-primary placeholder-text-muted
                       focus:border-accent-main focus:outline-none"
          />
        </div>
      </div>

      {/* Right: Actions & Window Controls */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Future: user menu, notifications, etc */}
        {window.electronAPI && (
          <div className="flex items-center gap-1 ml-2 border-l border-border-subtle pl-2">
            <button 
              onClick={() => window.electronAPI.minimize()} 
              className="p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary rounded cursor-pointer transition-colors"
              aria-label="Minimizar janela" title="Minimizar"
            >
              <Minus size={16} />
            </button>
            <button 
              onClick={() => window.electronAPI.maximize()} 
              className="p-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary rounded cursor-pointer transition-colors"
              aria-label="Maximizar janela" title="Maximizar"
            >
              <Square size={14} />
            </button>
            <button 
              onClick={() => window.electronAPI.close()} 
              className="p-1.5 text-text-secondary hover:bg-danger hover:text-white rounded cursor-pointer transition-colors"
              aria-label="Fechar aplicativo" title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
Header.propTypes = {
  title: PropTypes.string,
  onToggleSidebar: PropTypes.func,
};
