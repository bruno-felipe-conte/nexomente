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
let lastTickPerf = null;

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
    // Sanitiza se o parâmetro foi um evento React ou tipo inválido
    const materiaId = (typeof customMateriaId === 'string' || typeof customMateriaId === 'number')
      ? customMateriaId
      : state.materiaAtiva;

    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    const initialTime = (!state.timer || state.timer <= 0 || isNaN(state.timer))
      ? currentModo.minutos * 60
      : state.timer;
    const targetEnd = Date.now() + initialTime * 1000;

    let currentSessaoId = state.sessaoId;
    if (!currentSessaoId) {
      const { SessoesEstudo } = useDBStore.getState();
      currentSessaoId = SessoesEstudo?.create?.({
        materia_id: materiaId || null,
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
      materiaAtiva: materiaId || null
    });

    lastTickPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();

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
    lastTickPerf = null;
    set({
      rodando: false,
      targetEndTime: null
    });
    if (typeof document !== 'undefined') {
      document.title = 'NexoMente';
    }
  },

  concluirSessao: () => {
    get().handleComplete();
  },

  resetar: () => {
    const state = get();
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    lastTickPerf = null;
    const currentModo = MODOS_ESTUDO.find(m => m.id === state.modo) || MODOS_ESTUDO[0];
    set({
      rodando: false,
      targetEndTime: null,
      timer: currentModo.minutos * 60,
      totalSeconds: currentModo.minutos * 60,
      completed: false
    });
    if (typeof document !== 'undefined') {
      document.title = 'NexoMente';
    }
  },

  tick: () => {
    const state = get();
    if (!state.rodando || !state.targetEndTime) return;

    // [E7] Temporal Monotonicity Guard:
    // Verifica intervalo monotonicamente com performance.now() e limiar < 3000ms por tick.
    // Previne que suspensão de SO ou manipulação de relógio credite instantaneamente XP fraudulento.
    const nowPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const deltaMs = lastTickPerf ? (nowPerf - lastTickPerf) : 1000;
    lastTickPerf = nowPerf;

    if (deltaMs > 3000) {
      console.warn(`[useStudyTimerStore] Salto temporal ou suspensão detectada (delta=${Math.round(deltaMs)}ms). Pausando para segurança.`);
      get().pausar();
      return;
    }

    const elapsedSeconds = Math.max(1, Math.min(3, Math.round(deltaMs / 1000)));
    const restante = Math.max(0, state.timer - elapsedSeconds);
    const updatedTargetEnd = Date.now() + restante * 1000;

    set({ timer: restante, targetEndTime: updatedTargetEnd });

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

  trocarModo: (modoParam) => {
    const state = get();
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    const { SessoesEstudo } = useDBStore.getState();
    if (state.sessaoId && !state.completed) {
      SessoesEstudo?.abandonar?.(state.sessaoId);
    }

    // Suporta tanto string ('pomodoro', 'foco', 'descanso') quanto objeto ({ id, minutos, ... })
    const modoObj = typeof modoParam === 'string'
      ? MODOS_ESTUDO.find(m => m.id === modoParam) || MODOS_ESTUDO[0]
      : (modoParam && modoParam.id ? modoParam : MODOS_ESTUDO[0]);

    const duracaoSegundos = (modoObj.minutos || 25) * 60;

    set({
      modo: modoObj.id,
      timer: duracaoSegundos,
      totalSeconds: duracaoSegundos,
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

// Graceful cleanup: se o usuário fechar a aba/janela enquanto o cronômetro está rodando
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useStudyTimerStore.getState();
    if (state.sessaoId && !state.completed) {
      const { SessoesEstudo } = useDBStore.getState();
      SessoesEstudo?.abandonar?.(state.sessaoId);
    }
  });
}

