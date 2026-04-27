import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TAMAGOTCHI_LEVELS = [
  { level: 1, xp: 0, form: '🥚', name: 'Ovinho', hp_max: 60, title: 'Ovo Adormecido' },
  { level: 2, xp: 30, form: '🐣', name: 'Pecas', hp_max: 70, title: 'Primeiro Bico' },
  { level: 3, xp: 80, form: '🐥', name: 'Pipoca', hp_max: 75, title: 'Pintinho Curioso' },
  { level: 4, xp: 180, form: '🐤', name: 'Piuli', hp_max: 80, title: 'Pintinho Animado' },
  { level: 5, xp: 350, form: '🦆', name: 'Quack', hp_max: 85, title: 'Pato Filhote' },
  { level: 6, xp: 600, form: '🐰', name: 'Pulguinha', hp_max: 88, title: 'Coelho Levado' },
  { level: 7, xp: 900, form: '🐱', name: 'Miau', hp_max: 90, title: 'Gatinho Pensativo' },
  { level: 8, xp: 1300, form: '😺', name: 'Cheshire', hp_max: 92, title: 'Gato Radiante' },
  { level: 9, xp: 1800, form: '🐶', name: 'Biscuit', hp_max: 93, title: 'Cãozinho Dedicado' },
  { level: 10, xp: 2500, form: '🦊', name: 'Vixel', hp_max: 95, title: 'Raposa Espertalhona' },
  { level: 11, xp: 3400, form: '🦝', name: 'Bandit', hp_max: 96, title: 'Guaxinim Noturno' },
  { level: 12, xp: 4400, form: '🐺', name: 'Lupus', hp_max: 97, title: 'Lobo Solitário' },
  { level: 13, xp: 5600, form: '🐻', name: 'Boreal', hp_max: 98, title: 'Urso Paciente' },
  { level: 14, xp: 7000, form: '🐼', name: 'Zen', hp_max: 100, title: 'Panda Equilibrado' },
  { level: 15, xp: 8700, form: '🦁', name: 'Mufasa', hp_max: 100, title: 'Leão Corajoso' },
  { level: 16, xp: 10700, form: '🐯', name: 'Raijin', hp_max: 100, title: 'Tigre Veloz' },
  { level: 17, xp: 13200, form: '🦋', name: 'Lumina', hp_max: 100, title: 'Borboleta Transformada' },
  { level: 18, xp: 16200, form: '🦅', name: 'Aquila', hp_max: 100, title: 'Águia Soberana' },
  { level: 19, xp: 19700, form: '🦄', name: 'Spectra', hp_max: 100, title: 'Unicórnio Lendário' },
  { level: 20, xp: 23700, form: '🐉', name: 'Ignis', hp_max: 110, title: 'Dragão Jovem' },
  { level: 21, xp: 28300, form: '🐍', name: 'Tethys', hp_max: 110, title: 'Serpente Aquática' },
  { level: 22, xp: 33500, form: '🦎', name: 'Pyros', hp_max: 110, title: 'Salamandra Flamejante' },
  { level: 23, xp: 39400, form: '🦌', name: 'Volta', hp_max: 110, title: 'Kirin Elétrico' },
  { level: 24, xp: 46000, form: '🦅', name: 'Selene', hp_max: 115, title: 'Fênix Lunar' },
  { level: 25, xp: 53500, form: '🐲', name: 'Chroma', hp_max: 115, title: 'Dragão Arco-Íris' },
  { level: 26, xp: 62000, form: '🌌', name: 'Cosmos', hp_max: 120, title: 'Ser Cósmico' },
  { level: 27, xp: 72000, form: '☀️', name: 'Helios', hp_max: 125, title: 'Sol Consciente' },
  { level: 28, xp: 84000, form: '⏳', name: 'Chronos', hp_max: 125, title: 'Vórtice do Tempo' },
  { level: 29, xp: 98000, form: '💫', name: 'Axiom', hp_max: 130, title: 'Entidade Dimensional' },
  { level: 30, xp: 115000, form: '✴️', name: 'Jogador', hp_max: 150, title: 'A Forma Final' }
];

function getLevelData(xp) {
  let current = TAMAGOTCHI_LEVELS[0];
  for (let i = 0; i < TAMAGOTCHI_LEVELS.length; i++) {
    if (xp >= TAMAGOTCHI_LEVELS[i].xp) {
      current = TAMAGOTCHI_LEVELS[i];
    } else {
      break;
    }
  }
  return current;
}

function getStreakMultiplier(streak) {
  if (streak >= 30) return 3;
  if (streak >= 14) return 2.5;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

function getBaseXp(minutes) {
  if (minutes < 15) return 5;
  if (minutes < 30) return 15;
  if (minutes < 60) return 30;
  if (minutes < 120) return 50;
  if (minutes < 240) return 80;
  return 120;
}

function calculateDaysDifference(dateString1, dateString2) {
  const d1 = new Date(dateString1).setHours(0, 0, 0, 0);
  const d2 = new Date(dateString2).setHours(0, 0, 0, 0);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export const useTamagotchiStore = create(
  persist(
    (set, get) => ({
      player: {
        xp: 0,
        hp: 60,
        hp_max: 60,
        level: 1,
        streak: 0,
        streak_max: 0,
        last_study_date: null,
        total_study_days: 0,
        total_sessions: 0,
        hibernations: 0,
        hibernating: false,
        pet_name: null,
        created_at: new Date().toISOString()
      },
      animationsQueue: [],

      // Executado ao abrir o app
      checkDailyStatus: () => {
        const { player } = get();
        if (!player.last_study_date) return;

        const todayStr = new Date().toISOString();
        const diff = calculateDaysDifference(player.last_study_date, todayStr);

        if (diff > 0) {
          // O usuário não estudou hoje, ou não estudou ontem...
          let hpLoss = 0;
          if (diff === 1) {
             // Ainda dá tempo de estudar hoje, mas tecnicamente a diária não fechou
          } else if (diff === 2) {
            hpLoss = 10; // 1 dia sem estudar
          } else if (diff === 3) {
            hpLoss = 30; // 2 dias (10 + 20 acumulativo)
          } else if (diff === 4) {
            hpLoss = 65; // 3 dias (10 + 20 + 35)
          } else if (diff > 4) {
            hpLoss = 65 + ((diff - 4) * 15);
          }

          if (hpLoss > 0 && !player.hibernating) {
            // Verifica passivas do Panda (descanso semanal não machuca 1 dia) etc.
            let finalHpLoss = hpLoss;
            if (player.level >= 14 && diff === 2) finalHpLoss = 0; // Panda (um dia off)
            if (player.level >= 7 && finalHpLoss > 0) finalHpLoss -= 2; // Gato passiva

            let newHp = player.hp - finalHpLoss;
            let hibernating = player.hibernating;
            let hibernations = player.hibernations;
            let streak = player.streak;

            if (newHp <= 0) {
              if (player.level >= 12 && player.hp > 0 && finalHpLoss > 0 && !player.hibernating) {
                // Lobo: resiste por mais 1 dia sem cair (Fica com 1 HP)
                newHp = 1;
              } else {
                newHp = 0;
                hibernating = true;
                hibernations += 1;
              }
            }

            // A partir da Borboleta (Nv 17), HP não cai abaixo de 10
            if (player.level >= 17 && newHp < 10) {
               newHp = 10;
               hibernating = false;
            }

            if (diff >= 2) streak = 0; // Perdeu o streak

            set({
              player: {
                ...player,
                hp: newHp,
                hibernating,
                hibernations,
                streak
              }
            });
          }
        }
      },

      registerStudySession: (duration_minutes) => {
        const { player } = get();
        const todayStr = new Date().toISOString();
        const diff = player.last_study_date ? calculateDaysDifference(player.last_study_date, todayStr) : 1;
        
        let newStreak = player.streak;
        let isFirstOfDay = false;

        // Lógica de Streak
        if (!player.last_study_date || diff > 0) {
          isFirstOfDay = true;
          if (diff === 1 || !player.last_study_date) {
            newStreak += 1;
          } else {
            // Se diff > 1 e nível >= 29 (Entidade), streak não cai abaixo de x2 (14 dias eq.)
            if (player.level >= 29 && newStreak > 14) newStreak = 14; 
            else newStreak = 1;
          }
        }

        const streakMultiplier = getStreakMultiplier(newStreak);
        let xpGained = getBaseXp(duration_minutes) * streakMultiplier;

        // Bônus Especiais
        if (isFirstOfDay) xpGained += 5;
        if (isFirstOfDay && newStreak === 7) xpGained += 50;
        if (isFirstOfDay && newStreak === 30) xpGained += 200;
        if (isFirstOfDay && newStreak === 100) xpGained += 500;
        if (duration_minutes >= 240) xpGained += 80;

        // Bônus Passivos
        if (player.level >= 3) xpGained += 2; // Pintinho
        if (player.level >= 5 && newStreak >= 3) xpGained += 5; // Pato
        if (player.level >= 10 && duration_minutes >= 120) xpGained += Math.floor(xpGained * 0.1); // Raposa
        if (player.level >= 16 && duration_minutes >= 30 && duration_minutes < 60) xpGained += 5; // Tigre
        if (player.level >= 18) xpGained += Math.floor(xpGained * 0.05); // Águia
        if (player.level >= 22 && duration_minutes >= 240) xpGained += Math.floor(xpGained * 0.2); // Salamandra
        if (player.level >= 25) xpGained += Math.floor(xpGained * 0.1); // Dragão Arco-Íris

        // Atualiza HP
        let hpGained = 15;
        if (duration_minutes >= 120) hpGained += 10; // +25 total
        if (newStreak >= 7) hpGained += 10; // +10 bonus
        if (player.level >= 6) hpGained += 2; // Coelho

        let newHp = player.hp + hpGained;
        let isReviving = false;
        
        if (player.hibernating) {
           isReviving = true;
           // Fênix (Nível 24) revive com 40 HP
           newHp = player.level >= 24 ? 40 : 20;
        }
        
        // Aplica passiva de Max HP
        let currentHpMax = getLevelData(player.xp + xpGained).hp_max;
        if (player.level >= 8 && newStreak >= 5 && currentHpMax < 100) currentHpMax = 100; // Gato Radiante
        if (player.level >= 13) currentHpMax = Math.max(currentHpMax, 100);
        if (player.level >= 20) currentHpMax = Math.max(currentHpMax, 110);
        if (player.level >= 25) currentHpMax = Math.max(currentHpMax, 120);

        if (newHp > currentHpMax) newHp = currentHpMax;

        const newXp = player.xp + Math.floor(xpGained);
        const oldLevel = player.level;
        const newLevelData = getLevelData(newXp);

        // Dispara animação se subiu de nível
        if (newLevelData.level > oldLevel) {
          get().queueAnimation(newLevelData.level);
        }

        set({
          player: {
            ...player,
            xp: newXp,
            level: newLevelData.level,
            hp: newHp,
            hp_max: currentHpMax,
            streak: newStreak,
            streak_max: Math.max(player.streak_max, newStreak),
            last_study_date: todayStr,
            total_study_days: isFirstOfDay ? player.total_study_days + 1 : player.total_study_days,
            total_sessions: player.total_sessions + 1,
            hibernating: false
          }
        });
      },

      queueAnimation: (level) => {
        set((state) => ({
          animationsQueue: [...state.animationsQueue, level]
        }));
      },

      clearAnimation: () => {
        set((state) => ({
          animationsQueue: state.animationsQueue.slice(1)
        }));
      },

      setPetName: (name) => {
        set((state) => ({ player: { ...state.player, pet_name: name } }));
      }
    }),
    {
      name: 'nexomente-tamagotchi-storage',
    }
  )
);

export { TAMAGOTCHI_LEVELS, getLevelData };
