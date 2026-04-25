import { 
  Home, FileText, BookOpen, Layers, 
  GitBranch, BarChart3, Settings,
  Sparkles, Folder, Cloud, Book, MessageSquare, ClipboardList
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'notes', label: 'Notas', icon: FileText },
  { id: 'study', label: 'Estudo', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'poemas', label: 'Poemas', icon: Book },
  { id: 'gerador', label: 'Gerador', icon: ClipboardList },
  { id: 'ai', label: 'Chat IA', icon: MessageSquare },
  { id: 'graph', label: 'Grafo', icon: GitBranch },
  { id: 'statistics', label: 'Estatísticas', icon: BarChart3 },
];

export default function Sidebar({ isOpen, onToggle, currentPage, onNavigate }) {
  return (
    <aside
      role="complementary"
      aria-label="Navegação principal"
      className={`
        flex flex-col bg-bg-secondary border-r border-border-subtle
        transition-all duration-200 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        {isOpen && (
          <span className="text-xl font-bold text-accent-main">NexoMente</span>
        )}
      </div>

      {/* Navigation */}
      <nav role="navigation" aria-label="Menu principal" className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={!isOpen ? item.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg
                transition-all duration-150
                ${isActive 
                  ? 'bg-bg-tertiary text-accent-main border-l-2 border-accent-main' 
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }
              `}
            >
              <Icon size={20} aria-hidden="true" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* AI Status */}
      {isOpen && (
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Sparkles size={16} className="text-accent-light" />
            <span>IA Online</span>
            <span className="w-2 h-2 rounded-full bg-success ml-auto"></span>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="p-2 border-t border-border-subtle">
        <button
          id="nav-settings"
          onClick={() => onNavigate('settings')}
          aria-label="Configurações"
          aria-current={currentPage === 'settings' ? 'page' : undefined}
          title={!isOpen ? 'Configurações' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            transition-all duration-150
            ${currentPage === 'settings'
              ? 'bg-bg-tertiary text-accent-main'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }
          `}
        >
          <Settings size={20} aria-hidden="true" />
          {isOpen && <span className="text-sm font-medium">Configurações</span>}
        </button>
      </div>

      {/* Sync Status */}
      {isOpen && (
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Cloud size={14} />
            <span>Drive: Sincronizado</span>
          </div>
        </div>
      )}
    </aside>
  );
}