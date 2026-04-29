import { useRef } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { Home, FileText, BookOpen, Layers, GitBranch, BarChart3, Settings, Sparkles, MessageSquare, ClipboardList, Book } from 'lucide-react';
import { useAIStore } from '../../store/useAIStore';

const NAV_GROUPS = [
  {
    label: 'Estudo',
    items: [
      { id: 'notes',      label: 'Notas',       icon: FileText },
      { id: 'study',      label: 'Estudo',      icon: BookOpen },
      { id: 'flashcards', label: 'Flashcards',  icon: Layers },
    ]
  },
  {
    label: 'Criação',
    items: [
      { id: 'gerador',    label: 'Gerador IA',  icon: ClipboardList },
      { id: 'poemas',     label: 'Poemas',      icon: Book },
    ]
  },
  {
    label: 'Rede Neural',
    items: [
      { id: 'ai',         label: 'Chat Neural', icon: MessageSquare },
      { id: 'graph',      label: 'Grafo',       icon: GitBranch },
      { id: 'statistics', label: 'Métricas',    icon: BarChart3 },
    ]
  }
];

const DASHBOARD_ITEM = { id: 'dashboard', label: 'Início', icon: Home };

function NavButton({ item, isActive, isOpen, onNavigate }) {
  const Icon = item.icon;

  return (
    <div className="relative px-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate(item.id)}
        className={`
          w-full flex items-center gap-4 px-4 py-3 rounded-nx-sm transition-all duration-nx-fast relative group
          ${isActive 
            ? 'bg-nx-primary text-white' 
            : 'text-nx-dim hover:text-nx-bright hover:bg-nx-surface'}
        `}
      >
        <Icon 
          size={18} 
          className={`transition-colors duration-nx-fast ${isActive ? 'text-white' : 'group-hover:text-nx-primary'}`} 
        />
        {isOpen && (
          <span className="text-nx-base font-ui font-medium tracking-wide">
            {item.label}
          </span>
        )}
        {isActive && isOpen && (
          <motion.div 
            layoutId="active-indicator"
            className="absolute right-3 w-1 h-3 rounded-full bg-white/40"
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
    <aside className={`hidden lg:flex flex-col bg-nx-depth border-r border-nx-border transition-all duration-nx-base ease-in-out ${isOpen ? 'w-nx-sidebar' : 'w-20'} ${className}`}>
      
      {/* LOGO v1.0 */}
      <div className="h-24 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => onNavigate('dashboard')}>
           <div className="w-10 h-10 bg-nx-primary rounded-nx-sm flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform duration-nx-fast">
              <Sparkles size={20} className="text-white" />
           </div>
           {isOpen && (
             <span className="text-nx-xl font-display font-black tracking-tighter text-nx-bright uppercase">
               Nexo<span className="text-nx-primary">Mente</span>
             </span>
           )}
        </div>
      </div>

      <nav className={`flex-1 ${isOpen ? 'overflow-y-auto' : 'overflow-hidden'} py-4 scrollbar-none space-y-8`}>
        {/* DASHBOARD */}
        <div>
          <NavButton item={DASHBOARD_ITEM} isActive={currentPage === DASHBOARD_ITEM.id} isOpen={isOpen} onNavigate={onNavigate} />
        </div>

        {/* GRUPOS */}
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            {isOpen && (
              <div className="px-7 text-nx-xs font-mono font-black tracking-[0.3em] text-nx-muted uppercase">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavButton key={item.id} item={item} isActive={currentPage === item.id} isOpen={isOpen} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER v1.0 */}
      <div className="mt-auto p-4 border-t border-nx-border">
        <div className="space-y-4">
          <div className={`flex items-center gap-3 px-3 py-2 ${isOpen ? '' : 'justify-center'}`}>
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-nx-base ${isOnline ? 'bg-nx-success' : 'bg-nx-error'}`} />
            {isOpen && (
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isOnline ? 'text-nx-dim' : 'text-nx-error'}`}>
                {status}
              </span>
            )}
          </div>
          
          <button 
            onClick={() => onNavigate('settings')}
            className={`flex items-center gap-4 px-4 py-3 w-full rounded-nx-sm text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-all duration-nx-fast ${isOpen ? '' : 'justify-center'}`}
          >
            <Settings size={18} />
            {isOpen && <span className="text-nx-base font-ui font-medium">Configurações</span>}
          </button>
        </div>
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
