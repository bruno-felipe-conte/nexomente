import { create } from 'zustand';

export const useUIStore = create((set) => ({
  db: null,
  loading: false,
  sidebarOpen: true,
  onboardingCompleted: false,
  init: () => set({ loading: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  Notas: {
    getAll: () => [],
    getById: (id) => null,
    create: (n) => n,
    update: (id, u) => u,
    delete: (id) => id,
  },
  Pastas: {
    getAll: () => [],
    create: (p) => p,
  },
  Minas: {
    getAll: () => [],
    create: (m) => m,
  },
  Sessoes: {
    getAll: () => [],
    create: (s) => s,
    completar: (id) => id,
  },
  Flashcards: {
    getAll: () => [],
    getParaRevisao: () => [],
    create: (c) => c,
    revisar: (id, q) => ({ id, q }),
  },
  XP: {
    getTotal: () => 0,
    add: (xp) => xp,
  },
}));