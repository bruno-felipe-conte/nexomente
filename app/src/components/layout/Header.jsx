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
      className="flex items-center justify-between h-20 px-4 md:px-6 glass-panel !bg-[#0B0C13]/60 border-b border-white/5 sticky top-0 z-[100]"
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

      {/* Center: Search — Hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-lg mx-12" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-lo/40 group-focus-within:text-accent-main transition-colors" />
          <input
            type="text"
            placeholder="O que você deseja aprender hoje? (Ctrl+K)"
            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl
                       text-text-hi placeholder-text-lo/30 text-sm font-medium
                       focus:border-accent-main/30 focus:bg-white/[0.05] focus:outline-none transition-all inner-shadow"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-bold text-text-lo opacity-0 group-hover:opacity-100 transition-opacity">
             ⌘K
          </div>
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
              w-10 h-10 rounded-2xl border transition-all flex items-center justify-center font-black text-sm relative overflow-hidden group/avatar
              ${isProfileOpen ? 'border-accent-main bg-accent-main/10 text-accent-main shadow-glow-violet' : 'border-white/10 bg-surface-raised text-text-hi hover:border-white/30'}
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-main/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
            <span className="relative z-10">B</span>
          </button>

          {/* Popover de Perfil (E3.2) */}
          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-12 right-0 w-64 bg-surface-base border border-[#333] rounded-2xl shadow-2xl z-[120] p-5 overflow-hidden"
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
                    <button 
                      onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                      className="py-2 text-[9px] font-black uppercase tracking-widest text-text-lo hover:text-text-hi transition-colors bg-surface-elevated rounded-lg"
                    >
                      Config
                    </button>
                    <button className="py-2 text-[9px] font-black uppercase tracking-widest text-text-lo hover:text-text-hi transition-colors bg-surface-elevated rounded-lg">Logout</button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Window controls Electron */}
        {window.electronAPI && (
          <div className="flex items-center gap-3 ml-4 border-l border-white/5 pl-6">
            <button onClick={() => window.electronAPI.minimize()} className="text-text-lo hover:text-text-hi transition-colors p-1"><Minus size={18} /></button>
            <button onClick={() => window.electronAPI.maximize()} className="text-text-lo hover:text-text-hi transition-colors p-1"><Square size={14} /></button>
            <button onClick={() => window.electronAPI.close()} className="text-text-lo hover:text-color-error transition-colors p-1"><X size={18} /></button>
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
