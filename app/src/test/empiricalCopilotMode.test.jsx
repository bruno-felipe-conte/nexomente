// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AICopilotDrawer from '../components/ai/AICopilotDrawer';
import * as aiProvider from '../lib/ai/aiProvider';
import { SOCRATIC_SYSTEM_PROMPT } from '../lib/ai/socraticPrompts';

// Mock dependencies of AICopilotDrawer
vi.mock('../../hooks/useNotes', () => ({
  useNotes: () => ({
    notas: [
      { id: 'nota-1', titulo: 'Bioquímica Básica', conteudo: 'Glicólise e ciclo de Krebs' },
    ],
  }),
}));

vi.mock('../../store/useUIStore', () => ({
  useUIStore: () => ({
    activeTab: 'notes',
    pendingNoteAction: { noteId: 'nota-1' },
  }),
}));

vi.mock('../../hooks/useVosk', () => ({
  useVosk: ({ onResult, onPartialResult, onError }) => ({
    isListening: false,
    audioLevel: 0,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    terminateAudio: vi.fn(),
  }),
}));

vi.mock('../../lib/audio/neuralTTS', () => ({
  neuralTTS: {
    subscribe: vi.fn(() => () => {}),
    speak: vi.fn(),
    stop: vi.fn(),
  },
  NEURAL_VOICES: [
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca Neural', gender: 'Feminino', recommended: true },
    { id: 'pt-BR-AntonioNeural', name: 'Antonio Neural', gender: 'Masculino' },
    { id: 'pt-BR-ThalitaMultilingualNeural', name: 'Thalita Neural', gender: 'Feminino' },
  ],
}));

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.error = vi.fn();
  toastFn.success = vi.fn();
  return { default: toastFn };
});

describe('Empirical Challenger: AICopilotDrawer Mode Switching & Audio Integrity', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onExpandFullScreen: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Mode Switch & LocalStorage Persistence
  // =========================================================================
  describe('1. Mode Switch and Persistence (assistant <-> socratic)', () => {
    it('defaults to assistant mode when localStorage is empty', () => {
      render(<AICopilotDrawer {...defaultProps} />);

      expect(localStorage.getItem('nexomente_copilot_mode')).toBeNull();
      // Should show assistant header text
      expect(screen.getByText('Copiloto Neural')).toBeDefined();
      expect(screen.getByText('Gemma 4')).toBeDefined();
      expect(screen.getByText(/RAG Local • Conversação por Voz/i)).toBeDefined();

      // Initial message is assistant welcome
      expect(screen.getByText(/Sou seu Copiloto Neural local/i)).toBeDefined();
    });

    it('switches to socratic mode and persists to localStorage', async () => {
      render(<AICopilotDrawer {...defaultProps} />);

      const socraticBtn = screen.getByRole('button', { name: /🎓 Tutor Socrático/i });
      fireEvent.click(socraticBtn);

      expect(localStorage.getItem('nexomente_copilot_mode')).toBe('socratic');
      expect(screen.getByText('Tutor Socrático')).toBeDefined();
      expect(screen.getByText('LearnHarness')).toBeDefined();
      expect(screen.getByText(/Dedução Passo a Passo • FSRS/i)).toBeDefined();

      // Input placeholder should be Socratic
      const input = screen.getByPlaceholderText(/Responda à checagem socrática ou proponha um tema/i);
      expect(input).toBeDefined();
    });

    it('switches back from socratic to assistant mode and updates localStorage', async () => {
      localStorage.setItem('nexomente_copilot_mode', 'socratic');
      render(<AICopilotDrawer {...defaultProps} />);

      // Starts in socratic mode
      expect(screen.getByText('Tutor Socrático')).toBeDefined();

      // Click assistant button
      const assistantBtn = screen.getByRole('button', { name: /Assistente/i });
      fireEvent.click(assistantBtn);

      expect(localStorage.getItem('nexomente_copilot_mode')).toBe('assistant');
      expect(screen.getByText('Copiloto Neural')).toBeDefined();
      expect(screen.getByText('Gemma 4')).toBeDefined();
    });

    it('initializes directly in socratic mode with Socratic welcome when stored', () => {
      localStorage.setItem('nexomente_copilot_mode', 'socratic');
      render(<AICopilotDrawer {...defaultProps} />);

      expect(screen.getByText(/Sou seu Tutor Socrático/i)).toBeDefined();
      expect(screen.getByText('LearnHarness')).toBeDefined();
    });

    it('handles unexpected or corrupted localStorage value gracefully', () => {
      localStorage.setItem('nexomente_copilot_mode', 'invalid_mode_xyz');
      render(<AICopilotDrawer {...defaultProps} />);

      // Falls back to assistant behavior
      expect(screen.getByText('Copiloto Neural')).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Audio/TTS Settings and Controls Integrity
  // =========================================================================
  describe('2. Audio and TTS Controls Integrity across Mode Transitions', () => {
    it('preserves existing audio preferences when switching modes', () => {
      localStorage.setItem('nexomente_copilot_tts', 'true');
      localStorage.setItem('nexomente_copilot_voice', 'pt-BR-AntonioNeural');
      localStorage.setItem('nexomente_copilot_voice_speed', '1.2');
      localStorage.setItem('nexomente_copilot_voice_autosend', 'true');

      render(<AICopilotDrawer {...defaultProps} />);

      // Switch to Socratic mode
      const socraticBtn = screen.getByRole('button', { name: /🎓 Tutor Socrático/i });
      fireEvent.click(socraticBtn);

      // Verify none of the audio localStorage keys were altered or deleted
      expect(localStorage.getItem('nexomente_copilot_tts')).toBe('true');
      expect(localStorage.getItem('nexomente_copilot_voice')).toBe('pt-BR-AntonioNeural');
      expect(localStorage.getItem('nexomente_copilot_voice_speed')).toBe('1.2');
      expect(localStorage.getItem('nexomente_copilot_voice_autosend')).toBe('true');

      // Switch back to Assistant mode
      const assistantBtn = screen.getByRole('button', { name: /Assistente/i });
      fireEvent.click(assistantBtn);

      expect(localStorage.getItem('nexomente_copilot_tts')).toBe('true');
      expect(localStorage.getItem('nexomente_copilot_voice')).toBe('pt-BR-AntonioNeural');
      expect(localStorage.getItem('nexomente_copilot_voice_speed')).toBe('1.2');
      expect(localStorage.getItem('nexomente_copilot_voice_autosend')).toBe('true');
    });

    it('renders and operates the TTS mute toggle button', () => {
      render(<AICopilotDrawer {...defaultProps} />);

      const ttsBtn = screen.getByTitle(/Silenciar leitura em voz alta|Ativar leitura em voz alta/i);
      expect(ttsBtn).toBeDefined();

      // Click to toggle TTS off
      fireEvent.click(ttsBtn);
      expect(localStorage.getItem('nexomente_copilot_tts')).toBe('false');

      // Click to toggle TTS back on
      fireEvent.click(ttsBtn);
      expect(localStorage.getItem('nexomente_copilot_tts')).toBe('true');
    });

    it('renders and toggles the auto-send voice button', () => {
      render(<AICopilotDrawer {...defaultProps} />);

      const autoSendBtn = screen.getByText('⚡AUTO');
      expect(autoSendBtn).toBeDefined();

      fireEvent.click(autoSendBtn);
      expect(localStorage.getItem('nexomente_copilot_voice_autosend')).toBe('true');

      fireEvent.click(autoSendBtn);
      expect(localStorage.getItem('nexomente_copilot_voice_autosend')).toBe('false');
    });

    it('opens neural voice settings and allows selecting voice and speed', () => {
      render(<AICopilotDrawer {...defaultProps} />);

      const slidersBtn = screen.getByTitle('Configurar Voz Neural e Velocidade');
      fireEvent.click(slidersBtn);

      // Check panel opened
      expect(screen.getByText('Voz do Copiloto Neural')).toBeDefined();

      // Select Antonio voice
      const antonioBtn = screen.getByText('Antonio');
      fireEvent.click(antonioBtn);
      expect(localStorage.getItem('nexomente_copilot_voice')).toBe('pt-BR-AntonioNeural');

      // Select speed 1.35x
      const speedBtn = screen.getByText('1.35x');
      fireEvent.click(speedBtn);
      expect(localStorage.getItem('nexomente_copilot_voice_speed')).toBe('1.35');
    });
  });

  // =========================================================================
  // 3. Prompt Injection & Socratic Execution Invariants
  // =========================================================================
  describe('3. Socratic Prompt Injection & Chat Execution', () => {
    it('dispatches chat with SOCRATIC_SYSTEM_PROMPT when in socratic mode', async () => {
      const chatSpy = vi.spyOn(aiProvider, 'chat').mockResolvedValue({
        success: true,
        response: 'Muito bem! Qual é a consequência disso?',
        durationMs: 120,
      });

      render(<AICopilotDrawer {...defaultProps} />);

      // Switch to Socratic mode
      fireEvent.click(screen.getByRole('button', { name: /🎓 Tutor Socrático/i }));

      // Type and submit a message
      const input = screen.getByPlaceholderText(/Responda à checagem socrática ou proponha um tema/i);
      fireEvent.change(input, { target: { value: 'A mitocôndria produz ATP.' } });

      const form = input.closest('form');
      await act(async () => {
        fireEvent.submit(form);
      });

      // Verify aiProvider.chat was called with Socratic prompt
      expect(chatSpy).toHaveBeenCalledTimes(1);
      const passedMessages = chatSpy.mock.calls[0][0];
      const systemMessage = passedMessages.find((m) => m.role === 'system');

      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain(SOCRATIC_SYSTEM_PROMPT);
      expect(systemMessage.content).toContain('[Contexto do Vault e Notas]');
    });

    it('dispatches askAI when in assistant mode', async () => {
      const askSpy = vi.spyOn(aiProvider, 'askAI').mockResolvedValue({
        text: 'Resposta direta do assistente geral.',
        durationMs: 95,
      });

      render(<AICopilotDrawer {...defaultProps} />);

      // Type and submit in Assistant mode
      const input = screen.getByPlaceholderText(/Pergunte ao Copiloto/i);
      fireEvent.change(input, { target: { value: 'O que é glicólise?' } });

      const form = input.closest('form');
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(askSpy).toHaveBeenCalledTimes(1);
      expect(askSpy.mock.calls[0][0]).toBe('O que é glicólise?');
    });

    it('handles AI inference failure gracefully in Socratic mode without crashing', async () => {
      vi.spyOn(aiProvider, 'chat').mockRejectedValue(new Error('Inferência falhou'));

      render(<AICopilotDrawer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /🎓 Tutor Socrático/i }));

      const input = screen.getByPlaceholderText(/Responda à checagem socrática ou proponha um tema/i);
      fireEvent.change(input, { target: { value: 'Pergunta teste com erro' } });

      const form = input.closest('form');
      await act(async () => {
        fireEvent.submit(form);
      });

      // Drawer should still be rendered and show the fallback message
      expect(screen.getByText(/O motor neural local está aquecendo/i)).toBeDefined();
    });
  });
});
