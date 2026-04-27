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
    <div className="relative group/tip">
      <motion.button
        whileTap={{ scale: 0.98 }}
        id={`nav-${item.id}`}
        onClick={() => onNavigate(item.id)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 border-l-2
          ${isActive 
            ? 'border-color-gerador text-text-hi font-bold' 
            : 'border-transparent text-text-lo hover:text-text-mid'}
        `}
      >
        <Icon size={18} className={isActive ? 'text-color-gerador' : 'inherit'} />
        {isOpen && <span className="text-[13px] tracking-wide">{item.label}</span>}
      </motion.button>

      {!isOpen && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 bg-surface-overlay border border-surface-border text-text-hi text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity">
          {item.label}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ isOpen, currentPage, onNavigate }) {
  const navRef = useRef(null);

  return (
    <aside className={`flex flex-col bg-surface-base border-r border-[#333] transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'}`}>
      {/* Cabeçalho Minimalista */}
      <div className="h-14 flex items-center px-5 shrink-0">
        <span className="text-sm font-black tracking-[0.3em] text-text-hi uppercase font-display">NexoMente</span>
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
