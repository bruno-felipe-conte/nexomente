import React from 'react';
import { Globe, Palette, Keyboard, Check } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { useUIStore } from '../../store/useUIStore';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷', desc: 'Interface e prompts em português' },
  { id: 'en-US', label: 'English (US)', flag: '🇺🇸', desc: 'Interface and English prompts' },
  { id: 'es-ES', label: 'Español', flag: '🇪🇸', desc: 'Interfaz y prompts en español' },
];

export default function GeneralSettings() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, toggleTheme } = useUIStore();

  const handleSelectLanguage = (langId) => {
    setLocale(langId);
    toast.success(`${LANGUAGES.find(l => l.id === langId)?.label || langId}`);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="pb-4 border-b border-nx-border">
        <h3 className="text-xl font-display font-bold text-nx-bright flex items-center gap-2.5">
          <Globe className="text-nx-secondary" size={22} />
          {t('settings.general.title')}
        </h3>
        <p className="text-xs text-nx-dim mt-1">
          {t('settings.general.sub')}
        </p>
      </div>

      {/* Grid de Seções */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Seletor de Idioma */}
        <div className="p-6 rounded-2xl nx-sheet space-y-4">
          <div className="flex items-center gap-2 text-nx-bright font-bold text-sm">
            <Globe size={16} className="text-nx-secondary" />
            {t('settings.lang.title')}
          </div>
          <p className="text-xs text-nx-dim">
            {t('settings.lang.sub')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {LANGUAGES.map((item) => {
              const isSelected = locale === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectLanguage(item.id)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-nx-overlay border-nx-primary text-nx-bright shadow-sm ring-1 ring-nx-primary'
                      : 'bg-nx-surface border-nx-border text-nx-dim hover:bg-nx-overlay/60 hover:text-nx-bright'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl">{item.flag}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-nx-primary flex items-center justify-center text-white shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-nx-bright">{item.label}</span>
                  <span className="text-[11px] text-nx-dim mt-1">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Tema & Interface */}
        <div className="p-6 rounded-2xl nx-sheet space-y-4">
          <div className="flex items-center gap-2 text-nx-bright font-bold text-sm">
            <Palette size={16} className="text-nx-primary" />
            {t('settings.theme.title')}
          </div>
          <div className="p-4 rounded-xl nx-callout flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-nx-bright">
                {theme === 'roasted' ? 'Modo Café Torrado (Noturno / Luz de Velas)' : 'Modo Papel & Café (Diurno / Vanilla-Reader)'}
              </p>
              <p className="text-[11px] text-nx-dim mt-0.5">
                {t('settings.theme.sub')}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="nx-btn-primary px-3.5 py-1.5 text-xs font-semibold cursor-pointer shrink-0"
            >
              Alternar Tema
            </button>
          </div>
        </div>

        {/* 3. Atalhos Operacionais */}
        <div className="p-6 rounded-2xl nx-sheet space-y-4">
          <div className="flex items-center gap-2 text-nx-bright font-bold text-sm">
            <Keyboard size={16} className="text-nx-accent" />
            Atalhos do Teclado
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-nx-surface border border-nx-border rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-nx-dim">Virar Flashcard</span>
              <kbd className="px-2 py-1 bg-nx-overlay border border-nx-border rounded font-mono text-[10px] text-nx-bright">Espaço</kbd>
            </div>
            <div className="p-3 bg-nx-surface border border-nx-border rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-nx-dim">Classificar Card (FSRS)</span>
              <kbd className="px-2 py-1 bg-nx-overlay border border-nx-border rounded font-mono text-[10px] text-nx-bright">1, 2, 3, 4</kbd>
            </div>
            <div className="p-3 bg-nx-surface border border-nx-border rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-nx-dim">Buscar Globalmente</span>
              <kbd className="px-2 py-1 bg-nx-overlay border border-nx-border rounded font-mono text-[10px] text-nx-bright">Ctrl + K</kbd>
            </div>
            <div className="p-3 bg-nx-surface border border-nx-border rounded-xl flex items-center justify-between shadow-xs">
              <span className="text-nx-dim">Abrir Copiloto Neural</span>
              <kbd className="px-2 py-1 bg-nx-overlay border border-nx-border rounded font-mono text-[10px] text-nx-bright">Ctrl + J</kbd>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
