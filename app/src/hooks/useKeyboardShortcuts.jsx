import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleModoFoco } = useUIStore();

  const createQuickNota = useCallback(() => {
    if (location.pathname !== '/notas') navigate('/notas');
  }, [navigate, location]);

  const toggleFocusMode = useCallback(() => toggleModoFoco(), [toggleModoFoco]);

  const openCommandPalette = useCallback(() => {
    document.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  const showHelp = useCallback(() => {
    document.dispatchEvent(new CustomEvent('show-shortcuts-help'));
  }, []);

  const closeModals = useCallback(() => {
    document.dispatchEvent(new CustomEvent('close-modals'));
  }, []);

  // Mantém ref atualizada para o efeito não precisar de re-subscribe
  const shortcutsRef = useRef({});
  shortcutsRef.current = {
    'g d': () => navigate('/dashboard'),
    'g n': () => navigate('/notas'),
    'g s': () => navigate('/study'),
    'g f': () => navigate('/flashcards'),
    'g g': () => navigate('/graph'),
    'g t': () => navigate('/statistics'),
    'g ,': () => navigate('/settings'),
    'g q': () => navigate('/gerador'),
    'mod+shift+n': createQuickNota,
    'mod+shift+f': toggleFocusMode,
    'mod+k': openCommandPalette,
    'mod+/': showHelp,
    'escape': closeModals,
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const keys = [];
      if (e.metaKey || e.ctrlKey) keys.push('mod');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');
      
      const key = e.key.toLowerCase();
      if (key !== 'meta' && key !== 'control' && key !== 'shift' && key !== 'alt') {
        keys.push(key);
      }

      const combo = keys.join('+');
      const action = shortcutsRef.current[combo];

      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location]);
}

export const SHORTCUTS_LIST = [
  { keys: ['G', 'D'], action: 'Ir para Dashboard' },
  { keys: ['G', 'N'], action: 'Ir para Notas' },
  { keys: ['G', 'S'], action: 'Ir para Estudo' },
  { keys: ['G', 'F'], action: 'Ir para Flashcards' },
  { keys: ['G', 'Q'], action: 'Ir para Gerador' },
  { keys: ['G', 'G'], action: 'Ir para Grafo' },
  { keys: ['G', ','], action: 'Ir para Configurações' },
  { keys: ['⌘', '⇧', 'N'], action: 'Nova nota rápida' },
  { keys: ['⌘', '⇧', 'F'], action: 'Alternar modo foco' },
  { keys: ['⌘', 'K'], action: 'Command palette' },
  { keys: ['⌘', '/'], action: 'Mostrar atalhos' },
  { keys: ['Esc'], action: 'Fechar modais' },
];