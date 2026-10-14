import { create } from 'zustand';
import { useDBStore } from './useDBStore';
import { useTamagotchiStore } from './useTamagotchiStore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export const MODOS_ESTUDO = [
  { id: 'pomodoro', label: 'Pomodoro', minutos: 25, color: '#2DD4BF', xp: 15 },
  { id: 'foco', label: 'Foco Profundo', minutos: 50, color: '#6C63FF', xp: 30 },
  { id: 'descanso', label: 'Pausa Curta', minutos: 5, color: '#F59E0B', xp: 5 },
];

export function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now);        // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.36);// C6
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  } catch {
    // Silencioso se áudio não suportado
  }
}

let globalTimerInterval = null;

export const useStudyTimerStore = create((set, get) => ({
  timer: 25 * 60,
  totalSeconds: 25 * 60,
  rodando: false,
  modo: 'pomodoro',
  materiaAtiva: null,
  sessaoId: null,
  targetEndTime: null,
  completed: false,
  isMiniaturized: false,

  setMateriaAtiva: (id) => set({ materiaAtiva: id }),
  setIsMiniaturized: (val) => set({ isMiniaturized: val }),

  iniciar: (customMateriaId) => {
    const state = get();
    const materiaId = customMateriaId !== undefined ? customMateriaId : state.materiaAtiva;
    if (!materiaId && state.modo !== 'descanso') {
      toast.error('Selecione uma matéria antes de começar!');
      return false;
    }

    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    const initialTime = state.timer <= 0 ? currentModo.minutos * 60 : state.timer;
    const targetEnd = Date.now() + initialTime * 1000;

    let currentSessaoId = state.sessaoId;
    if (!currentSessaoId) {
      const { SessoesEstudo } = useDBStore.getState();
      currentSessaoId = SessoesEstudo?.create?.({
        materia_id: materiaId,
        tipo: state.modo,
        duracao_minutos: currentModo.minutos
      });
    }

    set({
      rodando: true,
      timer: initialTime,
      totalSeconds: currentModo.minutos * 60,
      targetEndTime: targetEnd,
      sessaoId: currentSessaoId,
      completed: false,
      materiaAtiva: materiaId
    });

    if (globalTimerInterval) clearInterval(globalTimerInterval);
    globalTimerInterval = setInterval(() => {
      get().tick();
    }, 1000);

    return true;
  },

  pausar: () => {
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    set({
      rodando: false,
      targetEndTime: null
    });
    if (typeof document !== 'undefined') {
      document.title = 'NexoMente';
    }
  },

  tick: () => {
    const state = get();
    if (!state.rodando || !state.targetEndTime) return;
    const restante = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
    set({ timer: restante });

    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    if (typeof document !== 'undefined') {
      const min = Math.floor(restante / 60);
      const sec = restante % 60;
      const formatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      document.title = `(${formatted}) ${currentModo.label} · NexoMente`;
    }

    if (restante <= 0) {
      state.handleComplete();
    }
  },

  handleComplete: () => {
    const state = get();
    if (state.completed) return;

    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }

    set({ completed: true, rodando: false, targetEndTime: null });

    if (typeof document !== 'undefined') {
      document.title = '🔔 Sessão Concluída! · NexoMente';
    }
    playCompletionChime();

    const activeId = state.sessaoId;
    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    const { SessoesEstudo, XP } = useDBStore.getState();

    if (activeId && SessoesEstudo) {
      SessoesEstudo.completar?.(activeId);
      const xpGanho = currentModo.xp || 15;
      XP?.add?.(xpGanho, 'Sessão concluída', 'sessao', activeId);
      useTamagotchiStore.getState().registerStudySession?.(currentModo.minutos);
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // sem canvas em alguns ambientes de teste
      }
      toast.success(`Sessão finalizada! +${xpGanho} XP`);
    }

    set({ sessaoId: null });
  },

  trocarModo: (modoObj) => {
    const state = get();
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    const { SessoesEstudo } = useDBStore.getState();
    if (state.sessaoId && !state.completed) {
      SessoesEstudo?.abandonar?.(state.sessaoId);
    }
    set({
      modo: modoObj.id,
      timer: modoObj.minutos * 60,
      totalSeconds: modoObj.minutos * 60,
      rodando: false,
      targetEndTime: null,
      sessaoId: null,
      completed: false
    });
    if (typeof document !== 'undefined') {
      document.title = 'NexoMente';
    }
  },

  abandonarSessao: () => {
    const state = get();
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    const { SessoesEstudo } = useDBStore.getState();
    if (state.sessaoId && !state.completed) {
      SessoesEstudo?.abandonar?.(state.sessaoId);
    }
    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    set({
      sessaoId: null,
      rodando: false,
      targetEndTime: null,
      timer: currentModo.minutos * 60,
      totalSeconds: currentModo.minutos * 60,
      completed: false,
      isMiniaturized: false
    });
    if (typeof document !== 'undefined') {
      document.title = 'NexoMente';
    }
    toast('Sessão cancelada.', { icon: '⏹️' });
  }
}));
