import { describe, it, expect } from 'vitest';
import {
  resampleAndGateAudio,
  downmixAntiPhase,
  normalizarTexto,
  codificarFoneticaPtBr,
  calcularSimilaridadeFonetica,
  extrairGramaticaContextual,
  RealtimeProsodyAnalyzer
} from '../lib/audio/audioDecoder.js';

describe('audioDecoder - DSP e Processamento de Áudio', () => {
  it('aplica Silence Floor Gate cortando ruído abaixo de -50dBFS para zeros', () => {
    // Ruído estático baixo (< 0.00316)
    const ruídoBaixo = new Float32Array([0.001, -0.001, 0.0005, -0.0008]);
    const resultado = resampleAndGateAudio(ruídoBaixo, 16000, 16000);
    
    expect(resultado.length).toBe(4);
    for (let i = 0; i < resultado.length; i++) {
      expect(resultado[i]).toBe(0);
    }
  });

  it('reamostra áudio de 48000Hz para 16000Hz (fator 3:1) com interpolação', () => {
    const pcm48k = new Float32Array(48);
    for (let i = 0; i < 48; i++) {
      pcm48k[i] = 0.5; // sinal audível acima do piso
    }
    const pcm16k = resampleAndGateAudio(pcm48k, 48000, 16000);
    expect(pcm16k.length).toBe(16);
    expect(pcm16k[0]).toBeCloseTo(0.5, 2);
  });

  it('downmixAntiPhase protege contra cancelamento de fase em microfones estéreo', () => {
    const canalL = new Float32Array([0.4, 0.5, 0.6, 0.5]);
    // Canal R com fase invertida (se somar direto l + r vira 0)
    const canalR = new Float32Array([-0.4, -0.5, -0.6, -0.5]);

    const mono = downmixAntiPhase(canalL, canalR);
    // Deve escolher o canal L em vez de somar para zero
    expect(Math.abs(mono[0])).toBeGreaterThan(0.3);
  });
});

describe('audioDecoder - Fonética e Similaridade PT-BR', () => {
  it('normaliza texto removendo acentos e pontuação', () => {
    expect(normalizarTexto('Ó, mar salgado, quanto do teu sal!')).toBe('o mar salgado quanto do teu sal');
  });

  it('gera códigos fonéticos equivalentes para reduções coloquiais do PT-BR', () => {
    // Redução de 'o' átono final para 'u'
    expect(codificarFoneticaPtBr('salgado')).toBe(codificarFoneticaPtBr('salgadu'));
    // Homófonos 'ç' vs 'ss'
    expect(codificarFoneticaPtBr('coração')).toBe(codificarFoneticaPtBr('corassao'));
    // Queda do 'r' final em infinitivo
    expect(codificarFoneticaPtBr('querer')).toBe(codificarFoneticaPtBr('quere'));
  });

  it('calcularSimilaridadeFonetica pontua variações fonéticas naturais com alta tolerância', () => {
    const sim = calcularSimilaridadeFonetica('salgadu', 'salgado');
    expect(sim).toBeGreaterThanOrEqual(0.90);

    const simVerbo = calcularSimilaridadeFonetica('navega', 'navegar');
    expect(simVerbo).toBeGreaterThanOrEqual(0.85);

    // Palavras totalmente diferentes continuam reprovadas
    const simDiferente = calcularSimilaridadeFonetica('pedra', 'salgado');
    expect(simDiferente).toBeLessThan(0.40);
  });

  it('extrairGramaticaContextual extrai vocabulário único com token [unk]', () => {
    const poema = 'Tudo vale a pena se a alma não é pequena.';
    const gramatica = extrairGramaticaContextual(poema);
    expect(gramatica).toContain('tudo');
    expect(gramatica).toContain('pena');
    expect(gramatica).toContain('pequena');
    expect(gramatica).toContain('[unk]');
  });
});

describe('audioDecoder - Telemetria de Prosódia em Tempo Real', () => {
  it('calcula cadência e atividade vocal a partir de frames PCM', () => {
    const analyzer = new RealtimeProsodyAnalyzer(16000);
    // Simula frame de 4096 amostras com sinal vocal
    const frame = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      frame[i] = 0.2 * Math.sin((2 * Math.PI * 220 * i) / 16000);
    }
    const telemetry = analyzer.processFrame(frame);
    expect(telemetry).toHaveProperty('rms');
    expect(telemetry).toHaveProperty('syllableRateHz');
    expect(telemetry).toHaveProperty('voicedRatio');
    expect(telemetry.audioLevel).toBeGreaterThan(0);
  });
});
