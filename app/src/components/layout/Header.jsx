import { Menu, Search, Minus, Square, X, Bell, Edit2, Zap } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useUIStore } from '../../store/useUIStore';
import { useTamagotchiStore, getLevelProgress } from '../../store/useTamagotchiStore';

const pageTitles = {
  dashboard:  'Dashboard',
  notes:      'Notas',
  study:      'Estudo',
  flashcards: 'Flashcards',
  graph:      'Grafo de Conexões',
  statistics: 'Estatísticas',
  settings:   'Configurações',
  gerador:    'Gerador IA',
  poemas:     'Poemas',
  ai:         'Chat Neural',
};

const pageColors = {
  dashboard:  '#7C6FFA',
  notes:      '#A78BFA',
  study:      '#22D3EE',
  flashcards: '#F472B6',
  graph:      '#818CF8',
  statistics: '#34D399',
  settings:   '#7D869E',
  gerador:    '#FBBF24',
  poemas:     '#34D399',
  ai:         '#22D3EE',
};

export default function Header({ title, onToggleSidebar, onNavigate }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { userName } = useUIStore();
  const { player } = useTamagotchiStore();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';
  const xpProgress = getLevelProgress(player.xp);
  const accent = pageColors[title] || '#7C6FFA';

  return (
    <header
      className="sticky top-0 z-[100] flex flex-col"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Main bar */}
      <div
        className="flex items-center justify-between h-[60px] px-4 md:px-6 border-b border-nx-border"
        style={{ background: 'rgba(8, 11, 24, 0.88)', backdropFilter: 'blur(16px)', WebkitAppRegion: 'no-drag' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-nx-sm text-nx-dim hover:text-nx-bright hover:bg-nx-surface transition-all duration-nx-fast"
            aria-label="Toggle sidebar"
          >
            <Menu size={19} />
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}60 100%)`, boxShadow: `0 0 8px ${accent}60` }}
            />
            <span
              className="font-display font-bold tracking-tight text-[15px]"
              style={{ color: '#EBF0FF' }}
            >
              {pageTitles[title] || title}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative group w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nx-muted group-focus-within:text-nx-primary transition-colors duration-nx-fast" />
            <input
              type="text"
              placeholder="Pesquisar notas, flashcards... (Ctrl+K)"
              className="w-full pl-10 pr-4 py-2 bg-nx-depth border border-nx-border rounded-nx-md text-nx-text placeholder-nx-muted text-nx-sm font-ui focus:outline-none transition-all duration-nx-fast"
              style={{ fontSize: '13px' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,111,250,0.50)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,111,250,0.10)'; }}
              onBlur={e =>  { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* XP badge */}
          <button
            onClick={() => onNavigate('statistics')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-nx-sm border border-nx-border bg-nx-surface hover:border-nx-primary/40 transition-all duration-nx-fast"
          >
            <Zap size={12} className="text-nx-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' }} />
            <span className="text-[11px] font-mono font-bold text-nx-accent">{player.xp.toLocaleString()} XP</span>
          </button>

          {/* Notifications */}
          <button className="relative p-1.5 text-nx-dim hover:text-nx-bright transition-colors duration-nx-fast">
            <Bell size={17} />
            <span
              className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-nx-depth"
              style={{ background: '#7C6FFA', boxShadow: '0 0 6px rgba(124,111,250,0.7)' }}
            />
          </button>

          {/* Avatar */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-9 h-9 rounded-nx-md flex items-center justify-center font-display font-black text-nx-sm relative overflow-hidden transition-all duration-nx-fast border border-nx-border hover:border-nx-primary/60"
              style={isProfileOpen
                ? { background: 'linear-gradient(135deg, rgba(124,111,250,0.20), rgba(34,211,238,0.10))', borderColor: 'rgba(124,111,250,0.60)', color: '#EBF0FF' }
                : { background: 'var(--nx-surface)', color: '#EBF0FF' }
              }
            >
              {userInitial}
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-11 right-0 w-64 rounded-nx-lg border border-nx-border shadow-2xl z-[120] p-5 overflow-hidden"
                    style={{ background: '#0E1122', backdropFilter: 'blur(20px)' }}
                  >
                    {/* Gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #7C6FFA, #22D3EE)' }} />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-nx-md flex items-center justify-center font-display font-black text-white"
                          style={{ background: 'linear-gradient(135deg, #7C6FFA, #22D3EE)' }}
                        >
                          {userInitial}
                        </div>
                        <div>
                          <p className="text-[11px] font-mono font-black text-nx-bright uppercase tracking-wider">{userName}</p>
                          <p className="text-[10px] font-mono text-nx-primary" style={{ color: '#7C6FFA' }}>Nível {player.level}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="p-1.5 hover:bg-nx-surface rounded-nx-xs text-nx-dim hover:text-nx-bright transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>

                    {/* XP Progress */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-nx-dim">Progresso</span>
                        <span style={{ color: '#FBBF24' }}>{player.xp.toLocaleString()} XP</span>
                      </div>
                      <div className="w-full h-2 bg-nx-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${xpProgress}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #FBBF24, #F472B6)' }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-nx-border grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-nx-dim hover:text-nx-bright bg-nx-surface rounded-nx-sm transition-colors border border-nx-border hover:border-nx-primary/30"
                      >
                        Config
                      </button>
                      <button
                        onClick={() => { onNavigate('statistics'); setIsProfileOpen(false); }}
                        className="py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-nx-dim hover:text-nx-bright bg-nx-surface rounded-nx-sm transition-colors border border-nx-border hover:border-nx-primary/30"
                      >
                        Métricas
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Electron window controls */}
          {window.electronAPI && (
            <div className="flex items-center gap-2 ml-3 pl-4 border-l border-nx-border">
              <button onClick={() => window.electronAPI.minimize()} className="text-nx-dim hover:text-nx-bright transition-colors p-1"><Minus size={16} /></button>
              <button onClick={() => window.electronAPI.maximize()} className="text-nx-dim hover:text-nx-bright transition-colors p-1"><Square size={13} /></button>
              <button onClick={() => window.electronAPI.close()} className="text-nx-dim hover:text-nx-error transition-colors p-1"><X size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {/* XP progress strip */}
      <div className="h-[2px] relative overflow-hidden">
        <div className="absolute inset-0 bg-nx-border/40" />
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-r-full"
          initial={{ width: 0 }}
          animate={{ width: `${xpProgress}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          style={{
            background: 'linear-gradient(90deg, #7C6FFA 0%, #22D3EE 60%, #34D399 100%)',
            boxShadow: '0 0 8px rgba(124,111,250,0.6)',
          }}
        />
      </div>
    </header>
  );
}

Header.propTypes = {
  title: PropTypes.string,
  onToggleSidebar: PropTypes.func,
  onNavigate: PropTypes.func,
};
