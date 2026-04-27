import { Menu, Search, Minus, Square, X, Bell, ChevronRight, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

const pageTitles = {
  dashboard: 'Dashboard',
  notes: 'Notas',
  study: 'Estudo',
  flashcards: 'Flashcards',
  graph: 'Grafo de Conexões',
  statistics: 'Estatísticas',
  settings: 'Configurações',
  gerador: 'Gerador',
  poemas: 'Poemas',
  ai: 'Chat IA',
};

export default function Header({ title, onToggleSidebar }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header
      className="
        flex items-center justify-between h-14 px-4
        bg-surface-base/80 backdrop-blur-md
        sticky top-0 z-40
      "
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: Menu toggle + Breadcrumb */}
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Alternar menu lateral"
          className="p-2 rounded-lg hover:bg-surface-elevated text-text-lo transition-colors"
        >
          <Menu size={20} />
        </button>

        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-text-hi font-bold capitalize tracking-tight">{pageTitles[title] || title}</span>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-lo/40 group-focus-within:text-color-gerador transition-colors" />
          <input
            type="text"
            placeholder="Buscar... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated/50 border border-[#333] rounded-lg
                       text-text-hi placeholder-text-lo/30 text-xs
                       focus:border-color-gerador/30 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Notifications + Identity */}
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="relative text-text-lo hover:text-text-hi transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-color-gerador rounded-full border-2 border-surface-base" />
        </button>

        {/* Avatar Interativo */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`
              w-8 h-8 rounded-full border transition-all flex items-center justify-center font-black text-[11px]
              ${isProfileOpen ? 'border-color-gerador bg-color-gerador/10 text-color-gerador' : 'border-[#444] bg-surface-elevated text-text-hi hover:border-[#666]'}
            `}
          >
            B
          </button>

          {/* Popover de Perfil (E3.2) */}
          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-64 bg-surface-base border border-[#333] rounded-2xl shadow-2xl z-50 p-5 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-[#444] flex items-center justify-center text-text-hi font-black">
                        B
                      </div>
                      <div>
                        <p className="text-xs font-black text-text-hi uppercase tracking-widest">Bruno</p>
                        <p className="text-[10px] font-bold text-text-lo uppercase tracking-tighter opacity-60">[LVL 12]</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-surface-elevated rounded-lg text-text-lo transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </div>

                  {/* XP Bar no Popover */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-text-lo uppercase tracking-[0.2em]">
                      <span>Progresso</span>
                      <span className="text-text-hi">4.82K XP</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-[#333]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '68%' }}
                        className="h-full bg-color-gerador shadow-[0_0_8px_var(--color-gerador)]" 
                      />
                    </div>
                  </div>

                  {/* Links de Gestão solicitados (Eletivos) */}
                  <div className="mt-6 pt-4 border-t border-[#333] grid grid-cols-2 gap-2">
                    <button className="py-2 text-[9px] font-black uppercase tracking-widest text-text-lo hover:text-text-hi transition-colors bg-surface-elevated rounded-lg">Perfil</button>
                    <button className="py-2 text-[9px] font-black uppercase tracking-widest text-text-lo hover:text-text-hi transition-colors bg-surface-elevated rounded-lg">Logout</button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Window controls Electron */}
        {window.electronAPI && (
          <div className="flex items-center gap-2 ml-2 border-l border-[#333] pl-4">
            <button onClick={() => window.electronAPI.minimize()} className="text-text-lo hover:text-text-hi"><Minus size={16} /></button>
            <button onClick={() => window.electronAPI.maximize()} className="text-text-lo hover:text-text-hi"><Square size={14} /></button>
            <button onClick={() => window.electronAPI.close()} className="text-text-lo hover:text-color-error"><X size={16} /></button>
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
