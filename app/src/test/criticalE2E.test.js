import { describe, it, expect } from 'vitest';
import { calculateNextReview } from '../hooks/sm2.js';
import { codificarFoneticaPtBr, calcularSimilaridadeFonetica, resampleAndGateAudio } from '../lib/audio/audioDecoder.js';
import { LocalStorageAdapter } from '../lib/storage/localAdapter.js';

describe('Suite de Integridade E2E Crítica - NexoMente', () => {
  describe('SM-2 e Repetição Espaçada', () => {
    it('deve agendar novo intervalo progressivo para resposta "Bom" (qualidade 3)', () => {
      const cardNovo = {
        intervalo: 0,
        repeticoes: 0,
        ease_factor: 2.5,
        state: 'new',
        step_index: 0,
      };

      const step1 = calculateNextReview(cardNovo, 3);
      expect(step1.step_index).toBe(1);

      const step2 = calculateNextReview(step1, 3);
      expect(step2.state).toBe('review');
      expect(step2.intervalo).toBe(1);
      expect(step2.repeticoes).toBe(1);
    });

    it('deve redefinir repetições e reduzir ease_factor em falha (qualidade 1 - Again)', () => {
      const cardMaduro = {
        intervalo: 10,
        repeticoes: 4,
        ease_factor: 2.5,
        state: 'review',
        lapses: 0,
      };

      const result = calculateNextReview(cardMaduro, 1);
      expect(result.intervalo).toBe(0);
      expect(result.repeticoes).toBe(0);
      expect(result.lapses).toBe(1);
      expect(result.ease_factor).toBe(2.3);
      expect(result.state).toBe('relearning');
    });
  });

  describe('Audio & Decoder DSP PT-BR', () => {
    it('deve reamostrar áudio 48kHz para 16kHz e silenciar abaixo de -50dBFS', () => {
      const audioSilencioso = new Float32Array(480).fill(0.001); // ruído fraco
      const resampled = resampleAndGateAudio(audioSilencioso, 48000, 16000);
      expect(resampled.length).toBe(160);
      expect(resampled.every(v => v === 0)).toBe(true);
    });

    it('deve tolerar sotaques e variações sonoras em palavras poéticas', () => {
      expect(codificarFoneticaPtBr('coracao')).toBe(codificarFoneticaPtBr('coração'));
      const sim = calcularSimilaridadeFonetica('salgadu', 'salgado');
      expect(sim).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Armazenamento Seguro e Criptografia em Repouso', () => {
    it('deve suportar estratégia de LocalStorageAdapter', () => {
      const adapter = new LocalStorageAdapter('test_unit', [{ id: '1', titulo: 'Nota Teste' }]);
      expect(adapter.getAll()).toHaveLength(1);
      expect(adapter.getById('1').titulo).toBe('Nota Teste');
    });
  });
});
