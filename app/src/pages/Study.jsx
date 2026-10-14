import React, { useState, useEffect } from 'react';
import { useDBStore } from '../store/useDBStore';
import { useMaterias } from '../hooks/useMaterias';
import { useStudyTimerStore, MODOS_ESTUDO } from '../store/useStudyTimerStore';
import { Play, Pause, RotateCcw, Clock, Check, Plus, Trash2, Zap, AlertCircle } from 'lucide-react';
import CircularTimer from '../components/study/CircularTimer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const MODOS = MODOS_ESTUDO;

export default function Study() {
  const { materias, create, remove } = useMaterias();
  const { SessoesEstudo } = useDBStore();

  const {
    timer,
    totalSeconds,
    rodando,
    modo,
    materiaAtiva,
    iniciar,
    pausar,
    trocarModo,
    setMateriaAtiva,
    setIsMiniaturized
  } = useStudyTimerStore();

  const [showCriar, setShowCriar] = useState(false);
  const [novaMateria, setNovaMateria] = useState('');

  const currentModo = MODOS.find(m => m.id === modo) || MODOS[0];

  // Sincroniza a lista de sessões quando uma sessão for iniciada/concluída
  const sessoesList = React.useMemo(() => {
    return SessoesEstudo?.getAll?.() || [];
  }, [SessoesEstudo]);

  // Ao montar na aba Study, desativa miniatura. Ao desmontar em teste ou fechamento isolado, abandona
  useEffect(() => {
    setIsMiniaturized(false);
    return () => {
      const state = useStudyTimerStore.getState();
      if (state.sessaoId && !state.completed && !state.isMiniaturized) {
        SessoesEstudo?.abandonar?.(state.sessaoId);
      }
    };
  }, [setIsMiniaturized, SessoesEstudo]);

  const sessoesConcluidasHoje = sessoesList.filter(s =>
    Boolean(s.concluida) && s.started_at && new Date(s.started_at).toDateString() === new Date().toDateString()
  );
  const minutosHoje = sessoesConcluidasHoje.reduce((acc, s) => acc + (s.duracao_minutos || 0), 0);
  const xpDiarioCalculado = sessoesConcluidasHoje.reduce((acc, s) => {
    const modoCfg = MODOS.find(m => m.id === s.tipo);
    return acc + (modoCfg?.xp || 15);
  }, 0);

  return (
    <div className="main-content p-4 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-display font-bold text-text-hi mb-2">Sala de Estudos</h1>
           <p className="text-text-mid text-sm">Timer Pomodoro integrado com seu progresso.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
           <Zap size={16} className="text-xp" />
           <span className="text-sm font-bold text-text-hi">XP Diário: +{xpDiarioCalculado}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Central: Timer */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-8">

          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
            {MODOS.map(m => (
              <button
                key={m.id}
                onClick={() => trocarModo(m)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${modo === m.id ? 'bg-white/10 text-white shadow-lg' : 'text-text-lo hover:text-text-hi'}`}
              >
                <span>{m.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${modo === m.id ? 'bg-white/20 text-white font-black' : 'bg-white/5 text-text-lo'}`}>
                  +{m.xp} XP
                </span>
              </button>
            ))}
          </div>

          <CircularTimer
            seconds={timer}
            totalSeconds={totalSeconds}
            isActive={rodando}
            color={currentModo.color}
          />

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant="primary"
              className={`min-w-[160px] h-14 rounded-2xl shadow-xl transition-all active:scale-95 ${rodando ? 'bg-warning hover:bg-warning/90' : 'bg-success hover:bg-success/90'}`}
              onClick={rodando ? pausar : () => iniciar()}
            >
              {rodando ? <><Pause className="mr-2" size={20} /> Pausar</> : <><Play className="mr-2" size={20} /> Iniciar</>}
            </Button>

            <button
              onClick={() => trocarModo(currentModo)}
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-lo hover:text-text-hi hover:bg-white/10 transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Dica Contextual */}
          {!materiaAtiva && modo !== 'descanso' && !rodando && (
            <div className="flex items-center gap-2 text-warning animate-bounce">
               <AlertCircle size={14} />
               <span className="text-xs font-bold uppercase tracking-widest">Selecione uma matéria abaixo</span>
            </div>
          )}
        </div>

        {/* Lateral: Matérias & Stats */}
        <div className="lg:col-span-4 space-y-6">

          <Card className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-text-hi font-display">Suas Matérias</h3>
              <button onClick={() => setShowCriar(!showCriar)} className="p-1.5 rounded-lg bg-white/5 text-text-lo hover:text-accent-main transition-colors">
                <Plus size={16} />
              </button>
            </div>

            {showCriar && (
              <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                 <input
                   autoFocus
                   placeholder="Nome da matéria..."
                   className="w-full bg-transparent border-none text-sm text-text-hi placeholder:text-text-lo focus:ring-0"
                   value={novaMateria}
                   onChange={e => setNovaMateria(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && create({ nome: novaMateria, cor: '#2DD4BF' }) && setNovaMateria('') && setShowCriar(false)}
                 />
                 <div className="flex justify-end">
                    <Button size="xs" onClick={() => { create({ nome: novaMateria, cor: '#2DD4BF' }); setNovaMateria(''); setShowCriar(false); }}>Criar</Button>
                 </div>
              </div>
            )}

            <div className="space-y-3">
              {materias.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMateriaAtiva(m.id)}
                  className={`w-full group flex items-center justify-between p-3 rounded-xl border transition-all ${materiaAtiva === m.id ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor }} />
                    <span className={`text-sm font-bold ${materiaAtiva === m.id ? 'text-text-hi' : 'text-text-lo group-hover:text-text-mid'}`}>{m.nome}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); remove(m.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-text-lo hover:text-danger transition-all">
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
             <Card className="glass-panel p-4 flex flex-col items-center text-center">
                <Clock size={20} className="text-teal-400 mb-2" />
                <span className="text-xl font-black text-text-hi tabular-nums">{minutosHoje}m</span>
                <span className="text-[10px] font-bold text-text-lo uppercase">Estudado hoje</span>
             </Card>
             <Card className="glass-panel p-4 flex flex-col items-center text-center">
                <Check size={20} className="text-success mb-2" />
                <span className="text-xl font-black text-text-hi tabular-nums">{sessoesConcluidasHoje.length}</span>
                <span className="text-[10px] font-bold text-text-lo uppercase">Sessões</span>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}