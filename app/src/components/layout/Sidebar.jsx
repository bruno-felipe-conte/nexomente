/**
 * @module Sidebar
 * @description Barra lateral principal do NexoMente com Auto-Hide (Hover retrátil) e alinhamento estrito com a Topbar.
 * - Altura do Brand Header: exatamente h-16 (64px) com border-b border-nx-border/80, nivelado com a Topbar.
 * - Modo Auto-Hide / Mini-Rail: w-16 no estado recolhido com ícones centralizados; expande suavemente para w-64 no hover (onMouseEnter / onMouseLeave).
 * - Exibição contextual: rótulos, status do motor neural e Kora revelados com transição fluida ao expandir.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  LayoutGrid, Mic, Layers, GitBranch, FileText, Settings,
  Globe, Sparkles, Pin, PinOff
} from 'lucide-react';
import { useAIStore } from '../../store/useAIStore';
import { useUIStore } from '../../store/useUIStore';
import { useTamagotchiStore, getLevelProgress } from '../../store/useTamagotchiStore';
import { useFlashcards } from '../../hooks/useFlashcards';
import { useNotes } from '../../hooks/useNotes';
import { useTranslation } from '../../lib/i18n';

export default function Sidebar({ isOpen = false, currentPage, onNavigate, onCloseMobile, className = '' }) {
  const [isHovered, setIsHovered] = useState(false);
  const { sidebarPinned, toggleSidebarPinned } = useUIStore();
  const isPinned = Boolean(sidebarPinned);

  const { status } = useAIStore();
  const { player } = useTamagotchiStore();
  const { getParaRevisao } = useFlashcards();
  const { notas } = useNotes();
  const { t, locale, setLocale } = useTranslation();

  const isOnline = status === 'online';
  const dueCardsCount = (getParaRevisao?.() || []).length;
  const totalNodes = (notas || []).length;
  const xpInfo = getLevelProgress(player?.xp || 0);
  const progressPct = typeof xpInfo === 'number' ? xpInfo : (xpInfo.progress ?? 0);

  // A barra é considerada expandida se estiver com hover/pin (desktop) OU se estiver aberta como drawer no mobile
  const isExpandedDesktop = isHovered || isPinned;
  const isExpanded = isOpen || isExpandedDesktop;

  const PRIMARY_MODULES = [
    { id: 'dashboard',  label: t('nav.dashboard'),  icon: LayoutGrid, badge: null },
    { id: 'notes',      label: t('nav.notes'),      icon: FileText,   badge: null },
    { id: 'graph',      label: t('nav.graph'),      icon: GitBranch,  badge: totalNodes > 999 ? `${(totalNodes / 1000).toFixed(1)}k` : String(totalNodes) },
    { id: 'flashcards', label: t('nav.flashcards'), icon: Layers,     badge: String(dueCardsCount || 0) },
    { id: 'poemas',     label: t('nav.poemas'),     icon: Mic,        badge: 'AI' },
    { id: 'settings',   label: t('nav.settings'),   icon: Settings,   badge: null },
  ];

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onCloseMobile) {
      onCloseMobile();
    }
  };

  const cycleLocale = () => {
    const order = ['pt-BR', 'en-US', 'es-ES'];
    const next = order[(order.indexOf(locale) + 1) % order.length];
    setLocale(next);
  };

  return (
    <>
      {/* Backdrop Mobile: aparece quando a sidebar é aberta no mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Espaçador estático no fluxo para desktop: w-64 quando fixada com Pin, w-16 no modo auto-hide recolhido */}
      <div
        className={`hidden lg:block shrink-0 h-full pointer-events-none transition-[width] duration-300 ease-out ${
          isPinned ? 'w-64' : 'w-16'
        }`}
      />

      {/* Aside com Auto-Hide Flutuante no Hover para desktop e Drawer deslizante para telas < 1024px */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-[100] flex flex-col border-r border-nx-border/80 bg-nx-depth select-none transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isExpandedDesktop
            ? isPinned
              ? 'lg:w-64 lg:shadow-none'
              : 'lg:w-64 lg:shadow-[6px_0_24px_rgba(44,38,35,0.10)]'
            : 'lg:w-16 lg:shadow-none'
        } ${className}`}
      >
        {/* 1. BRAND HEADER (Nivelado perfeitamente com a Topbar em h-16 = 64px) */}
        <div className="h-16 px-2 flex items-center shrink-0 border-b border-nx-border/80 bg-nx-depth overflow-hidden">
          <div className="w-full h-full flex items-center min-w-0">
            {/* Slot Fixo da Logo (48px de largura, centralizado na coluna de 64px) */}
            <button
              onClick={() => handleNavigate('dashboard')}
              className="w-12 h-full flex items-center justify-center shrink-0 group cursor-pointer"
              title="Ir para o Dashboard"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 shadow-glow-primary"
                style={{
                  background: 'linear-gradient(135deg, var(--nx-primary) 0%, var(--nx-secondary) 100%)',
                }}
              >
                <span className="text-white font-display font-black text-base leading-none">N</span>
              </div>
            </button>

            {/* Container de Texto & Ações (Clip-reveal com transição suave de opacidade) */}
            <div
              className={`flex-1 min-w-0 flex items-center justify-between pr-1 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                isExpanded ? 'opacity-100 translate-x-0 delay-75' : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}
            >
              <button
                onClick={() => handleNavigate('dashboard')}
                className="overflow-hidden min-w-0 pr-2 text-left cursor-pointer"
                title="Ir para o Dashboard"
              >
                <div className="text-[15px] font-display font-bold text-nx-bright tracking-tight leading-tight truncate">
                  NexoMente
                </div>
                <div className="text-[8.5px] font-mono font-semibold text-nx-secondary tracking-[0.14em] uppercase truncate">
                  {t('brand.tagline')}
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={cycleLocale}
                  title={`Idioma: ${locale} (Clique para alternar pt-BR / en-US / es-ES)`}
                  className="px-2 py-1 rounded-md bg-nx-surface hover:bg-nx-overlay border border-nx-border text-[9.5px] font-mono font-bold text-nx-dim hover:text-nx-bright hover:border-nx-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={11} className="text-nx-secondary" />
                  <span>{locale.split('-')[0].toUpperCase()}</span>
                </button>

                <button
                  onClick={toggleSidebarPinned}
                  title={isPinned ? 'Desafixar barra lateral (Auto-Hide ativo)' : 'Fixar barra lateral aberta'}
                  className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                    isPinned
                      ? 'bg-nx-primary/20 border-nx-primary/50 text-nx-primary'
                      : 'bg-nx-surface border-nx-border text-nx-dim hover:text-nx-bright'
                  }`}
                >
                  {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. NAVIGATION ITEMS */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-none overflow-x-hidden">
          <div
            className={`px-3 text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-nx-subtle overflow-hidden whitespace-nowrap transition-all duration-200 ${
              isExpanded ? 'opacity-100 max-h-6 pt-1 pb-1.5' : 'opacity-0 max-h-0 py-0 pointer-events-none'
            }`}
          >
            {t('sidebar.ecosystem')}
          </div>

          {PRIMARY_MODULES.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full h-11 flex items-center justify-start rounded-xl px-0 relative group cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-nx-overlay border border-nx-primary text-nx-bright shadow-glow-sm'
                    : 'border border-transparent text-nx-dim hover:text-nx-bright hover:bg-nx-surface/70'
                }`}
              >
                {/* Indicador Ativo Lateral */}
                <span
                  className={`absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-nx-primary transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Slot Fixo do Ícone: Rigid 48px, ícone nunca sai do lugar */}
                <div className="w-12 h-full flex items-center justify-center shrink-0">
                  <Icon
                    size={18}
                    className={isActive ? 'text-nx-primary shrink-0' : 'text-nx-subtle group-hover:text-nx-text shrink-0'}
                  />
                </div>

                {/* Container de Rótulo e Badge com Clip-Reveal Suave */}
                <div
                  className={`flex-1 min-w-0 flex items-center justify-between pr-3 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                    isExpanded
                      ? 'opacity-100 translate-x-0 delay-75'
                      : 'opacity-0 -translate-x-2 pointer-events-none'
                  }`}
                >
                  <span className={`text-[13px] truncate ${isActive ? 'font-semibold text-nx-bright' : 'font-medium'}`}>
                    {item.label}
                  </span>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-[6px] text-[10px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-nx-primary text-white'
                          : 'bg-nx-surface text-nx-dim border border-nx-border/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. RODAPÉ ESTÁVEL (Slot Fixo de 48px + Clip-Reveal sem desmontagem) */}
        <div className="px-2 pb-3 pt-2 space-y-2 shrink-0 border-t border-nx-border/60 bg-nx-depth overflow-hidden">
          {/* Status do Motor Neural Offline */}
          <div
            className="w-full h-8 rounded-[9px] bg-nx-surface/80 border border-nx-border flex items-center text-[10.5px] font-mono overflow-hidden transition-colors"
            title="Inferência local privada com Gemma 4 e reconhecimento de voz Vosk"
          >
            {/* Slot Fixo do Led de Status */}
            <div className="w-12 h-full flex items-center justify-center shrink-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isOnline ? 'var(--nx-success)' : 'var(--nx-accent)',
                  boxShadow: isOnline ? '0 0 6px var(--nx-success)' : 'none',
                }}
              />
            </div>

            {/* Texto do Motor com Transição Suave */}
            <div
              className={`flex-1 min-w-0 flex items-center justify-between pr-2.5 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                isExpanded
                  ? 'opacity-100 translate-x-0 delay-75'
                  : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}
            >
              <span className="text-nx-bright truncate font-sans font-semibold text-[11px]">
                {isOnline ? 'Gemma 4 • Vosk Ativo' : 'Motor Local Pronto'}
              </span>
              <span className="text-[9px] text-nx-secondary font-bold uppercase shrink-0">100% OFF</span>
            </div>
          </div>

          {/* Card da Kora */}
          <div
            onClick={() => handleNavigate('dashboard')}
            className="w-full p-1.5 rounded-[12px] bg-nx-surface/80 border border-nx-border hover:border-nx-primary/50 transition-colors cursor-pointer space-y-1 shadow-sm overflow-hidden"
            title={!isExpanded ? `Kora NV ${player?.level || 1} (${Math.round(progressPct)}% XP)` : undefined}
          >
            <div className="flex items-center">
              {/* Slot do Avatar da Kora */}
              <div className="w-9 h-9 rounded-xl bg-nx-overlay border border-nx-secondary/60 flex items-center justify-center shrink-0 shadow-glow-cyan ml-0.5">
                <Sparkles size={16} className="text-nx-secondary" />
              </div>

              {/* Informações da Kora com Transição Suave */}
              <div
                className={`flex-1 min-w-0 pr-1.5 pl-2.5 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                  isExpanded
                    ? 'opacity-100 translate-x-0 delay-75'
                    : 'opacity-0 -translate-x-2 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-nx-bright truncate">Kora</span>
                  <span className="text-[9px] font-mono font-bold text-nx-accent px-1.5 py-0.2 rounded bg-nx-overlay border border-nx-accent/40">
                    NV {player?.level || 1}
                  </span>
                </div>
                <div className="text-[9.5px] text-nx-dim truncate font-mono">
                  {player?.xp || 0} XP • {Math.round(progressPct)}%
                </div>
              </div>
            </div>

            {/* Barra de XP com Expansão Vertical Suave */}
            <div
              className={`w-full overflow-hidden transition-all duration-200 ${
                isExpanded ? 'max-h-4 opacity-100 delay-75' : 'max-h-0 opacity-0 pointer-events-none'
              }`}
            >
              <div className="w-full h-1.5 rounded-full bg-nx-void overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(8, progressPct))}%`,
                    background: 'linear-gradient(90deg, var(--nx-accent) 0%, var(--nx-primary) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  currentPage: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
  onCloseMobile: PropTypes.func,
  className: PropTypes.string,
};
