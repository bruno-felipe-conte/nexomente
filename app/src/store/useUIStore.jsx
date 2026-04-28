import { create } from 'zustand';

/**
 * useUIStore — Gerenciamento de Estado da Interface.
 * Focado apenas em estados de UI (Navegação, Sidebar, Modais).
 * Dados reais residem no useDBStore.
 */
export const useUIStore = create((set) => ({
  // Layout
  sidebarOpen: localStorage.getItem('nexomente_sidebar_open') !== 'false',
  loadingGlobal: false,
  
  // Navegação
  activeTab: 'dashboard', // dashboard, notes, cards, study, chat, stats, settings
  
  // Onboarding
  onboardingCompleted: localStorage.getItem('nexomente_onboarding_done') === 'true',

  // Identidade do Usuário
  userName: localStorage.getItem('nexomente_user_name') || 'Visitante',

  // Actions
  setLoading: (loading) => set({ loadingGlobal: loading }),
  
  setUserName: (name) => {
    localStorage.setItem('nexomente_user_name', name);
    set({ userName: name });
  },
  
  toggleSidebar: () => set((state) => {
    const newState = !state.sidebarOpen;
    localStorage.setItem('nexomente_sidebar_open', String(newState));
    return { sidebarOpen: newState };
  }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  completeOnboarding: () => {
    localStorage.setItem('nexomente_onboarding_done', 'true');
    set({ onboardingCompleted: true });
  }
}));