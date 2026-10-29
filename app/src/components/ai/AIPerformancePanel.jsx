import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const QUALITY_PRESETS = {
  quality: {
    id: 'quality',
    label: '🎯 Qualidade Máxima',
    description: 'Ideal para resumos densos e precisos. Exige mais capacidade de memória do computador.',
    cacheTypeK: 'q8_0',
    cacheTypeV: 'q4_0',
    contextSize: 8192,
    minRAM: 14,
    color: 'text-nx-secondary',
    borderColor: 'border-nx-secondary'
  },
  balanced: {
    id: 'balanced',
    label: '⚖️ Equilibrado',
    description: 'Otimizado para 8-16GB de RAM. Excelente balanço entre velocidade, inteligência e leveza.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 4096,
    minRAM: 8,
    color: 'text-nx-primary',
    borderColor: 'border-nx-primary'
  },
  performance: {
    id: 'performance',
    label: '⚡ Desempenho Rápido',
    description: 'Foco total em velocidade de resposta e economia de recursos para qualquer hardware.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 2048,
    minRAM: 4,
    color: 'text-nx-accent',
    borderColor: 'border-nx-accent'
  },
};

export default function AIPerformancePanel() {
  const [hardware, setHardware] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(() => localStorage.getItem('nexomente_ai_preset') || 'balanced');

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    localStorage.setItem('nexomente_ai_preset', preset.id);
    localStorage.setItem('nexomente_ai_max_tokens', String(Math.min(4096, Math.round(preset.contextSize / 2))));
    toast.success(`Perfil "${preset.label.replace(/^[^\s]+\s/, '')}" ativado!`);
  };

  useEffect(() => {
    const fetchHardware = async () => {
      if (!window.electronAPI?.getHardwareInfo) return;
      try {
        const info = await window.electronAPI.getHardwareInfo();
        if (info) {
          setHardware(info);
          if (!localStorage.getItem('nexomente_ai_preset')) {
            if (info.ramGB >= 32) setSelectedPreset('quality');
            else if (info.ramGB >= 16) setSelectedPreset('balanced');
            else setSelectedPreset('performance');
          }
        }
      } catch (err) {
        console.error('Falha ao obter hardware:', err);
      }
    };
    fetchHardware();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nx-primary-bg flex items-center justify-center text-nx-primary border border-nx-primary/20 shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-nx-bright font-display">Desempenho da IA Local</h3>
            <p className="text-xs text-nx-dim">Ajuste os parâmetros de inferência neural ao seu hardware.</p>
          </div>
        </div>

        {hardware && (
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-nx-surface border border-nx-border shadow-xs text-xs font-mono text-nx-bright">
            <Activity size={13} className="text-nx-success" />
            <span>{hardware.ramGB}GB RAM · {hardware.hasGPU ? 'GPU Ativa' : 'CPU Only'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(QUALITY_PRESETS).map((preset) => {
          const isSelected = selectedPreset === preset.id;
          const isCompatible = hardware ? hardware.ramGB >= preset.minRAM : true;

          return (
            <div
              key={preset.id}
              onClick={() => isCompatible && handleSelectPreset(preset)}
              className={`nx-glass p-5 transition-all cursor-pointer select-none ${
                isSelected
                  ? `border-2 ${preset.borderColor} shadow-md bg-nx-surface/90`
                  : 'border-nx-border opacity-70 hover:opacity-100 hover:bg-nx-surface/75'
              } ${!isCompatible ? 'grayscale cursor-not-allowed opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`text-sm font-bold ${preset.color}`}>{preset.label}</div>
                {isSelected && <Zap size={14} className="text-nx-primary fill-nx-primary" />}
              </div>

              <p className="text-xs text-nx-dim mb-5 leading-relaxed min-h-[38px]">
                {preset.description}
              </p>

              <div className="space-y-2 pt-3 border-t border-nx-border/60">
                <div className="flex justify-between text-[10.5px] font-mono uppercase tracking-wider">
                  <span className="text-nx-dim">Contexto</span>
                  <span className="text-nx-bright font-bold">{preset.contextSize / 1000}k tokens</span>
                </div>
                <div className="flex justify-between text-[10.5px] font-mono uppercase tracking-wider">
                  <span className="text-nx-dim">Otimização</span>
                  <span className="text-nx-bright font-bold">KV {preset.cacheTypeK}</span>
                </div>
              </div>

              {!isCompatible && (
                <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-nx-error font-bold uppercase tracking-wider">
                  <Info size={12} />
                  <span>Requer {preset.minRAM}GB RAM</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10.5px] text-nx-dim/70 text-center uppercase tracking-widest font-mono">
        ✦ Configurações salvas e aplicadas a cada sessão do motor neural local.
      </p>
    </div>
  );
}
