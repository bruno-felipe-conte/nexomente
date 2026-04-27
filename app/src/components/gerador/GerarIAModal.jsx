import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, X, Cpu, Globe, Zap, Bot } from 'lucide-react';
import PropTypes from 'prop-types';

export default function GerarIAModal({ materias, bancas, onClose, onGerar }) {
  const [config, setConfig] = useState({
    materia: '',
    topico: '',
    banca: 'FCC',
    quantidade: 5,
    nivel: 'medio',
    provider: localStorage.getItem('nexomente_ai_provider') || 'embedded'
  });

  const handleGerar = () => {
    if (!config.materia) {
      alert('Por favor, selecione uma matéria.');
      return;
    }
    onGerar(config);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGerar();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="bg-bg-secondary/95 border border-white/10 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.4)] p-10 w-full max-w-xl overflow-hidden backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Decorativo */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-main/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 text-primary rounded-2xl">
                <Bot size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-text-primary leading-tight">Gerar com IA</h2>
                <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-black">Professor Virtual</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-white/5 rounded-2xl text-text-muted transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Seletor de IA ISOLADO */}
            <div className="p-1 bg-bg-tertiary/50 rounded-3xl border border-white/5">
              <label className="px-4 pt-3 pb-2 block text-[10px] font-black text-text-muted uppercase tracking-widest">Motor de IA (Este Processamento)</label>
              <div className="grid grid-cols-3 gap-1 p-1">
                {[
                  { id: 'embedded', icon: Zap, label: 'Interno' },
                  { id: 'cloud', icon: Globe, label: 'Gemini' },
                  { id: 'local', icon: Cpu, label: 'LM Studio' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setConfig({ ...config, provider: p.id })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all border ${
                      config.provider === p.id 
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                        : 'bg-transparent border-transparent text-text-muted hover:bg-white/5'
                    }`}
                  >
                    <p.icon size={14} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="px-1 block text-[10px] font-black text-text-muted uppercase tracking-widest">Matéria</label>
                <select
                  autoFocus
                  value={config.materia}
                  onChange={(e) => setConfig({ ...config, materia: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border-subtle rounded-2xl text-sm font-bold focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {materias.map(m => (
                    <option key={m.id} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="px-1 block text-[10px] font-black text-text-muted uppercase tracking-widest">Banca Estilo</label>
                <select
                  value={config.banca}
                  onChange={(e) => setConfig({ ...config, banca: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border-subtle rounded-2xl text-sm font-bold focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {bancas.map(b => (
                    <option key={b.key} value={b.nome}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="px-1 block text-[10px] font-black text-text-muted uppercase tracking-widest">Quantidade</label>
                <div className="flex items-center gap-3 bg-bg-tertiary border border-border-subtle rounded-2xl px-4 py-2">
                  <input
                    type="range"
                    min="1" max="20"
                    value={config.quantidade}
                    onChange={(e) => setConfig({ ...config, quantidade: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 bg-bg-primary rounded-full appearance-none accent-primary"
                  />
                  <span className="text-sm font-black text-primary w-6 text-center">{config.quantidade}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-1 block text-[10px] font-black text-text-muted uppercase tracking-widest">Dificuldade</label>
                <div className="grid grid-cols-3 gap-2">
                  {['facil', 'medio', 'dificil'].map(l => (
                    <button
                      key={l}
                      onClick={() => setConfig({ ...config, nivel: l })}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${
                        config.nivel === l 
                          ? 'bg-bg-primary border-primary text-primary shadow-sm' 
                          : 'bg-bg-tertiary/50 border-transparent text-text-muted'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={handleGerar}
              className="w-full py-5 bg-gradient-to-r from-primary to-accent-main text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_15px_40px_rgba(108,99,255,0.3)] flex items-center justify-center gap-3"
            >
              <Wand2 size={20} /> Forjar Questões
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

GerarIAModal.propTypes = {
  materias: PropTypes.array,
  bancas: PropTypes.array,
  onClose: PropTypes.func,
  onGerar: PropTypes.func,
};
