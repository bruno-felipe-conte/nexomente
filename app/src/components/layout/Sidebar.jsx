/**
 * @module Sidebar
 * @description Barra lateral principal do NexoMente reestruturada:
 * - Brand Header com espaçamento dedicado e sem corte de renderização
 * - Seletor de idiomas limpo e acessível
 * - Navegação única e vertical pelos pilares reais (Dashboard, Vault, Grafo, Flashcards & Forja, Dojo, Configurações)
 * - Pílula compacta do Motor Neural Offline
 * - Card compacto da Kora (sem NaN%)
 * - Rodapé com identidade do Vault
 */
import PropTypes from 'prop-types';
import {
  LayoutGrid, Mic, Layers, GitBranch, FileText, Settings,
  Globe, Sparkles
} from 'lucide-react';
import { useAIStore } from '../../store/useAIStore';
import { useTamagotchiStore, getLevelProgress } from '../../store/useTamagotchiStore';
import { useFlashcards } from '../../hooks/useFlashcards';
import { useNotes } from '../../hooks/useNotes';
import { useTranslation } from '../../lib/i18n';

export default function Sidebar({ isOpen, currentPage, onNavigate, onCloseMobile, className = '' }) {
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${isOpen ? 'fixed inset-y-0 left-0 flex z-[100]' : 'hidden'} lg:relative lg:flex flex-col border-r border-nx-border bg-nx-depth select-none ${className}`}
        style={{
          width: isOpen ? '248px' : '72px',
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* 1. BRAND HEADER & SELETOR DE IDIOMA */}
        <div className="pt-4 pb-2 px-3 flex flex-col gap-2 shrink-0 border-b border-nx-border/40">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 shadow-glow-primary"
                style={{
                  background: 'linear-gradient(135deg, var(--nx-primary) 0%, var(--nx-secondary) 100%)',
                }}
              >
                <span className="text-white font-display font-black text-base leading-none">N</span>
              </div>
              {isOpen && (
                <div className="overflow-hidden min-w-0">
                  <div className="text-[15px] font-display font-bold text-nx-bright tracking-tight leading-tight truncate">
                    NexoMente
                  </div>
                  <div className="text-[8.5px] font-mono font-semibold text-nx-secondary tracking-[0.14em] uppercase truncate">
                    {t('brand.tagline')}
                  </div>
                </div>
              )}
            </button>

            {isOpen && (
              <button
                onClick={cycleLocale}
                title={`Idioma: ${locale} (Clique para alternar pt-BR / en-US / es-ES)`}
                className="px-2 py-1 rounded-md bg-nx-surface hover:bg-nx-overlay border border-nx-border text-[9.5px] font-mono font-bold text-nx-dim hover:text-nx-bright hover:border-nx-primary transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Globe size={11} className="text-nx-secondary" />
                <span>{locale.split('-')[0].toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. NAVIGATION ITEMS (Adeus Grid 2x2 - Lista Única e Limpa) */}
        <div className={`flex-1 ${isOpen ? 'overflow-y-auto px-3' : 'overflow-hidden px-2'} py-3 space-y-1 scrollbar-none`}>
          {isOpen && (
            <div className="px-2 pt-1 pb-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-nx-subtle">
              {t('sidebar.ecosystem')}
            </div>
          )}

          {PRIMARY_MODULES.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                title={!isOpen ? item.label : undefined}
                className={`w-full flex items-center ${isOpen ? 'justify-between px-3' : 'justify-center px-0'} h-[40px] rounded-[10px] transition-all duration-150 relative group cursor-pointer ${
                  isActive
                    ? 'bg-nx-overlay border border-nx-primary text-nx-bright shadow-glow-sm'
                    : 'border border-transparent text-nx-dim hover:text-nx-bright hover:bg-nx-surface/70'
                }`}
              >
                {isActive && isOpen && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r bg-nx-primary" />
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    className={isActive ? 'text-nx-primary shrink-0' : 'text-nx-subtle group-hover:text-nx-text shrink-0'}
                  />
                  {isOpen && (
                    <span className={`text-[13px] truncate ${isActive ? 'font-semibold text-nx-bright' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  )}
                </div>

                {isOpen && item.badge && (
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
              </button>
            );
          })}
        </div>

        {/* 3. RODAPÉ COMPACTO (Motor Neural + Kora Sem NaN% + Identidade) */}
        {isOpen ? (
          <div className="px-3 pb-3 pt-1 space-y-2 shrink-0 border-t border-nx-border/40">
            {/* Pílula Compacta do Motor Neural Offline */}
            <div
              className="px-2.5 py-1.5 rounded-[9px] bg-nx-surface border border-nx-border flex items-center justify-between text-[10.5px] font-mono"
              title="Inferência local privada com Gemma 4 e reconhecimento de voz Vosk"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isOnline ? 'var(--nx-success)' : 'var(--nx-accent)',
                    boxShadow: isOnline ? '0 0 6px var(--nx-success)' : 'none',
                  }}
                />
                <span className="text-nx-bright truncate font-sans font-semibold">
                  {isOnline ? 'Gemma 4 • Vosk Ativo' : 'Motor Local Pronto'}
                </span>
              </div>
              <span className="text-[9px] text-nx-secondary font-bold uppercase shrink-0">100% OFF</span>
            </div>

            {/* Card Compacto da Kora (Reduzido em 40% com avatar ao lado e sem NaN%) */}
            <div
              onClick={() => handleNavigate('dashboard')}
              className="p-2.5 rounded-[12px] bg-nx-surface border border-nx-border hover:border-nx-primary/50 transition-colors cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-nx-overlay border border-nx-secondary flex items-center justify-center shrink-0 shadow-glow-cyan">
                  <Sparkles size={14} className="text-nx-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-nx-bright truncate">Kora</span>
                    <span className="text-[9px] font-mono font-bold text-nx-accent px-1.5 py-0.2 rounded bg-nx-overlay border border-nx-accent/40">
                      NV {player?.level || 1}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-nx-dim truncate font-mono">
                    {player?.xp || 0} XP • {Math.round(progressPct)}%
                  </div>
                </div>
              </div>

              {/* Barra de XP */}
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
        ) : (
          <div className="mt-auto p-2 flex flex-col items-center gap-2 border-t border-nx-border">
            <button
              onClick={cycleLocale}
              className="w-9 h-9 rounded-lg bg-nx-surface border border-nx-border flex items-center justify-center text-[10px] font-mono font-bold text-nx-secondary"
              title={`Idioma: ${locale}`}
            >
              {locale.split('-')[0].toUpperCase()}
            </button>
          </div>
        )}
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
