import { create } from 'zustand';

/**
 * useUIStore — Gerenciamento de Estado da Interface.
 * Focado apenas em estados de UI (Navegação, Sidebar, Tema Vanilla-Reader, Modais).
 * Dados reais residem no useDBStore.
 */
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const initialUrlTab = urlParams?.get('tab');

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'vanilla';
  const saved = localStorage.getItem('nexomente_theme');
  const resolved = saved === 'roasted' ? 'roasted' : 'vanilla';
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
};

export const useUIStore = create((set) => ({
  // Layout & Tema ("vanilla" = Papel & Café | "roasted" = Café Torrado / Luz de Velas)
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth < 1024
    ? false
    : localStorage.getItem('nexomente_sidebar_open') !== 'false',
  sidebarPinned: typeof window !== 'undefined'
    ? localStorage.getItem('nexomente_sidebar_pinned') === 'true'
    : false,
  loadingGlobal: false,
  theme: getInitialTheme(),

  // Navegação
  activeTab: initialUrlTab || 'dashboard',

  // Onboarding
  onboardingCompleted: Boolean(initialUrlTab) || localStorage.getItem('nexomente_onboarding_done') === 'true',

  // Identidade do Usuário
  userName: localStorage.getItem('nexomente_user_name') || 'Visitante',

  // Ações pendentes de navegação cruzada
  pendingNoteAction: null,
  pendingNoteCategory: null,
  pendingChatNoteId: null,

  // Actions
  setPendingNoteAction: (action) => set({ pendingNoteAction: action }),
  setPendingNoteCategory: (cat) => set({ pendingNoteCategory: cat }),
  setPendingChatNoteId: (noteId) => set({ pendingChatNoteId: noteId }),
  setLoading: (loading) => set({ loadingGlobal: loading }),

  setTheme: (newTheme) => {
    const valid = newTheme === 'roasted' ? 'roasted' : 'vanilla';
    localStorage.setItem('nexomente_theme', valid);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', valid);
    }
    set({ theme: valid });
  },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'vanilla' ? 'roasted' : 'vanilla';
      localStorage.setItem('nexomente_theme', next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
      }
      return { theme: next };
    }),

  setUserName: (name) => {
    localStorage.setItem('nexomente_user_name', name);
    set({ userName: name });
  },

  toggleSidebar: () =>
    set((state) => {
      const newState = !state.sidebarOpen;
      localStorage.setItem('nexomente_sidebar_open', String(newState));
      return { sidebarOpen: newState };
    }),

  setSidebarPinned: (pinned) => {
    localStorage.setItem('nexomente_sidebar_pinned', String(pinned));
    set({ sidebarPinned: Boolean(pinned) });
  },

  toggleSidebarPinned: () =>
    set((state) => {
      const next = !state.sidebarPinned;
      localStorage.setItem('nexomente_sidebar_pinned', String(next));
      return { sidebarPinned: next };
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  completeOnboarding: () => {
    localStorage.setItem('nexomente_onboarding_done', 'true');
    set({ onboardingCompleted: true });
  },
}));
