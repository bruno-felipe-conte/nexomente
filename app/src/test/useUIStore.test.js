import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../store/useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      sidebarOpen: true,
      loadingGlobal: false,
      activeTab: 'dashboard',
      onboardingCompleted: false,
      userName: 'Visitante'
    });
  });

  it('inicia com valores padrao', () => {
    const state = useUIStore.getState();
    expect(state.activeTab).toBe('dashboard');
    expect(state.sidebarOpen).toBe(true);
    expect(state.userName).toBe('Visitante');
  });

  it('alterna sidebarOpen com toggleSidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    expect(localStorage.getItem('nexomente_sidebar_open')).toBe('false');

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('altera activeTab com setActiveTab', () => {
    useUIStore.getState().setActiveTab('notes');
    expect(useUIStore.getState().activeTab).toBe('notes');
  });

  it('atualiza nome do usuario', () => {
    useUIStore.getState().setUserName('Bruno');
    expect(useUIStore.getState().userName).toBe('Bruno');
    expect(localStorage.getItem('nexomente_user_name')).toBe('Bruno');
  });

  it('completa onboarding', () => {
    useUIStore.getState().completeOnboarding();
    expect(useUIStore.getState().onboardingCompleted).toBe(true);
    expect(localStorage.getItem('nexomente_onboarding_done')).toBe('true');
  });

  it('gerencia pendingNoteAction para acoes de notas entre telas', () => {
    useUIStore.getState().setPendingNoteAction({ action: 'create' });
    expect(useUIStore.getState().pendingNoteAction).toEqual({ action: 'create' });

    useUIStore.getState().setPendingNoteAction({ noteId: 42 });
    expect(useUIStore.getState().pendingNoteAction).toEqual({ noteId: 42 });

    useUIStore.getState().setPendingNoteAction(null);
    expect(useUIStore.getState().pendingNoteAction).toBeNull();
  });
});
