import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDBStore } from '../store/useDBStore';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useMaterias } from '../hooks/useMaterias';
import { Play, Pause, RotateCcw, Clock, Check, Plus, Trash2, Zap, AlertCircle } from 'lucide-react';
import CircularTimer from '../components/study/CircularTimer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const MODOS = [
  { id: 'pomodoro', label: 'Pomodoro', minutos: 25, color: '#2DD4BF', xp: 15 },
  { id: 'foco', label: 'Foco Profundo', minutos: 50, color: '#6C63FF', xp: 30 },
  { id: 'descanso', label: 'Pausa Curta', minutos: 5, color: '#F59E0B', xp: 5 },
];

export default function Study() {
  const { materias, create, remove } = useMaterias();
  const { SessoesEstudo, XP } = useDBStore();

  const [timer, setTimer] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const [materiaAtiva, setMateriaAtiva] = useState(null);
  const [sessaoId, setSessaoId] = useState(null);
  const [modo, setModo] = useState('pomodoro');
  const [showCriar, setShowCriar] = useState(false);
  const [novaMateria, setNovaMateria] = useState('');
  const [sessoesList, setSessoesList] = useState(() => SessoesEstudo?.getAll() || []);

  const sessaoIdRef = useRef(sessaoId);
  useEffect(() => {
    sessaoIdRef.current = sessaoId;
  }, [sessaoId]);

  const targetEndTimeRef = useRef(null);
  const completedRef = useRef(false);

  const currentModo = MODOS.find(m => m.id === modo);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    const activeId = sessaoIdRef.current;
    if (activeId) {
      completedRef.current = true;
      SessoesEstudo.completar(activeId);
      const xpGanho = currentModo.xp || 15;
      XP.add(xpGanho, 'Sessão concluída', 'sessao', activeId);
      useTamagotchiStore.getState().registerStudySession(currentModo.minutos);
      setSessoesList(SessoesEstudo.getAll());
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // no-op if canvas is unavailable
      }
      toast.success(`Sessão finalizada! +${xpGanho} XP`);
    }
    setRodando(false);
    setSessaoId(null);
    targetEndTimeRef.current = null;
  }, [SessoesEstudo, XP, currentModo]);

  useEffect(() => {
    if (!rodando) {
      targetEndTimeRef.current = null;
      return;
    }

    if (!targetEndTimeRef.current) {
      targetEndTimeRef.current = Date.now() + timer * 1000;
    }

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const restante = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setTimer(restante);
    }, 1000);

    return () => clearInterval(interval);
  }, [rodando, timer]);

  useEffect(() => {
    if (rodando && timer === 0) {
      handleComplete();
    }
  }, [rodando, timer, handleComplete]);

  // Limpeza de sessão órfã ao desmontar a tela
  useEffect(() => {
    return () => {
      if (sessaoIdRef.current && !completedRef.current) {
        SessoesEstudo.abandonar?.(sessaoIdRef.current);
      }
    };
  }, [SessoesEstudo]);

  const iniciar = () => {
    if (!materiaAtiva && modo !== 'descanso') {
      toast.error('Selecione uma matéria antes de começar!');
      return;
    }
    completedRef.current = false;
    const initialTime = timer <= 0 ? currentModo.minutos * 60 : timer;
    if (timer <= 0) {
      setTimer(initialTime);
    }
    if (!sessaoId) {
      const id = SessoesEstudo.create({ materia_id: materiaAtiva, tipo: modo, duracao_minutos: currentModo.minutos });
      setSessaoId(id);
    }
    targetEndTimeRef.current = Date.now() + initialTime * 1000;
    setRodando(true);
  };

  const trocarModo = (m) => {
    if (sessaoId) {
      SessoesEstudo.abandonar?.(sessaoId);
    }
    completedRef.current = false;
    targetEndTimeRef.current = null;
    setModo(m.id);
    setTimer(m.minutos * 60);
    setTotalSeconds(m.minutos * 60);
    setRodando(false);
    setSessaoId(null);
  };

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
              onClick={rodando ? () => setRodando(false) : iniciar}
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