import { useCallback, useRef } from 'react';
import { 
  Home, FileText, BookOpen, Layers, 
  GitBranch, BarChart3, Settings,
  Sparkles, Cloud, Book, MessageSquare, ClipboardList
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: Home },
  { id: 'notes',     label: 'Notas',       icon: FileText },
  { id: 'study',     label: 'Estudo',      icon: BookOpen },
  { id: 'flashcards',label: 'Flashcards', icon: Layers },
  { id: 'poemas',    label: 'Poemas',      icon: Book },
  { id: 'gerador',  label: 'Gerador',     icon: ClipboardList },
  { id: 'ai',       label: 'Chat IA',     icon: MessageSquare },
  { id: 'graph',    label: 'Grafo',       icon: GitBranch },
  { id: 'statistics',label: 'Estatísticas',icon: BarChart3 },
];

export default function Sidebar({ isOpen, currentPage, onNavigate }) {
  const navRef = useRef(null);

  const focusNavItem = useCallback((direction) => {
    const nav = navRef.current;
    if (!nav) return;
    const btns = Array.from(nav.querySelectorAll('button[id^="nav-"]'));
    const idx = btns.findIndex(b => b.id === `nav-${currentPage}`);
    let next = idx + direction;
    if (next < 0) next = btns.length - 1;
    if (next >= btns.length) next = 0;
    btns[next]?.focus();
  }, [currentPage]);

  const handleKeyDown = useCallback((e) => {
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      focusNavItem(-1);
    } else if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      focusNavItem(1);
    }
  }, [focusNavItem]);

  return (
    <aside
      role="complementary"
      aria-label="Navegação principal"
      className={`
        flex flex-col bg-bg-secondary border-r border-border-subtle
        transition-all duration-200 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
      `}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        {isOpen && (
          <span className="text-xl font-bold text-accent-main">NexoMente</span>
        )}
      </div>

      <nav
        ref={navRef}
        role="navigation"
        aria-label="Menu principal"
        className="flex-1 p-2 space-y-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onNavigate(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onNavigate(item.id);
              }}
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

      {isOpen && (
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Sparkles size={16} className="text-accent-light" />
            <span>IA Online</span>
            <span className="w-2 h-2 rounded-full bg-success ml-auto" />
          </div>
        </div>
      )}

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