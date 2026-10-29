import PropTypes from 'prop-types';
import { Home, FileText, Mic, Layers, GitBranch, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../lib/i18n';

export default function BottomNav({ currentPage, onNavigate }) {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { id: 'dashboard',  icon: Home,      label: t('nav.bottom.dashboard', 'Início') },
    { id: 'notes',      icon: FileText,  label: t('nav.bottom.notes', 'Notas') },
    { id: 'poemas',     icon: Mic,       label: t('nav.bottom.dojo', 'Dojo') },
    { id: 'flashcards', icon: Layers,    label: t('nav.bottom.cards', 'Cards') },
    { id: 'graph',      icon: GitBranch, label: t('nav.bottom.graph', 'Grafo') },
    { id: 'settings',   icon: Settings,  label: t('nav.bottom.settings', 'Config') },
  ];

  return (
    <nav
      aria-label="Navegação Inferior Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-nx-surface/95 backdrop-blur-md border-t border-nx-border shadow-[0_-4px_24px_rgba(44,38,35,0.08)] select-none"
    >
      <div className="w-full flex items-center justify-around px-2 pb-safe pt-1.5 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center min-w-[48px] py-1 transition-colors cursor-pointer group"
            >
              {/* Indicador superior ativo */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-1.5 w-8 h-[2.5px] rounded-full bg-nx-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <div
                className={`flex items-center justify-center w-10 h-7 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-nx-primary-bg text-nx-primary'
                    : 'text-nx-dim group-hover:text-nx-bright group-hover:bg-nx-overlay/60'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>

              <span
                className={`text-[9px] font-sans font-semibold uppercase tracking-wider truncate mt-0.5 ${
                  isActive ? 'text-nx-primary font-bold' : 'text-nx-dim group-hover:text-nx-text'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

BottomNav.propTypes = {
  currentPage: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
};
