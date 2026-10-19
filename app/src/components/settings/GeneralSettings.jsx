import React from 'react';
import { Globe, Palette, Keyboard, Check } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷', desc: 'Interface e modelo neural em pt-BR' },
  { id: 'en-US', label: 'English (US)', flag: '🇺🇸', desc: 'Interface and English prompts' },
  { id: 'es-ES', label: 'Español', flag: '🇪🇸', desc: 'Interfaz y prompts en español' },
];

export default function GeneralSettings() {
  const { locale, setLocale } = useTranslation();

  const handleSelectLanguage = (langId) => {
    setLocale(langId);
    toast.success(`Idioma alterado para ${LANGUAGES.find(l => l.id === langId)?.label || langId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-xl font-serif font-bold text-text-hi flex items-center gap-2.5">
            <Globe className="text-accent-main" size={22} />
            Geral & Preferências Globais
          </h3>
          <p className="text-xs text-text-lo/60 mt-1">
            Idioma do ecossistema, temas de interface e atalhos operacionais de produtividade.
          </p>
        </div>
      </div>

      {/* Grid de Seções */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Seletor de Idioma */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
            <Globe size={16} className="text-accent-main" />
            Idioma da Interface (i18n)
          </div>
          <p className="text-xs text-text-lo/50">
            Altera todos os rótulos visuais, botões, métricas e terminologias de forma imediata.
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
                      ? 'bg-accent-main/10 border-accent-main/40 text-text-hi shadow-md ring-1 ring-accent-main/30'
                      : 'bg-white/[0.02] border-white/5 text-text-lo/70 hover:bg-white/[0.04] hover:text-text-hi'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xl">{item.flag}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-accent-main flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] text-text-lo/40 mt-1">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Tema & Interface */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
            <Palette size={16} className="text-purple-400" />
            Design & Estética Cognitiva
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-hi">Tema Deep Void (Obsidian Dark)</p>
              <p className="text-[10px] text-text-lo/50 mt-0.5">
                Paleta monocromática com micro-contraste OLED para máxima imersão e foco prolongado sem fadiga visual.
              </p>
            </div>
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Ativo (Padrão)
            </span>
          </div>
        </div>

        {/* 3. Atalhos Operacionais */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
            <Keyboard size={16} className="text-emerald-400" />
            Atalhos do Teclado
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-text-lo/70">Virar Flashcard</span>
              <kbd className="px-2 py-1 bg-black/40 border border-white/10 rounded font-mono text-[10px] text-text-hi">Espaço</kbd>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-text-lo/70">Classificar Card (Errei / Bom)</span>
              <kbd className="px-2 py-1 bg-black/40 border border-white/10 rounded font-mono text-[10px] text-text-hi">1, 2, 3, 4</kbd>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-text-lo/70">Buscar Globalmente</span>
              <kbd className="px-2 py-1 bg-black/40 border border-white/10 rounded font-mono text-[10px] text-text-hi">Ctrl + K</kbd>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-text-lo/70">Alternar Modo Foco</span>
              <kbd className="px-2 py-1 bg-black/40 border border-white/10 rounded font-mono text-[10px] text-text-hi">F11 / Zen</kbd>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
