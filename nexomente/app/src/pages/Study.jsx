import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useMaterias } from '../hooks/useMaterias';
import { Play, Pause, RotateCcw, Clock, BookOpen, Plus, Check, Trash2 } from 'lucide-react';

const MODOS = [
  { id: 'pomodoro', label: 'Pomodoro', minutos: 25 },
  { id: 'foco', label: 'Foco', minutos: 50 },
  { id: 'livre', label: 'Livre', minutos: 15 },
];

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Study() {
  const { materias, create, update, remove } = useMaterias();
  const Sessoes = useUIStore.getState().Sessoes;
  const XP = useUIStore.getState().XP;

  const [timer, setTimer] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [materiaAtiva, setMateriaAtiva] = useState(null);
  const [sessaoId, setSessaoId] = useState(null);
  const [modo, setModo] = useState('pomodoro');
  const [novaMateria, setNovaMateria] = useState('');
  const [novaCor, setNovaCor] = useState('#6C63FF');
  const [showCriar, setShowCriar] = useState(false);
  const [sessoesList, setSessoesList] = useState([]);

  useEffect(() => {
    setSessoesList(Sessoes.getAll());
  }, []);

  useEffect(() => {
    let interval;
    if (rodando && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && rodando) {
      setRodando(false);
      if (sessaoId) {
        Sessoes.completar(sessaoId);
        XP.add(10, 'Sessão de estudo concluída', 'sessao', sessaoId);
        setSessoesList(Sessoes.getAll());
      }
    }
    return () => clearInterval(interval);
  }, [rodando, timer, sessaoId]);

  const iniciar = () => {
    const id = Sessoes.create({ materia_id: materiaAtiva, tipo: modo, duracao_minutos: Math.floor(timer / 60) });
    setSessaoId(id);
    setRodando(true);
  };

  const pausar = () => setRodando(false);
  const reiniciar = () => {
    setRodando(false);
    const m = MODOS.find(x => x.id === modo) || MODOS[0];
    setTimer(m.minutos * 60);
  };

  const criarMateria = () => {
    if (!novaMateria.trim()) return;
    create({ nome: novaMateria.trim(), cor: novaCor, meta_horas: 5 });
    setNovaMateria('');
    setShowCriar(false);
  };

  const sessoesHoje = sessoesList.filter(s => {
    if (!s.started_at) return false;
    return new Date(s.started_at).toDateString() === new Date().toDateString();
  });
  const minutosHoje = sessoesHoje.reduce((acc, s) => acc + (s.concluida ? s.duracao_minutos : 0), 0);

  const coresDisponiveis = ['#6C63FF', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Estudo</h1>
        <p className="text-sm text-text-muted">Pomodoro + matérias</p>
      </div>

      <div className="bg-bg-secondary rounded-xl p-8 border border-border-subtle text-center">
        <div className="text-7xl font-bold text-text-primary mb-6 font-mono">
          {formatarTempo(timer)}
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {!rodando ? (
            <button onClick={iniciar} className="px-8 py-3 bg-success rounded-xl text-lg font-semibold hover:bg-success/90 transition-colors cursor-pointer flex items-center gap-2">
              <Play size={24} /> Iniciar
            </button>
          ) : (
            <button onClick={pausar} className="px-8 py-3 bg-warning rounded-xl text-lg font-semibold hover:bg-warning/90 transition-colors cursor-pointer flex items-center gap-2">
              <Pause size={24} /> Pausar
            </button>
          )}
          <button onClick={reiniciar} className="px-4 py-3 bg-bg-tertiary border border-border-subtle rounded-xl hover:border-accent-main transition-colors cursor-pointer">
            <RotateCcw size={24} />
          </button>
        </div>

        <div className="flex justify-center gap-2">
          {MODOS.map(m => (
            <button key={m.id} onClick={() => { setModo(m.id); reiniciar(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                modo === m.id ? 'bg-accent-main' : 'bg-bg-tertiary border border-border-subtle hover:border-accent-main'
              }`}>
              {m.label} ({m.minutos}m)
            </button>
          ))}
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-text-primary">Matérias</h2>
          <button onClick={() => setShowCriar(!showCriar)}
            className="p-1 text-text-muted hover:text-accent-main cursor-pointer">
            <Plus size={18} />
          </button>
        </div>

        {showCriar && (
          <div className="mb-4 p-3 bg-bg-tertiary rounded-lg border border-border-subtle space-y-2">
            <input
              type="text"
              value={novaMateria}
              onChange={e => setNovaMateria(e.target.value)}
              placeholder="Nome da matéria..."
              onKeyDown={e => e.key === 'Enter' && criarMateria()}
              className="w-full bg-bg-secondary border border-border-subtle rounded px-3 py-1.5 text-sm focus:border-accent-main focus:outline-none"
            />
            <div className="flex items-center gap-2">
              {coresDisponiveis.map(cor => (
                <button
                  key={cor}
                  onClick={() => setNovaCor(cor)}
                  className={`w-6 h-6 rounded-full cursor-pointer ${novaCor === cor ? 'ring-2 ring-white ring-offset-1 ring-offset-bg-tertiary' : ''}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
              <button onClick={criarMateria}
                className="ml-auto px-4 py-1.5 bg-accent-main rounded text-xs font-medium cursor-pointer">
                Criar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMateriaAtiva(null)}
            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
              !materiaAtiva ? 'bg-accent-main' : 'bg-bg-tertiary border border-border-subtle hover:border-accent-main'
            }`}>
            Todas
          </button>
          {materias.map(m => (
            <div key={m.id} className="group flex items-center gap-1">
              <button
                onClick={() => setMateriaAtiva(m.id)}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
                  materiaAtiva === m.id ? 'bg-accent-main' : 'bg-bg-tertiary border border-border-subtle hover:border-accent-main'
                }`}
                style={{ borderLeftColor: m.cor, borderLeftWidth: '3px', borderLeftStyle: 'solid' }}>
                {m.nome}
              </button>
              <button
                onClick={() => remove(m.id)}
                className="p-1 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle text-center">
          <Clock className="text-accent-main mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">{minutosHoje}</p>
          <p className="text-sm text-text-muted">min hoje</p>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle text-center">
          <Check className="text-success mx-auto mb-2" size={24} />
          <p className="text-2xl font-bold text-text-primary">
            {sessoesHoje.filter(s => s.concluida).length}
          </p>
          <p className="text-sm text-text-muted">sessões concluídas</p>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border-subtle">
        <h3 className="font-semibold text-text-primary mb-3 text-sm">Progresso por Matéria</h3>
        {materias.length === 0 ? (
          <p className="text-sm text-text-muted">Crie uma matéria para acompanhar progresso</p>
        ) : (
          <div className="space-y-3">
            {materias.map(m => {
              const min = sessoesList
                .filter(s => s.materia_id === m.id && s.concluida)
                .reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
              const progresso = Math.min(100, Math.round((min / ((m.meta_horas || 5) * 60)) * 100));
              return (
                <div key={m.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-primary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor }} />
                      {m.nome}
                    </span>
                    <span className="text-text-muted">{min}m / {m.meta_horas * 60}m</span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progresso}%`, backgroundColor: m.cor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}