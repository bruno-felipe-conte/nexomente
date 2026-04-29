import { Menu, Search, Minus, Square, X, Bell, ChevronRight, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useUIStore } from '../../store/useUIStore';
import { useTamagotchiStore, getLevelProgress } from '../../store/useTamagotchiStore';

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

export default function Header({ title, onToggleSidebar, onNavigate }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { userName } = useUIStore();
  const { player } = useTamagotchiStore();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <header
      className="flex items-center justify-between h-20 px-4 md:px-6 bg-nx-void/80 backdrop-blur-md border-b border-nx-border sticky top-0 z-[100]"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-nx-sm hover:bg-nx-surface text-nx-dim hover:text-nx-bright transition-colors duration-nx-fast"
          >
            <Menu size={20} />
          </button>
          <span className="text-nx-bright font-display font-bold capitalize tracking-tight text-nx-base">{pageTitles[title] || title}</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-lg mx-12">
          <div className="relative group w-full">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nx-muted group-focus-within:text-nx-primary transition-colors duration-nx-fast" />
            <input
              type="text"
              placeholder="O que você deseja aprender hoje? (Ctrl+K)"
              className="w-full pl-12 pr-4 py-2.5 bg-nx-depth border border-nx-border rounded-nx-md text-nx-text placeholder-nx-muted text-nx-sm font-ui focus:border-nx-primary/40 focus:bg-nx-surface focus:outline-none transition-all duration-nx-fast"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-nx-dim hover:text-nx-bright transition-colors duration-nx-fast">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-nx-primary rounded-full border-2 border-nx-void" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`w-10 h-10 rounded-nx-md border transition-all duration-nx-fast flex items-center justify-center font-display font-black text-nx-sm relative overflow-hidden group/avatar ${isProfileOpen ? 'border-nx-primary bg-nx-primary/10 text-nx-primary' : 'border-nx-border bg-nx-depth text-nx-bright hover:border-nx-subtle'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-nx-primary/20 to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
              <span className="relative z-10">{userInitial}</span>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-12 right-0 w-64 bg-nx-overlay border border-nx-border rounded-nx-lg shadow-2xl z-[120] p-5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-nx-sm bg-nx-surface border border-nx-border flex items-center justify-center text-nx-bright font-display font-black">
                          {userInitial}
                        </div>
                        <div>
                          <p className="text-nx-xs font-mono font-black text-nx-bright uppercase tracking-widest">{userName}</p>
                          <p className="text-[10px] font-mono font-bold text-nx-muted uppercase tracking-tighter">[LVL {player.level}]</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="p-2 hover:bg-nx-surface rounded-nx-sm text-nx-dim hover:text-nx-bright transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-mono font-black text-nx-muted uppercase tracking-[0.2em]">
                        <span>Progresso</span>
                        <span className="text-nx-accent">{(player.xp / 1000).toFixed(2)}K XP</span>
                      </div>
                      <div className="w-full h-1.5 bg-nx-void rounded-full overflow-hidden border border-nx-border">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${getLevelProgress(player.xp)}%` }}
                          className="h-full bg-nx-accent" 
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-nx-border grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="py-2 text-[9px] font-mono font-black uppercase tracking-widest text-nx-dim hover:text-nx-bright transition-colors bg-nx-surface rounded-nx-sm"
                      >
                        Config
                      </button>
                      <button className="py-2 text-[9px] font-mono font-black uppercase tracking-widest text-nx-dim hover:text-nx-bright transition-colors bg-nx-surface rounded-nx-sm">Logout</button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {window.electronAPI && (
            <div className="flex items-center gap-3 ml-4 border-l border-nx-border pl-6">
              <button onClick={() => window.electronAPI.minimize()} className="text-nx-dim hover:text-nx-bright transition-colors p-1"><Minus size={18} /></button>
              <button onClick={() => window.electronAPI.maximize()} className="text-nx-dim hover:text-nx-bright transition-colors p-1"><Square size={14} /></button>
              <button onClick={() => window.electronAPI.close()} className="text-nx-dim hover:text-nx-error transition-colors p-1"><X size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
Header.propTypes = {
  title: PropTypes.string,
  onToggleSidebar: PropTypes.func,
  onNavigate: PropTypes.func,
};
