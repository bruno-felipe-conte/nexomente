import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_FSRS_CONFIG = {
  // Retenção desejada FSRS (0.80 a 0.97)
  desiredRetention: 0.90,
  
  // Passos de aprendizado (minutos)
  learningSteps: '1, 10',
  relearningSteps: '10',
  
  // Intervalos base (dias)
  graduatingInterval: 1,
  easyInterval: 4,
  
  // Parâmetros de Facilidade (Ease)
  startingEase: 2.50,
  minimumEase: 1.30,
  intervalModifier: 1.00,
  hardIntervalMultiplier: 1.20,
  easyBonus: 1.30,
  
  // Sanguessugas (Leech)
  leechThreshold: 8,
  leechAction: 'tag', // 'tag' | 'suspend'
  
  // Limites Diários
  maxNewCardsPerDay: 20,
  maxReviewsPerDay: 100,
  
  // FSRS Engine Toggle
  fsrsEnabled: true,
  algorithm: 'fsrs', // 'fsrs' | 'anki_sm2' | 'sm2_classic'
};

export const useFSRSConfigStore = create(
  persist(
    (set) => ({
      ...DEFAULT_FSRS_CONFIG,

      updateConfig: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
        })),

      resetToDefaults: () =>
        set(() => ({
          ...DEFAULT_FSRS_CONFIG,
        })),
    }),
    {
      name: 'nexomente_fsrs_config',
    }
  )
);

export default useFSRSConfigStore;
