/**
 * GerarIAModal — modal de configuração para geração de questões com IA.
 * Extraído de Gerador.jsx (Tarefa 4.1).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, X } from 'lucide-react';

export default function GerarIAModal({ materias, bancas, onClose, onGerar }) {
  const [config, setConfig] = useState({
    materia: '',
    topico: '',
    banca: 'FCC',
    quantidade: 5,
    nivel: 'medio',
  });

  const handleGerar = () => {
    onGerar(config);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-bg-primary p-6 rounded-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Gerar com IA</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Matéria</label>
            <select
              value={config.materia}
              onChange={(e) => setConfig({ ...config, materia: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="">Selecione...</option>
              {materias.map(m => (
                <option key={m.id} value={m.nome}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Banca</label>
            <select
              value={config.banca}
              onChange={(e) => setConfig({ ...config, banca: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              {bancas.map(b => (
                <option key={b.key} value={b.nome}>{b.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Quantidade</label>
            <input
              type="number"
              value={config.quantidade}
              onChange={(e) => setConfig({ ...config, quantidade: parseInt(e.target.value) || 5 })}
              min={1} max={20}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Nível</label>
            <select
              value={config.nivel}
              onChange={(e) => setConfig({ ...config, nivel: e.target.value })}
              className="w-full p-2 bg-bg-secondary border border-border-subtle rounded-lg"
            >
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGerar}
            className="flex-1 px-4 py-3 bg-primary rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Wand2 size={20} /> Gerar Questões
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
