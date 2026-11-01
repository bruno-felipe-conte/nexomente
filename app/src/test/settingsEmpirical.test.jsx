// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Settings from '../pages/Settings';
import { httpProvider } from '../lib/ai/httpProvider';
import * as aiProvider from '../lib/ai/aiProvider';

describe('Settings.jsx Empirical UI & Persistence Challenge Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Default State & Initialization from LocalStorage', () => {
    it('initializes with default values when localStorage is empty', () => {
      render(<Settings />);

      // Active provider should default to 'embedded'
      expect(aiProvider.getActiveProvider()).toBe('embedded');

      // HTTP URL input defaults to 'http://localhost:1234/v1'
      const urlInput = screen.getByPlaceholderText('http://localhost:1234/v1');
      expect(urlInput.value).toBe('http://localhost:1234/v1');

      // API Key input defaults to empty
      const keyInput = screen.getByPlaceholderText(/sk-or-v1-\.\.\./i);
      expect(keyInput.value).toBe('');
      expect(keyInput.getAttribute('type')).toBe('password');

      // Model input defaults to empty
      const modelInput = screen.getByPlaceholderText(/ex: anthropic\/claude-3\.5-sonnet/i);
      expect(modelInput.value).toBe('');
    });

    it('initializes with pre-configured values from localStorage', () => {
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_url', 'https://openrouter.ai/api/v1');
      localStorage.setItem('nexomente_ai_http_api_key', 'sk-or-stored-key-999');
      localStorage.setItem('nexomente_ai_http_model', 'meta-llama/llama-3.3-70b-instruct');

      render(<Settings />);

      const urlInput = screen.getByPlaceholderText('http://localhost:1234/v1');
      expect(urlInput.value).toBe('https://openrouter.ai/api/v1');

      const keyInput = screen.getByPlaceholderText(/sk-or-v1-\.\.\./i);
      expect(keyInput.value).toBe('sk-or-stored-key-999');

      const modelInput = screen.getByPlaceholderText(/ex: anthropic\/claude-3\.5-sonnet/i);
      expect(modelInput.value).toBe('meta-llama/llama-3.3-70b-instruct');
    });
  });

  describe('2. Provider Switch & LocalStorage Persistence', () => {
    it('switches active provider between embedded and http and updates localStorage', async () => {
      render(<Settings />);

      const httpBtn = screen.getByRole('button', { name: /Provedor Externo & Nuvem/i });
      const embeddedBtn = screen.getByRole('button', { name: /Motor Local Embutido/i });

      // Click HTTP provider
      await act(async () => {
        fireEvent.click(httpBtn);
      });

      expect(localStorage.getItem('nexomente_ai_provider')).toBe('http');
      expect(aiProvider.getActiveProvider()).toBe('http');

      // Click back to Embedded provider
      await act(async () => {
        fireEvent.click(embeddedBtn);
      });

      expect(localStorage.getItem('nexomente_ai_provider')).toBe('embedded');
      expect(aiProvider.getActiveProvider()).toBe('embedded');
    });
  });

  describe('3. Password Masking Toggle for API Key', () => {
    it('toggles API key input between password and text type', async () => {
      render(<Settings />);

      const keyInput = screen.getByPlaceholderText(/sk-or-v1-\.\.\./i);
      expect(keyInput.getAttribute('type')).toBe('password');

      // Toggle button initial state
      const toggleBtn = screen.getByTitle('Exibir chave de API');
      expect(toggleBtn).toBeDefined();

      // Click to reveal key
      await act(async () => {
        fireEvent.click(toggleBtn);
      });

      expect(keyInput.getAttribute('type')).toBe('text');
      expect(screen.getByTitle('Ocultar chave de API')).toBeDefined();

      // Click again to hide key
      const hideBtn = screen.getByTitle('Ocultar chave de API');
      await act(async () => {
        fireEvent.click(hideBtn);
      });

      expect(keyInput.getAttribute('type')).toBe('password');
      expect(screen.getByTitle('Exibir chave de API')).toBeDefined();
    });
  });

  describe('4. Saving HTTP Configuration & Edge Cases', () => {
    it('persists clean values to localStorage when clicking Salvar Configurações', async () => {
      render(<Settings />);

      const urlInput = screen.getByPlaceholderText('http://localhost:1234/v1');
      const keyInput = screen.getByPlaceholderText(/sk-or-v1-\.\.\./i);
      const modelInput = screen.getByPlaceholderText(/ex: anthropic\/claude-3\.5-sonnet/i);
      const saveBtn = screen.getByRole('button', { name: /Salvar Configurações/i });

      // Update fields
      fireEvent.change(urlInput, { target: { value: 'https://api.groq.com/openai/v1' } });
      fireEvent.change(keyInput, { target: { value: 'gsk-123456789abcdef' } });
      fireEvent.change(modelInput, { target: { value: 'llama3-70b-8192' } });

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(localStorage.getItem('nexomente_ai_http_url')).toBe('https://api.groq.com/openai/v1');
      expect(localStorage.getItem('nexomente_ai_http_api_key')).toBe('gsk-123456789abcdef');
      expect(localStorage.getItem('nexomente_ai_http_model')).toBe('llama3-70b-8192');
    });

    it('trims leading/trailing whitespace and falls back to default URL when empty', async () => {
      render(<Settings />);

      const urlInput = screen.getByPlaceholderText('http://localhost:1234/v1');
      const keyInput = screen.getByPlaceholderText(/sk-or-v1-\.\.\./i);
      const modelInput = screen.getByPlaceholderText(/ex: anthropic\/claude-3\.5-sonnet/i);
      const saveBtn = screen.getByRole('button', { name: /Salvar Configurações/i });

      // URL with only whitespace -> should fallback to default
      fireEvent.change(urlInput, { target: { value: '   ' } });
      // Key with spaces -> trimmed
      fireEvent.change(keyInput, { target: { value: '  sk-padded-key  ' } });
      // Model with spaces -> trimmed
      fireEvent.change(modelInput, { target: { value: '  gpt-4o-mini  ' } });

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(localStorage.getItem('nexomente_ai_http_url')).toBe('http://localhost:1234/v1');
      expect(localStorage.getItem('nexomente_ai_http_api_key')).toBe('sk-padded-key');
      expect(localStorage.getItem('nexomente_ai_http_model')).toBe('gpt-4o-mini');
    });
  });

  describe('5. Connection Testing & Status Badges', () => {
    it('persists values and displays online badge when checkStatus succeeds', async () => {
      const checkStatusSpy = vi.spyOn(httpProvider, 'checkStatus').mockResolvedValue({
        status: 'online',
        available: true,
        models: ['llama-3.3-70b', 'qwen-2.5-32b'],
        provider: 'http',
      });

      render(<Settings />);

      const urlInput = screen.getByPlaceholderText('http://localhost:1234/v1');
      fireEvent.change(urlInput, { target: { value: 'http://127.0.0.1:11434/v1' } });

      const testBtn = screen.getByRole('button', { name: /Testar Conexão/i });

      await act(async () => {
        fireEvent.click(testBtn);
      });

      expect(checkStatusSpy).toHaveBeenCalled();
      // Should also persist the URL on test
      expect(localStorage.getItem('nexomente_ai_http_url')).toBe('http://127.0.0.1:11434/v1');

      // Status badge should render
      await waitFor(() => {
        expect(screen.getByText(/Online \(2 modelos\)/i)).toBeDefined();
      });
    });

    it('displays offline badge when checkStatus returns offline or error', async () => {
      vi.spyOn(httpProvider, 'checkStatus').mockResolvedValue({
        status: 'offline',
        available: false,
        error: 'HTTP 401 Unauthorized',
        provider: 'http',
      });

      render(<Settings />);

      const testBtn = screen.getByRole('button', { name: /Testar Conexão/i });

      await act(async () => {
        fireEvent.click(testBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/HTTP 401 Unauthorized/i)).toBeDefined();
      });
    });

    it('catches checkStatus network throw and displays offline error badge', async () => {
      vi.spyOn(httpProvider, 'checkStatus').mockRejectedValue(new Error('Connection refused'));

      render(<Settings />);

      const testBtn = screen.getByRole('button', { name: /Testar Conexão/i });

      await act(async () => {
        fireEvent.click(testBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection refused/i)).toBeDefined();
      });
    });
  });
});
