import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { Home, FileText, BookOpen, Layers, GitBranch, BarChart3, Settings, Sparkles, MessageSquare, ClipboardList, Book } from 'lucide-react';
import { useAIStore } from '../../store/useAIStore';

const NAV_GROUPS = [
  {
    label: 'Estudo',
    items: [
      { id: 'notes',      label: 'Notas',       icon: FileText,      color: '#A78BFA' },
      { id: 'study',      label: 'Estudo',       icon: BookOpen,      color: '#22D3EE' },
      { id: 'flashcards', label: 'Flashcards',   icon: Layers,        color: '#F472B6' },
    ]
  },
  {
    label: 'Criação',
    items: [
      { id: 'gerador',    label: 'Gerador IA',   icon: ClipboardList, color: '#FBBF24' },
      { id: 'poemas',     label: 'Poemas',        icon: Book,          color: '#34D399' },
    ]
  },
  {
    label: 'Rede Neural',
    items: [
      { id: 'ai',         label: 'Chat Neural',  icon: MessageSquare, color: '#22D3EE' },
      { id: 'graph',      label: 'Grafo',         icon: GitBranch,     color: '#818CF8' },
      { id: 'statistics', label: 'Métricas',      icon: BarChart3,     color: '#34D399' },
    ]
  }
];

const DASHBOARD_ITEM = { id: 'dashboard', label: 'Início', icon: Home, color: '#7C6FFA' };

function NavButton({ item, isActive, isOpen, onNavigate }) {
  const Icon = item.icon;

  return (
    <div className="relative px-2">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onNavigate(item.id)}
        className={`
          w-full flex items-center py-2.5 rounded-nx-md transition-all duration-nx-fast relative group
          ${isOpen ? 'gap-3 px-3' : 'justify-center px-0'}
          ${isActive ? 'text-white' : 'text-nx-dim hover:text-nx-bright'}
        `}
        style={isActive ? {
          background: 'linear-gradient(135deg, rgba(124,111,250,0.20) 0%, rgba(34,211,238,0.10) 100%)',
          borderLeft: isOpen ? `2px solid ${item.color || '#7C6FFA'}` : 'none',
          paddingLeft: isOpen ? '10px' : undefined,
          boxShadow: `0 0 16px rgba(124,111,250,0.12)`,
        } : {
          borderLeft: isOpen ? '2px solid transparent' : 'none',
        }}
      >
        {/* hover bg */}
        {!isActive && (
          <div className="absolute inset-0 rounded-nx-md bg-nx-surface opacity-0 group-hover:opacity-100 transition-opacity duration-nx-fast" />
        )}

        <div
          className="relative z-10 flex items-center justify-center w-7 h-7 rounded-nx-xs transition-all duration-nx-fast"
          style={isActive ? {
            background: `linear-gradient(135deg, ${item.color || '#7C6FFA'}30, ${item.color || '#7C6FFA'}15)`,
            color: item.color || '#7C6FFA',
          } : {}}
        >
          <Icon
            size={16}
            className="transition-colors duration-nx-fast"
            style={isActive ? { color: item.color || '#7C6FFA' } : {}}
          />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.12 }}
              className="relative z-10 text-nx-base font-medium tracking-wide overflow-hidden whitespace-nowrap"
              style={isActive ? { color: '#EBF0FF' } : {}}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {isActive && isOpen && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute right-3 z-10 w-1.5 h-1.5 rounded-full"
            style={{ background: item.color || '#7C6FFA', boxShadow: `0 0 6px ${item.color || '#7C6FFA'}` }}
          />
        )}
        {isActive && !isOpen && (
          <motion.div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 w-1 h-1 rounded-full"
            style={{ background: item.color || '#7C6FFA', boxShadow: `0 0 6px ${item.color || '#7C6FFA'}` }}
          />
        )}
      </motion.button>
    </div>
  );
}

NavButton.propTypes = {
  item: PropTypes.object.isRequired,
  isActive: PropTypes.bool,
  isOpen: PropTypes.bool,
  onNavigate: PropTypes.func.isRequired,
};

export default function Sidebar({ isOpen, currentPage, onNavigate, className = '' }) {
  const { status } = useAIStore();
  const isOnline = status === 'online';

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-nx-border ${className}`}
      style={{
        background: 'linear-gradient(180deg, #080B18 0%, #060818 100%)',
        width: isOpen ? 'var(--nx-sidebar-width)' : '72px',
        transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* LOGO */}
      <div className="h-[72px] flex items-center shrink-0 px-3" style={{ justifyContent: isOpen ? 'flex-start' : 'center', paddingLeft: isOpen ? '20px' : '12px', transition: 'padding 200ms ease' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 group"
        >
          <div
            className="w-9 h-9 rounded-nx-sm flex items-center justify-center shrink-0 transition-transform duration-nx-fast group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #7C6FFA 0%, #22D3EE 100%)',
              boxShadow: '0 0 20px rgba(124,111,250,0.35)',
            }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[17px] font-display font-black tracking-tighter leading-none overflow-hidden whitespace-nowrap"
              >
                <span className="text-nx-bright">Nexo</span>
                <span className="text-gradient-primary">Mente</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* NAV */}
      <nav className={`flex-1 ${isOpen ? 'overflow-y-auto' : 'overflow-hidden'} py-3 space-y-6 scrollbar-none`}>
        {/* Dashboard */}
        <div>
          <NavButton
            item={DASHBOARD_ITEM}
            isActive={currentPage === DASHBOARD_ITEM.id}
            isOpen={isOpen}
            onNavigate={onNavigate}
          />
        </div>

        {/* Groups */}
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="space-y-1">
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="px-5 mb-2 flex items-center gap-2"
                >
                  <span className="text-[9px] font-mono font-black tracking-[0.25em] uppercase" style={{ color: 'rgba(124,111,250,0.55)' }}>
                    {group.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(124,111,250,0.20) 0%, transparent 100%)' }} />
                </motion.div>
              )}
            </AnimatePresence>
            {group.items.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={currentPage === item.id}
                isOpen={isOpen}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="mt-auto border-t border-nx-border/60 p-3">
        {/* AI Status */}
        <div className={`flex items-center gap-2.5 px-2 py-2 mb-1 ${!isOpen && 'justify-center'}`}>
          <div
            className="w-2 h-2 rounded-full shrink-0 animate-pulse-glow"
            style={{
              background: isOnline ? '#34D399' : '#F87171',
              boxShadow: `0 0 8px ${isOnline ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)'}`,
            }}
          />
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="text-[9px] font-mono font-black tracking-widest uppercase"
                style={{ color: isOnline ? '#34D399' : '#F87171' }}
              >
                {status}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <NavButton
          item={{ id: 'settings', label: 'Configurações', icon: Settings, color: '#7D869E' }}
          isActive={currentPage === 'settings'}
          isOpen={isOpen}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  currentPage: PropTypes.any,
  onNavigate: PropTypes.func,
  className: PropTypes.string,
};
