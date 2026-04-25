/**
 * FlashcardsPage — revisão espaçada SM-2.
 * Refatorado (Tarefa 4.1): FlashcardViewer extraído para componente próprio.
 */
import { useState, useEffect } from 'react';
import { Plus, RotateCcw, Trash2, Edit, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFlashcards } from '../hooks/useFlashcards';
import FlashcardViewer from '../components/flashcards/FlashcardViewer';

export default function FlashcardsPage() {
  const { cards, create, update, remove, revisar, getParaRevisao, getDominados, stats } = useFlashcards();

  const [modo, setModo] = useState('revisao');
  const [cardAtual, setCardAtual] = useState(null);
  const [mostrandoFrente, setMostrandoFrente] = useState(true);
  const [idxRevisao, setIdxRevisao] = useState(0);

  const [showCriar, setShowCriar] = useState(false);
  const [novaFrente, setNovaFrente] = useState('');
  const [novoVerso, setNovoVerso] = useState('');
  const [novoMateria, setNovoMateria] = useState('geral');

  const [editandoId, setEditandoId] = useState(null);
  const [editFrente, setEditFrente] = useState('');
  const [editVerso, setEditVerso] = useState('');

  const [undoCard, setUndoCard] = useState(null);
  const [undoCountdown, setUndoCountdown] = useState(0);

  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  const paraRevisao = getParaRevisao();
  const dominados = getDominados();

  useEffect(() => {
    if (modo === 'revisao' && paraRevisao.length > 0 && !cardAtual) {
      setCardAtual(paraRevisao[0]);
      setIdxRevisao(0);
      setMostrandoFrente(true);
    }
  }, [modo]);

  useEffect(() => {
    if (!undoCard) return;
    setUndoCountdown(5);
    const t = setInterval(() => {
      setUndoCountdown(c => {
        if (c <= 1) { clearInterval(t); setUndoCard(null); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [undoCard]);

  const avancar = () => {
    const proximo = paraRevisao[idxRevisao + 1];
    if (proximo) { setCardAtual(proximo); setIdxRevisao(i => i + 1); setMostrandoFrente(true); }
    else setCardAtual(null);
  };

  const handleRevisar = (qualidade) => {
    if (!cardAtual) return;
    setUndoCard({ ...cards.find(c => c.id === cardAtual.id), _q: qualidade });
    revisar(cardAtual.id, qualidade);
    avancar();
  };

  const handleUndo = () => {
    if (!undoCard) return;
    create({ frente: undoCard.frente, verso: undoCard.verso, materia: undoCard.materia });
    remove(undoCard.id);
    setUndoCard(null);
  };

  const criarCard = () => {
    if (!novaFrente.trim() || !novoVerso.trim()) return;
    create({ frente: novaFrente.trim(), verso: novoVerso.trim(), materia: novoMateria });
    setNovaFrente(''); setNovoVerso(''); setShowCriar(false);
  };

  const salvarEdicao = () => {
    if (!editandoId || !editFrente.trim() || !editVerso.trim()) return;
    update(editandoId, { frente: editFrente.trim(), verso: editVerso.trim() });
    setEditandoId(null);
  };

  const cardsFiltrados = cards.filter(c => {
    if (busca && !c.frente.toLowerCase().includes(busca.toLowerCase()) && !c.verso.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === 'dominados') return c.ef >= 2.5 && c.repetitions >= 3;
    if (filtro === 'revisar') return paraRevisao.some(p => p.id === c.id);
    return true;
  });

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Flashcards</h1>
            <p className="text-sm text-text-muted">Revisão espaçada SM-2</p>
          </div>
          <div className="flex gap-2">
            {['revisao', 'todos', 'editar'].map(m => (
              <button key={m}
                onClick={() => { setModo(m); setCardAtual(null); setEditandoId(null); }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${modo === m ? 'bg-accent-main text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
                {m === 'revisao' ? 'Revisar' : m === 'todos' ? 'Ver Todos' : 'Gerenciar'}
              </button>
            ))}
            <button onClick={() => setShowCriar(!showCriar)}
              className="px-3 py-1.5 bg-accent-main rounded text-xs font-medium hover:bg-accent-main/90 transition-colors cursor-pointer flex items-center gap-1">
              <Plus size={12} /> Card
            </button>
          </div>
        </div>

        {/* Toast de desfazer */}
        {undoCard && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-warning/10 border border-warning/40 rounded-lg px-4 py-2 text-sm">
            <span className="text-text-secondary">
              Último: <span className="text-warning font-medium">{undoCard.frente.substring(0, 25)}</span>
              <span className="ml-2 text-xs">({undoCard._q === 5 ? 'acertou' : undoCard._q === 1 ? 'errou' : 'quase'})</span>
            </span>
            <button onClick={handleUndo}
              className="px-3 py-1 bg-warning/20 rounded text-xs font-medium hover:bg-warning/30 cursor-pointer flex items-center gap-1">
              <RotateCcw size={10} /> Desfazer ({undoCountdown}s)
            </button>
          </motion.div>
        )}

        {/* Modo revisão */}
        {modo === 'revisao' && (
          <>
            {showCriar && (
              <div className="bg-bg-secondary rounded-lg p-4 border border-border-subtle">
                <h3 className="font-semibold text-text-primary mb-3 text-sm">Novo Flashcard</h3>
                <div className="space-y-2">
                  <input value={novaFrente} onChange={e => setNovaFrente(e.target.value)} placeholder="Frente (pergunta)..."
                    className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:border-accent-main focus:outline-none" />
                  <input value={novoVerso} onChange={e => setNovoVerso(e.target.value)} placeholder="Verso (resposta)..."
                    className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:border-accent-main focus:outline-none" />
                  <button onClick={criarCard} className="w-full py-2 bg-accent-main rounded text-sm font-medium cursor-pointer">Criar</button>
                </div>
              </div>
            )}
            <FlashcardViewer
              cardAtual={cardAtual}
              paraRevisao={paraRevisao}
              idxRevisao={idxRevisao}
              mostrandoFrente={mostrandoFrente}
              onViraCard={() => setMostrandoFrente(p => !p)}
              onRevisar={handleRevisar}
              onAnterior={() => { if (idxRevisao > 0) { setIdxRevisao(i => i - 1); setCardAtual(paraRevisao[idxRevisao - 1]); setMostrandoFrente(true); }}}
              onProximo={() => { if (idxRevisao < paraRevisao.length - 1) { setIdxRevisao(i => i + 1); setCardAtual(paraRevisao[idxRevisao + 1]); setMostrandoFrente(true); }}}
              onEditar={(card) => { setEditandoId(card.id); setEditFrente(card.frente); setEditVerso(card.verso); setModo('editar'); }}
              onCriar={() => setShowCriar(true)}
            />
          </>
        )}

        {/* Modo todos / gerenciar */}
        {(modo === 'todos' || modo === 'editar') && (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cards..."
                className="flex-1 bg-bg-secondary border border-border-subtle rounded px-3 py-1.5 text-sm focus:border-accent-main focus:outline-none" />
              <select value={filtro} onChange={e => setFiltro(e.target.value)}
                className="bg-bg-secondary border border-border-subtle rounded px-2 py-1.5 text-sm cursor-pointer">
                <option value="todos">Todos</option>
                <option value="revisar">Para revisar</option>
                <option value="dominados">Dominados</option>
              </select>
            </div>

            {cardsFiltrados.length === 0 ? (
              <div className="text-center py-12 text-text-muted"><p>Nenhum card encontrado</p></div>
            ) : cardsFiltrados.map(card => {
              const paraRev = paraRevisao.some(p => p.id === card.id);
              const dom = card.ef >= 2.5 && card.repetitions >= 3;
              if (editandoId === card.id) return (
                <div key={card.id} className="bg-bg-secondary rounded-lg p-4 border border-accent-main">
                  <input value={editFrente} onChange={e => setEditFrente(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 text-sm mb-2 focus:outline-none" />
                  <input value={editVerso} onChange={e => setEditVerso(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 text-sm mb-2 focus:outline-none" />
                  <div className="flex gap-2">
                    <button onClick={salvarEdicao} className="px-3 py-1.5 bg-success rounded text-xs font-medium cursor-pointer flex items-center gap-1"><Save size={12} /> Salvar</button>
                    <button onClick={() => setEditandoId(null)} className="px-3 py-1.5 bg-bg-tertiary border border-border-subtle rounded text-xs cursor-pointer">Cancelar</button>
                  </div>
                </div>
              );
              return (
                <div key={card.id} className="bg-bg-secondary rounded-lg p-3 border border-border-subtle flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{card.frente}</p>
                    <p className="text-xs text-text-muted truncate mt-0.5">{card.verso}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">ef:{card.ef?.toFixed(1)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">rep:{card.repetitions}</span>
                      {paraRev && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">revisar</span>}
                      {dom && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success">dominado</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {modo === 'editar' && (
                      <button onClick={() => { setEditandoId(card.id); setEditFrente(card.frente); setEditVerso(card.verso); }}
                        className="p-1.5 text-text-muted hover:text-text-primary cursor-pointer"><Edit size={14} /></button>
                    )}
                    <button onClick={() => remove(card.id)} className="p-1.5 text-text-muted hover:text-danger cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', valor: stats.total },
            { label: 'Para revisar', valor: stats.paraRevisar, cor: stats.paraRevisar > 0 ? 'text-warning' : '' },
            { label: 'Dominados', valor: stats.dominados, cor: 'text-success' },
          ].map(s => (
            <div key={s.label} className="bg-bg-secondary rounded-lg p-3 border border-border-subtle text-center">
              <p className={`text-xl font-bold ${s.cor || 'text-text-primary'}`}>{s.valor}</p>
              <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}