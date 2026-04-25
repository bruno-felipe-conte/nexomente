/**
 * QuestaoCard — card individual de questão no banco do Gerador.
 * Extraído de Gerador.jsx (Tarefa 4.1).
 *
 * @param {{ questao, onEditar, onCriarFlashcard, onDeletar }} props
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, BookOpen, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuestaoCard({ questao: q, onEditar, onCriarFlashcard, onDeletar }) {
  const [editando, setEditando] = useState(false);
  const [editData, setEditData] = useState(null);

  const iniciarEdicao = () => {
    setEditData({ ...q });
    setEditando(true);
  };

  const salvarEdicao = () => {
    onEditar(q.id, editData);
    setEditando(false);
    setEditData(null);
    toast.success('Questão atualizada!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-bg-secondary border border-border-subtle rounded-xl"
    >
      {editando ? (
        <div className="space-y-3">
          <input
            value={editData?.pergunta || ''}
            onChange={(e) => setEditData({ ...editData, pergunta: e.target.value })}
            className="w-full p-2 bg-bg-tertiary border border-border-subtle rounded-lg"
          />
          <div className="flex gap-2">
            {editData?.opcoes.map((o, i) => (
              <div key={o.letra} className="flex-1 flex gap-2">
                <span className="py-2">{o.letra})</span>
                <input
                  value={o.texto}
                  onChange={(e) => {
                    const novas = [...editData.opcoes];
                    novas[i] = { ...novas[i], texto: e.target.value };
                    setEditData({ ...editData, opcoes: novas });
                  }}
                  className="flex-1 p-2 bg-bg-tertiary border border-border-subtle rounded-lg"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={salvarEdicao} className="px-4 py-2 bg-success rounded-lg flex items-center gap-2">
              <Save size={16} /> Salvar
            </button>
            <button onClick={() => setEditando(false)} className="px-4 py-2 bg-bg-tertiary rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-text-muted">{q.materia}</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{q.banca}</span>
                <span className="text-xs text-text-muted">{q.ano}</span>
              </div>
              <p className="font-medium">{q.pergunta}</p>
              <div className="mt-2 text-sm">
                {q.opcoes.map(o => (
                  <span
                    key={o.letra}
                    className={`mr-3 ${o.correta ? 'text-success font-medium' : 'text-text-muted'}`}
                  >
                    {o.letra}) {o.texto.substring(0, 30)}...
                  </span>
                ))}
              </div>
              <div className="mt-2 text-sm text-success">Gabarito: {q.resposta_correta}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={iniciarEdicao} className="p-2 hover:bg-bg-tertiary rounded-lg">
                <Edit3 size={16} />
              </button>
              <button onClick={() => onCriarFlashcard(q.id)} className="p-2 hover:bg-bg-tertiary rounded-lg" title="Criar flashcard">
                <BookOpen size={16} />
              </button>
              <button onClick={() => onDeletar(q.id)} className="p-2 hover:bg-error/10 text-error rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
