import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Cpu, Zap, Activity, Info } from 'lucide-react';

const QUALITY_PRESETS = {
  quality: {
    id: 'quality',
    label: '🎯 Qualidade Máxima',
    description: 'Ideal para resumos densos e precisos. Exige mais do computador.',
    cacheTypeK: 'q8_0',
    cacheTypeV: 'q4_0',
    contextSize: 8192,
    minRAM: 16,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  balanced: {
    id: 'balanced',
    label: '⚖️ Equilibrado',
    description: 'Otimizado para 8-16GB de RAM. Bom equilíbrio entre inteligência e leveza.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 4096,
    minRAM: 8,
    color: 'text-teal-400',
    borderColor: 'border-teal-500/30'
  },
  performance: {
    id: 'performance',
    label: '⚡ Desempenho',
    description: 'Foco total em velocidade. Ideal para computadores com menos de 8GB de RAM.',
    cacheTypeK: 'q4_0',
    cacheTypeV: 'q4_0',
    contextSize: 2048,
    minRAM: 4,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30'
  },
};

export default function AIPerformancePanel() {
  const [hardware, setHardware] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('balanced');

  useEffect(() => {
    const fetchHardware = async () => {
      if (!window.electronAPI?.getHardwareInfo) return;
      try {
        const info = await window.electronAPI.getHardwareInfo();
        if (info) {
          setHardware(info);
          // Auto-selecionar baseado no hardware
          if (info.ramGB >= 32) setSelectedPreset('quality');
          else if (info.ramGB >= 16) setSelectedPreset('balanced');
          else setSelectedPreset('performance');
        }
      } catch (err) {
        console.error('Falha ao obter hardware:', err);
      }
    };
    fetchHardware();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-accent-main/10 flex items-center justify-center text-accent-main">
              <Cpu size={20} />
           </div>
           <div>
              <h3 className="text-lg font-bold text-text-hi font-display">Desempenho da IA</h3>
              <p className="text-xs text-text-lo">Ajuste como o NexoMente utiliza seu hardware.</p>
           </div>
        </div>
        
        {hardware && (
          <Badge variant="gray" className="bg-white/5 border-white/10 py-1.5 px-3">
             <Activity size={12} className="mr-2 text-green-400" />
             {hardware.ramGB}GB RAM · {hardware.hasGPU ? 'GPU Ativa' : 'Apenas CPU'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(QUALITY_PRESETS).map((preset) => {
          const isSelected = selectedPreset === preset.id;
          const isCompatible = hardware ? hardware.ramGB >= preset.minRAM : true;

          return (
            <Card 
              key={preset.id}
              interactive={isCompatible}
              className={`glass-panel p-5 transition-all ${isSelected ? `border-2 ${preset.borderColor} bg-white/[0.03]` : 'border-white/5 opacity-60 hover:opacity-100'} ${!isCompatible ? 'grayscale cursor-not-allowed' : ''}`}
              onClick={() => isCompatible && setSelectedPreset(preset.id)}
            >
              <div className="flex items-center justify-between mb-4">
                 <div className={`text-sm font-bold ${preset.color}`}>{preset.label}</div>
                 {isSelected && <Zap size={14} className="text-accent-main fill-accent-main" />}
              </div>
              
              <p className="text-xs text-text-mid mb-6 leading-relaxed">
                {preset.description}
              </p>

              <div className="space-y-2 pt-4 border-t border-white/5">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-lo">Contexto</span>
                    <span className="text-text-hi">{preset.contextSize / 1000}k tokens</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-text-lo">Otimização</span>
                    <span className="text-text-hi">KV {preset.cacheTypeK}</span>
                 </div>
              </div>

              {!isCompatible && (
                <div className="mt-4 flex items-center gap-2 text-[10px] text-color-error font-bold uppercase">
                   <Info size={12} />
                   Requer {preset.minRAM}GB+ RAM
                </div>
              )}
            </Card>
          );
        })}
      </div>
      
      <p className="text-[10px] text-text-lo/40 text-center uppercase tracking-widest italic">
        * As alterações serão aplicadas na próxima vez que a IA for inicializada.
      </p>
    </div>
  );
}
