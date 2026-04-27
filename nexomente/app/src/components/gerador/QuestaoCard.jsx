/**
 * QuestaoCard — card individual de questão no banco do Gerador.
 * Extraído de Gerador.jsx (Tarefa 4.1).
 * Memoizado (Tarefa 5.4+5.5): evita re-render quando filtros mudam mas a questão não.
 *
 * @param {{ questao, onEditar, onCriarFlashcard, onDeletar }} props
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Edit3, BookOpen, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

const QuestaoCard = memo(function QuestaoCard({ questao: q, onEditar, onCriarFlashcard, onDeletar }) {
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
            {(editData?.opcoes || []).map((o, i) => (
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
                <span className="text-xs text-text-muted">{q.materia || 'Geral'}</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{q.banca || 'IA'}</span>
                <span className="text-xs text-text-muted">{q.ano || new Date().getFullYear()}</span>
              </div>
              <p className="font-bold text-lg mb-4 text-text-primary leading-tight">{q.pergunta || 'Questão sem pergunta disponível'}</p>
              <div className="grid grid-cols-1 gap-2">
                {(q.opcoes || []).map(o => (
                  <div
                    key={o.letra}
                    className={`p-3 rounded-xl border transition-all flex gap-3 items-start ${
                      o.correta 
                        ? 'bg-success/10 border-success/30 text-success' 
                        : 'bg-bg-tertiary/50 border-border-subtle text-text-secondary'
                    }`}
                  >
                    <span className={`font-black text-xs px-2 py-1 rounded-lg ${o.correta ? 'bg-success text-white' : 'bg-bg-tertiary text-text-muted'}`}>
                      {o.letra}
                    </span>
                    <span className="text-sm">{o.texto || 'Opção vazia'}</span>
                  </div>
                ))}
                {(!q.opcoes || q.opcoes.length === 0) && (
                  <p className="text-xs text-danger italic">Esta questão não possui alternativas válidas.</p>
                )}
              </div>
              {q.opcoes && q.opcoes.find(o => o.correta)?.justificativa_correta && (
                <div className="mt-4 p-3 bg-bg-tertiary border-l-4 border-primary rounded-r-xl">
                  <p className="text-[10px] font-black uppercase text-primary mb-1">Justificativa</p>
                  <p className="text-xs text-text-secondary italic">{q.opcoes.find(o => o.correta).justificativa_correta}</p>
                </div>
              )}
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
});


QuestaoCard.propTypes = {
  questao: PropTypes.any,
  onEditar: PropTypes.func,
  onCriarFlashcard: PropTypes.func,
  onDeletar: PropTypes.func,
};

export default QuestaoCard;
