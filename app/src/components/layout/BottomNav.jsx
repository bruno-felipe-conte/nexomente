import PropTypes from 'prop-types';
import { Home, FileText, BookOpen, Layers, MessageSquare, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'dashboard', icon: Home,         label: 'Início',  color: '#7C6FFA' },
  { id: 'notes',     icon: FileText,      label: 'Notas',   color: '#A78BFA' },
  { id: 'study',     icon: BookOpen,      label: 'Estudo',  color: '#22D3EE' },
  { id: 'flashcards',icon: Layers,        label: 'Cards',   color: '#F472B6' },
  { id: 'ai',        icon: MessageSquare, label: 'IA',      color: '#22D3EE' },
  { id: 'settings',  icon: Settings,      label: 'Config',  color: '#7D869E' },
];

export default function BottomNav({ currentPage, onNavigate }) {
  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-end"
      style={{ background: 'rgba(4, 5, 13, 0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(33,38,61,0.8)' }}
    >
      {/* active page glow strip */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,111,250,0.5), transparent)' }} />

      <div className="w-full flex items-center justify-around px-1 pb-safe pt-1 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center min-w-[44px] gap-0.5 py-1 transition-all duration-150"
            >
              {/* active indicator dot above icon */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-[1px] w-8 h-[2px] rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${item.color}, transparent)`,
                    boxShadow: `0 0 8px ${item.color}80`,
                  }}
                />
              )}

              <div
                className="flex items-center justify-center w-9 h-7 rounded-lg transition-all duration-150"
                style={isActive ? {
                  background: `linear-gradient(135deg, ${item.color}25, ${item.color}10)`,
                  boxShadow: `0 0 12px ${item.color}30`,
                } : {}}
              >
                <Icon
                  size={18}
                  style={isActive
                    ? { color: item.color, filter: `drop-shadow(0 0 6px ${item.color}80)` }
                    : { color: '#7D869E' }
                  }
                />
              </div>

              <span
                className="text-[8px] font-mono font-bold uppercase tracking-wider hidden min-[360px]:block"
                style={{ color: isActive ? item.color : '#4E5570' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

BottomNav.propTypes = {
  currentPage: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
};
