import { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  Home, FileText, BookOpen, Layers, 
  GitBranch, BarChart3, Settings,
  Sparkles, Cloud, Book, MessageSquare, ClipboardList
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'APRENDER',
    items: [
      { id: 'notes',      label: 'Notas',       icon: FileText,      color: 'var(--color-notas)',      shortcut: 'Ctrl+2' },
      { id: 'study',      label: 'Estudo',      icon: BookOpen,      color: 'var(--color-estudo)',     shortcut: 'Ctrl+3' },
      { id: 'flashcards', label: 'Flashcards',  icon: Layers,        color: 'var(--color-flashcards)', shortcut: 'Ctrl+4' },
    ]
  },
  {
    label: 'CRIAR',
    items: [
      { id: 'gerador',    label: 'Gerador',     icon: ClipboardList, color: 'var(--color-gerador)',    shortcut: 'Ctrl+5' },
      { id: 'poemas',     label: 'Poemas',      icon: Book,          color: 'var(--color-brand)',      shortcut: 'Ctrl+P' },
    ]
  },
  {
    label: 'EXPLORAR',
    items: [
      { id: 'ai',         label: 'Chat IA',     icon: MessageSquare, color: 'var(--color-chat)',       shortcut: 'Ctrl+6' },
      { id: 'graph',      label: 'Grafo',       icon: GitBranch,     color: 'var(--color-grafo)',      shortcut: 'Ctrl+7' },
      { id: 'statistics', label: 'Estatísticas',icon: BarChart3,     color: 'var(--color-stats)',      shortcut: 'Ctrl+8' },
    ]
  }
];

const DASHBOARD_ITEM = { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'var(--text-hi)', shortcut: 'Ctrl+1' };

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
        className="flex-1 overflow-y-auto py-4 space-y-6"
      >
        <div className="px-2">
          {(() => {
            const isActive = currentPage === DASHBOARD_ITEM.id;
            return (
              <button
                key={DASHBOARD_ITEM.id}
                id={`nav-${DASHBOARD_ITEM.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onNavigate(DASHBOARD_ITEM.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(DASHBOARD_ITEM.id); }}
                aria-label={DASHBOARD_ITEM.label}
                aria-current={isActive ? 'page' : undefined}
                title={`${DASHBOARD_ITEM.label} — ${DASHBOARD_ITEM.shortcut}`}
                style={isActive ? {
                  backgroundColor: `color-mix(in srgb, ${DASHBOARD_ITEM.color} 12%, transparent)`,
                  borderLeft: `3px solid ${DASHBOARD_ITEM.color}`,
                  color: DASHBOARD_ITEM.color
                } : { borderLeft: '3px solid transparent' }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
                  ${!isActive ? 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary' : ''}
                `}
              >
                <DASHBOARD_ITEM.icon size={20} aria-hidden="true" style={{ color: isActive ? DASHBOARD_ITEM.color : 'inherit' }} />
                {isOpen && <span className="text-sm font-medium">{DASHBOARD_ITEM.label}</span>}
              </button>
            );
          })()}
        </div>

        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx}>
            {isOpen && (
              <div className="px-5 mb-2 text-[10px] font-bold tracking-widest text-text-muted uppercase">
                {group.label}
              </div>
            )}
            {!isOpen && <div className="h-[1px] w-8 mx-auto bg-border-subtle mb-2" />}
            
            <div className="px-2 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => onNavigate(item.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(item.id); }}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={`${item.label} — ${item.shortcut}`}
                    style={isActive ? {
                      backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                      borderLeft: `3px solid ${item.color}`,
                      color: item.color
                    } : { borderLeft: '3px solid transparent' }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
                      ${!isActive ? 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary' : ''}
                    `}
                  >
                    <Icon size={20} aria-hidden="true" style={{ color: isActive ? item.color : 'inherit' }} />
                    {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  currentPage: PropTypes.any,
  onNavigate: PropTypes.func,
};
