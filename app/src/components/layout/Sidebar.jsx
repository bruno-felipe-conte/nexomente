import { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  Home, FileText, BookOpen, Layers,
  GitBranch, BarChart3, Settings,
  Sparkles, Cloud, Book, MessageSquare, ClipboardList
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'ESTUDO',
    items: [
      { id: 'notes',      label: 'Notas',       icon: FileText,      color: 'var(--color-notas)',      shortcut: 'Ctrl+2' },
      { id: 'study',      label: 'Estudo',      icon: BookOpen,      color: 'var(--color-estudo)',     shortcut: 'Ctrl+3' },
      { id: 'flashcards', label: 'Flashcards',  icon: Layers,        color: 'var(--color-flashcards)', shortcut: 'Ctrl+4' },
    ]
  },
  {
    label: 'CRIAÇÃO',
    items: [
      { id: 'gerador',    label: 'Gerador',     icon: ClipboardList, color: 'var(--color-gerador)',    shortcut: 'Ctrl+5' },
      { id: 'poemas',     label: 'Poemas',      icon: Book,          color: 'var(--color-poemas)',     shortcut: 'Ctrl+P' },
    ]
  },
  {
    label: 'IA & DADOS',
    items: [
      { id: 'ai',         label: 'Chat IA',     icon: MessageSquare, color: 'var(--color-chat)',       shortcut: 'Ctrl+6' },
      { id: 'graph',      label: 'Grafo',       icon: GitBranch,     color: 'var(--color-grafo)',      shortcut: 'Ctrl+7' },
      { id: 'statistics', label: 'Estatísticas',icon: BarChart3,     color: 'var(--color-stats)',      shortcut: 'Ctrl+8' },
    ]
  }
];

const DASHBOARD_ITEM = { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'var(--text-hi)', shortcut: 'Ctrl+1' };

/**
 * NavButton — Estilo Ghost (Sem fundo, apenas borda lateral e cor de texto)
 */
function NavButton({ item, isActive, isOpen, onNavigate }) {
  const Icon = item.icon;

  return (
    <div className="relative px-3 group/nav">
      <motion.button
        whileTap={{ scale: 0.95 }}
        id={`nav-${item.id}`}
        onClick={() => onNavigate(item.id)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden
          ${isActive 
            ? 'bg-white/5 text-text-hi shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]' 
            : 'text-text-lo hover:text-text-mid hover:bg-white/[0.02]'}
        `}
      >
        {/* Active Indicator Glow */}
        {isActive && (
          <motion.div 
            layoutId="active-glow"
            className="absolute left-0 w-1 h-1/2 bg-accent-main rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        <Icon 
          size={18} 
          className={`transition-all duration-300 ${isActive ? 'text-accent-main drop-shadow-[0_0_8px_rgba(124,109,250,0.5)]' : 'group-hover/nav:text-text-hi'}`} 
        />
        {isOpen && (
          <span className={`text-[13px] font-medium tracking-wide transition-all ${isActive ? 'text-text-hi' : ''}`}>
            {item.label}
          </span>
        )}
      </motion.button>

      {!isOpen && (
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 glass-panel-light text-text-hi text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-all pointer-events-none translate-x-[-10px] group-hover/nav:translate-x-0">
          {item.label}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ isOpen, currentPage, onNavigate }) {
  const navRef = useRef(null);

  return (
    <aside className={`flex flex-col glass-panel !bg-[#0B0C13]/80 border-r border-white/5 transition-all duration-500 ease-spring ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* Cabeçalho Minimalista */}
      <div className="h-20 flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3 group cursor-pointer">
           <div className="w-8 h-8 bg-accent-main rounded-xl flex items-center justify-center shadow-glow-violet group-hover:scale-110 transition-transform">
              <Sparkles size={18} className="text-white" />
           </div>
           {isOpen && <span className="text-lg font-black tracking-tighter text-text-hi font-display group-hover:text-glow transition-all">NEXOMENTE</span>}
        </div>
      </div>

      <nav ref={navRef} className="flex-1 overflow-y-auto py-6 scrollbar-none">
        {/* Dashboard isolado */}
        <div className="mb-8">
          <NavButton item={DASHBOARD_ITEM} isActive={currentPage === DASHBOARD_ITEM.id} isOpen={isOpen} onNavigate={onNavigate} />
        </div>

        {/* Grupos com maior respiro */}
        <div className="space-y-10">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx}>
              {isOpen && (
                <div className="px-5 mb-4 text-[10px] font-black tracking-[0.2em] text-text-lo/40 uppercase">
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
        </div>
      </nav>

      {/* Rodapé de Utilidades */}
      <div className="mt-auto border-t border-[#333] bg-surface-base/50">
        <div className="px-5 py-4 space-y-4">
          <div className={`flex items-center gap-2 ${isOpen ? '' : 'justify-center'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-color-success shadow-[0_0_6px_rgba(132,226,110,0.4)]" />
            {isOpen && (
              <span className="text-[9px] font-mono font-bold tracking-tighter text-text-lo uppercase">
                IA ONLINE - LLAMA 3
              </span>
            )}
          </div>
          <button 
            onClick={() => onNavigate('settings')}
            className={`flex items-center gap-3 w-full text-text-lo hover:text-text-hi transition-colors ${isOpen ? '' : 'justify-center'}`}
          >
            <Settings size={16} />
            {isOpen && <span className="text-[11px] font-bold uppercase tracking-widest">Configurações</span>}
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
};
