/**
 * @module Header
 * @description TopBar do NexoMente unificada:
 * - Saudação contextual com edição inline do nome (data-testid="edit-user-name")
 * - Omnibar de busca rápida (Ctrl+K / ⌘K)
 * - Timer Pomodoro Global retrátil (⏱️ 25:00) com popover completo
 * - Pílula de Streak (🔥 18 Dias)
 * - Botão Copiloto Neural (abre AICopilotDrawer lateral ou Ctrl+J)
 * - Central de Alertas e Notificações
 * - Botão de toggle da barra lateral
 */
import {
  Menu, Search, Minus, Square, X, Bell, Edit2, FileText, Brain, Flame, Check,
  Clock, Play, Pause, Sparkles
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useUIStore } from '../../store/useUIStore';
import { useTamagotchiStore, getLevelProgress } from '../../store/useTamagotchiStore';
import { useStudyTimerStore, MODOS_ESTUDO } from '../../store/useStudyTimerStore';
import { useNotes } from '../../hooks/useNotes';
import { useFlashcards } from '../../hooks/useFlashcards';
import { useTranslation } from '../../lib/i18n';
import { toast } from 'react-hot-toast';

export default function Header({ title, onToggleSidebar, onNavigate, onToggleCopilot }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const searchInputRef = useRef(null);

  const { userName, setUserName, setPendingNoteAction } = useUIStore();
  const { player } = useTamagotchiStore();
  const { notas } = useNotes();
  const { cards, getParaRevisao } = useFlashcards();
  const { t } = useTranslation();

  // Store global de Timer Pomodoro
  const {
    timer, rodando, modo: modoTimer,
    iniciar: iniciarTimer, pausar: pausarTimer, trocarModo: trocarModoTimer,
    concluirSessao: concluirSessaoTimer
  } = useStudyTimerStore();

  const currentModoTimer = MODOS_ESTUDO.find(m => m.id === modoTimer) || MODOS_ESTUDO[0];
  const formatTimer = (s) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const displayName = (userName && userName !== 'Visitante') ? userName : (player?.name || 'Bruno');
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'B';
  const xpInfo = getLevelProgress(player.xp);
  const progressPct = typeof xpInfo === 'number' ? xpInfo : (xpInfo.progress ?? 0);
  const cardsPendentes = getParaRevisao();

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('dash.greeting.morning');
    if (hour >= 12 && hour < 18) return t('dash.greeting.afternoon');
    return t('dash.greeting.evening');
  };

  const SCREEN_META = {
    dashboard: {
      heading: `${getGreetingText()}, ${displayName}`,
      subtitle: t('dash.subtitle'),
    },
    poemas: {
      heading: t('dojo.header.title'),
      subtitle: t('dojo.header.sub'),
    },
    flashcards: {
      heading: 'Flashcards & Forja IA',
      subtitle: 'Repetição espaçada FSRS-5, gerador neural e curva de retenção',
    },
    graph: {
      heading: t('graph.header.title'),
      subtitle: t('graph.header.sub'),
    },
    notes: {
      heading: t('nav.notes'),
      subtitle: `${(notas || []).length} notas salvas no Vault Markdown local`,
    },
    settings: {
      heading: t('nav.settings'),
      subtitle: 'Modelos GGUF locais, idioma (i18n), backups e preferências',
    },
  };

  const currentMeta = SCREEN_META[title] || SCREEN_META.dashboard;

  const startEditName = () => {
    setTempName(displayName);
    setIsEditingName(true);
  };

  const saveEditName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      toast.success('Nome atualizado!');
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    const abrirPomodoro = () => setIsPomodoroOpen((v) => !v);
    window.addEventListener('toggle-pomodoro', abrirPomodoro);
    return () => window.removeEventListener('toggle-pomodoro', abrirPomodoro);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggleCopilot?.();
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
        setIsProfileOpen(false);
        setIsPomodoroOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCopilot]);

  const searchResultsNotas = searchQuery.trim()
    ? (notas || []).filter(n =>
        (n.titulo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.conteudo || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const searchResultsCards = searchQuery.trim()
    ? (cards || []).filter(c =>
        (c.frente || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.verso || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  return (
    <header
      className="sticky top-0 z-[90] h-16 shrink-0 flex items-center bg-nx-void/95 backdrop-blur-md border-b border-nx-border/80"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div
        className="w-full h-full flex items-center justify-between px-4 md:px-6 gap-3"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Left: Toggle + Screen Title & Subtitle */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {title === 'dashboard' ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-lg md:text-[22px] font-display font-bold text-nx-bright tracking-tight leading-tight">
                    {getGreetingText()},
                  </span>
                  {isEditingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={saveEditName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditName();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        className="bg-nx-surface border border-nx-primary px-2 py-0.5 rounded text-sm text-nx-bright font-bold outline-none"
                      />
                      <button onClick={saveEditName} className="p-1 text-nx-primary hover:text-white">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditName}
                      data-testid="edit-user-name"
                      className="text-lg md:text-[22px] font-display font-bold text-nx-bright hover:text-nx-primary transition-colors flex items-center gap-1.5 group cursor-pointer tracking-tight leading-tight"
                      title="Clique para editar seu nome"
                    >
                      <span>{displayName}</span>
                      <Edit2 size={12} className="opacity-0 group-hover:opacity-80 text-nx-primary transition-opacity" />
                    </button>
                  )}
                </div>
              ) : (
                <h1 className="text-lg md:text-[22px] font-display font-bold text-nx-bright tracking-tight leading-tight truncate">
                  {currentMeta.heading}
                </h1>
              )}
            </div>
            <p className="text-[12px] text-nx-dim truncate hidden sm:block mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Center/Right: Quick Search + Global Pomodoro Timer + Streak + Copilot + Notifications + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search (Cmd+K) */}
          <div className="hidden xl:flex relative w-[240px]">
            <div className="relative w-full flex items-center">
              <Search size={14} className="absolute left-3 text-nx-subtle pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={t('header.search.placeholder')}
                className="w-full h-[38px] pl-8 pr-11 bg-nx-surface border border-nx-border rounded-[10px] text-[12px] text-nx-text placeholder-nx-subtle focus:outline-none focus:border-nx-primary transition-colors"
              />
              <kbd className="absolute right-2 px-1.5 py-0.5 rounded-[5px] bg-nx-overlay border border-nx-border/60 text-[9.5px] font-mono font-semibold text-nx-dim pointer-events-none">
                ⌘K
              </kbd>
            </div>

            <AnimatePresence>
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <>
                  <div className="fixed inset-0 z-[105]" onClick={() => setIsSearchOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute top-11 left-0 right-0 rounded-[12px] bg-nx-surface border border-nx-border shadow-2xl z-[120] p-3 space-y-2"
                  >
                    {searchResultsNotas.length === 0 && searchResultsCards.length === 0 ? (
                      <p className="text-xs text-nx-dim text-center py-3">
                        Nenhum resultado para &ldquo;{searchQuery}&rdquo;
                      </p>
                    ) : (
                      <>
                        {searchResultsNotas.length > 0 && (
                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-nx-muted px-2">Notas</span>
                            {searchResultsNotas.map(n => (
                              <button
                                key={n.id}
                                onClick={() => {
                                  setPendingNoteAction({ noteId: n.id });
                                  onNavigate('notes');
                                  setIsSearchOpen(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-nx-overlay text-left transition-colors cursor-pointer"
                              >
                                <FileText size={13} className="text-nx-primary shrink-0" />
                                <span className="text-xs text-nx-bright truncate">{n.titulo}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResultsCards.length > 0 && (
                          <div>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-nx-muted px-2">Flashcards</span>
                            {searchResultsCards.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  onNavigate('flashcards');
                                  setIsSearchOpen(false);
                                  setSearchQuery('');
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-nx-overlay text-left transition-colors cursor-pointer"
                              >
                                <Brain size={13} className="text-nx-secondary shrink-0" />
                                <span className="text-xs text-nx-bright truncate">{c.frente}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Global Pomodoro Timer Player & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsPomodoroOpen(!isPomodoroOpen)}
              title="Timer de Estudo & Foco Profundo"
              className={`flex items-center gap-2 h-[38px] px-3 rounded-[10px] border transition-all cursor-pointer ${
                rodando
                  ? 'bg-nx-secondary/15 border-nx-secondary/60 text-nx-secondary shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                  : 'bg-nx-surface border-nx-border hover:border-nx-primary/60 text-nx-dim hover:text-nx-bright'
              }`}
            >
              <Clock size={14} className={rodando ? 'text-nx-secondary animate-pulse' : 'text-nx-dim'} />
              <span className="text-[12px] font-mono font-bold whitespace-nowrap">
                {formatTimer(timer)}
              </span>
            </button>

            <AnimatePresence>
              {isPomodoroOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsPomodoroOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-11 right-0 w-72 rounded-[14px] bg-nx-surface border border-nx-border shadow-2xl z-[120] p-4 space-y-3.5 select-none"
                  >
                    <div className="flex items-center justify-between border-b border-nx-border pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-nx-bright">
                        Timer de Estudo
                      </span>
                      <span className="text-[10px] font-mono text-nx-secondary font-bold">
                        {currentModoTimer.name}
                      </span>
                    </div>

                    <div className="text-center py-2">
                      <div className="text-3xl font-display font-bold font-mono text-nx-bright">
                        {formatTimer(timer)}
                      </div>
                      <p className="text-[11px] text-nx-dim mt-0.5">Ganhe +XP ao concluir sessões de foco</p>
                    </div>

                    {/* Modos Pomodoro */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {MODOS_ESTUDO.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => trocarModoTimer(m.id)}
                          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            modoTimer === m.id
                              ? 'bg-nx-overlay border-nx-primary text-nx-bright'
                              : 'bg-nx-depth border-nx-border/60 text-nx-dim hover:text-nx-bright'
                          }`}
                        >
                          {m.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {/* Controles do Timer */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={rodando ? pausarTimer : iniciarTimer}
                        className="flex-1 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {rodando ? <Pause size={14} /> : <Play size={14} />}
                        <span>{rodando ? 'Pausar' : 'Iniciar'}</span>
                      </button>
                      <button
                        onClick={concluirSessaoTimer}
                        title="Concluir sessão agora e ganhar XP"
                        className="p-2 rounded-xl bg-nx-depth hover:bg-nx-overlay border border-nx-border text-nx-dim hover:text-nx-bright cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Streak Pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 h-[38px] px-3 rounded-[10px] bg-nx-surface border border-nx-border text-nx-accent"
            title="Ofensiva de estudo contínuo"
          >
            <Flame size={14} className="text-nx-accent shrink-0" />
            <span className="text-[12px] font-bold whitespace-nowrap font-mono">
              {player.streak || 0} {t('header.streak.days')}
            </span>
          </div>

          {/* Copiloto Neural Global Button (Abre Gaveta Lateral) */}
          <button
            onClick={onToggleCopilot}
            title="Copiloto Neural Global (Ctrl+J)"
            className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] text-[12px] font-bold text-white shadow-glow-primary hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            style={{
              background: 'linear-gradient(90deg, var(--nx-primary) 0%, #4A6BEF 100%)',
            }}
          >
            <Sparkles size={14} />
            <span className="hidden md:inline">Copiloto</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
              aria-label="Notificações"
              title="Central de Alertas"
              className="relative h-[38px] w-[38px] rounded-[10px] bg-nx-surface border border-nx-border flex items-center justify-center text-nx-dim hover:text-nx-bright transition-colors cursor-pointer"
            >
              <Bell size={15} />
              {(cardsPendentes.length > 0 || player.hp < 50) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-nx-primary" />
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-[110]" onClick={() => setIsNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-11 right-0 w-72 rounded-[14px] bg-nx-surface border border-nx-border shadow-2xl z-[120] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-nx-border pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-nx-bright">Notificações</span>
                      <span className="text-[10px] font-mono text-nx-primary">{cardsPendentes.length} pendentes</span>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => { onNavigate('flashcards'); setIsNotifOpen(false); }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg bg-nx-overlay hover:border-nx-primary border border-transparent transition-colors text-left cursor-pointer"
                      >
                        <Brain size={15} className="text-nx-primary shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-nx-bright">
                            {cardsPendentes.length > 0 ? `${cardsPendentes.length} cards para revisar` : 'Revisões em dia!'}
                          </p>
                          <p className="text-[10px] text-nx-dim">Motor FSRS-5 pronto</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Avatar Popover */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-[38px] h-[38px] rounded-[10px] bg-nx-surface border border-nx-border hover:border-nx-primary flex items-center justify-center font-display font-bold text-xs text-nx-bright transition-colors cursor-pointer"
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
                    className="absolute top-11 right-0 w-64 rounded-[14px] bg-nx-surface border border-nx-border shadow-2xl z-[120] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-nx-bright">{displayName}</p>
                        <p className="text-[10px] font-mono text-nx-primary">Nível {player.level} • {player.xp} XP</p>
                      </div>
                      <button
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="p-1.5 hover:bg-nx-overlay rounded text-nx-dim hover:text-nx-bright"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    <div className="w-full h-1.5 bg-nx-void rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progressPct}%`,
                          background: 'linear-gradient(90deg, var(--nx-accent), var(--nx-primary))',
                        }}
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Toggle Sidebar Button na Extrema Direita */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-[10px] text-nx-dim hover:text-nx-bright hover:bg-nx-surface border border-transparent hover:border-nx-border transition-all cursor-pointer shrink-0"
            aria-label="Toggle sidebar"
            title="Alternar barra lateral"
          >
            <Menu size={18} />
          </button>

          {/* Electron Window Controls */}
          {typeof window !== 'undefined' && window.electronAPI && (
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-nx-border">
              <button onClick={() => window.electronAPI.minimize()} className="text-nx-dim hover:text-nx-bright p-1"><Minus size={14} /></button>
              <button onClick={() => window.electronAPI.maximize()} className="text-nx-dim hover:text-nx-bright p-1"><Square size={11} /></button>
              <button onClick={() => window.electronAPI.close()} className="text-nx-dim hover:text-nx-error p-1"><X size={14} /></button>
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
  onToggleCopilot: PropTypes.func,
};
