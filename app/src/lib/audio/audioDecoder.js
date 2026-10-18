/**
 * NexoMente - Decodificador Acústico, DSP Vocal, Anti-Cancelamento de Fase e Fonética PT-BR
 * 
 * Inspirado e adaptado das técnicas de ponta de processamento de áudio do VoiceStudio:
 * - Anti-aliasing cascateado e reamostragem precisa para 16000Hz (nativo do Kaldi/Vosk).
 * - Anti-cancelamento de fase para microfones duplos de laptops/fones no Windows.
 * - Gating de silêncio a -50dBFS para evitar alucinações ASR em ruído de fundo.
 * - Cadeia de estúdio DSP vocal (Highpass 85Hz + Boost de Presença 2.8kHz + Compressor Dinâmico).
 * - Detecção acústica de núcleos silábicos em tempo real para Cadência Poética (Hz / WPM) e Voicing.
 * - Decodificador fonético Metaphone PT-BR com tolerância a reduções vocálicas e homófonos.
 */

// ── 1. CADEIA DSP VOCAL (Web Audio API) ──────────────────────────────────────

const ANTIALIAS_STAGES = 3;
const ANTIALIAS_CUTOFF_RATIO = 0.45; // 0.45 * 16000 = 7200Hz (dentro do limite do mfcc.conf: 7600Hz)

/**
 * Cria a cadeia completa de tratamento de estúdio para voz falada.
 * Corta ruído mecânico, amplifica frequências de articulação de consoantes e nivela a dinâmica.
 */
export function createVoiceDSPChain(audioContext, sourceNode) {
  if (!audioContext || !sourceNode) return { outputNode: sourceNode, nodes: [] };

  const nodes = [];

  // A. High-pass filter (85Hz): corta ruído de cooler, vibração de mesa e sopro de ar
  const highpass = audioContext.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = Math.SQRT1_2;
  nodes.push(highpass);

  // B. Vocal Presence Peaking EQ (2800Hz, +3.2dB, Q=1.2):
  // Realça consoantes fricativas e oclusivas do português (s, z, f, v, t, d, p, b)
  const presence = audioContext.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2800;
  presence.gain.value = 3.2;
  presence.Q.value = 1.2;
  nodes.push(presence);

  // C. Filtro Low-pass Anti-Aliasing cascateado (~36dB/oitava):
  // Bloqueia qualquer frequência acima de 7.2kHz para evitar folding de frequências no Kaldi
  for (let i = 0; i < ANTIALIAS_STAGES; i++) {
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = ANTIALIAS_CUTOFF_RATIO * 16000;
    lowpass.Q.value = Math.SQRT1_2;
    nodes.push(lowpass);
  }

  // D. Compressor Dinâmico Vocal:
  // Nivela automaticamente versos recitados com intensidades variáveis
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -22.0; // dB
  compressor.knee.value = 8.0;
  compressor.ratio.value = 4.0;
  compressor.attack.value = 0.003; // 3ms
  compressor.release.value = 0.080; // 80ms
  nodes.push(compressor);

  // Conexão linear em cascata: source -> HP -> Presence -> LP x3 -> Comp
  let currentNode = sourceNode;
  for (const nextNode of nodes) {
    try {
      currentNode.connect(nextNode);
      currentNode = nextNode;
    } catch (err) {
      console.warn('[AudioDecoder] Falha ao encadear nó DSP:', err);
    }
  }

  return {
    outputNode: currentNode,
    nodes,
    disconnect: () => {
      for (const node of nodes) {
        try { node.disconnect(); } catch (_) {}
      }
    }
  };
}

// ── 2. PROCESSAMENTO DE ÁUDIO PCM 16kHz & ANTI-CANCELAMENTO DE FASE ──────────

const SILENCE_FLOOR_LINEAR = 0.00316; // -50 dBFS: abaixo disso é silêncio/ruído estático

/**
 * Converte canais estéreo para mono protegendo contra cancelamento de fase destrutivo.
 * Se o canal esquerdo e direito estiverem em oposição de fase (comum em laptops),
 * somar ambos resultaria em silêncio. Esta função detecta a inversão e seleciona o canal dominante.
 */
export function downmixAntiPhase(channelLeft, channelRight) {
  if (!channelRight || channelRight.length === 0) return channelLeft;
  const len = Math.min(channelLeft.length, channelRight.length);
  
  let sumSqL = 0;
  let sumSqR = 0;
  let sumSqMix = 0;

  for (let i = 0; i < len; i++) {
    const l = channelLeft[i];
    const r = channelRight[i];
    const mix = 0.5 * (l + r);
    sumSqL += l * l;
    sumSqR += r * r;
    sumSqMix += mix * mix;
  }

  const rmsL = Math.sqrt(sumSqL / len);
  const rmsR = Math.sqrt(sumSqR / len);
  const rmsMix = Math.sqrt(sumSqMix / len);
  const maxChannelRms = Math.max(rmsL, rmsR);

  // Se a média mono tem menos da metade da energia do canal mais forte, há cancelamento de fase
  if (maxChannelRms > SILENCE_FLOOR_LINEAR && rmsMix < 0.5 * maxChannelRms) {
    return rmsL >= rmsR ? channelLeft : channelRight;
  }

  const mono = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    mono[i] = 0.5 * (channelLeft[i] + channelRight[i]);
  }
  return mono;
}

/**
 * Reamostrador interpolado de alta fidelidade para 16000Hz com Silence Floor Gate.
 * Garante que o Vosk receba exatamente 16.000 amostras por segundo.
 */
export function resampleAndGateAudio(audioBuffer, sourceRate, targetRate = 16000) {
  if (!audioBuffer || audioBuffer.length === 0) return new Float32Array(0);

  // 1. Aplicação do Silence Floor Gate (-50 dBFS)
  let sumSquares = 0;
  for (let i = 0; i < audioBuffer.length; i++) {
    sumSquares += audioBuffer[i] * audioBuffer[i];
  }
  const frameRms = Math.sqrt(sumSquares / audioBuffer.length);

  // Se o buffer estiver abaixo do piso de ruído, zerar para não alimentar alucinações no Kaldi
  if (frameRms < SILENCE_FLOOR_LINEAR) {
    const cleanSilenceLen = sourceRate === targetRate 
      ? audioBuffer.length 
      : Math.round((audioBuffer.length * targetRate) / sourceRate);
    return new Float32Array(cleanSilenceLen);
  }

  if (sourceRate === targetRate) {
    return audioBuffer;
  }

  // 2. Reamostragem com interpolação linear anti-aliasing
  const inputLength = audioBuffer.length;
  const outputLength = Math.max(1, Math.round((inputLength * targetRate) / sourceRate));
  const output = new Float32Array(outputLength);
  const step = sourceRate / targetRate;

  for (let outIdx = 0; outIdx < outputLength; outIdx++) {
    const srcPos = outIdx * step;
    const lowIdx = Math.min(Math.floor(srcPos), inputLength - 1);
    const highIdx = Math.min(lowIdx + 1, inputLength - 1);
    const frac = srcPos - lowIdx;
    output[outIdx] = audioBuffer[lowIdx] + (audioBuffer[highIdx] - audioBuffer[lowIdx]) * frac;
  }

  return output;
}

// ── 3. TELEMETRIA REAL DE PROSÓDIA, CADÊNCIA & DICÇÃO ────────────────────────

export class RealtimeProsodyAnalyzer {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.minNucleusGapSamples = Math.round(0.080 * sampleRate); // Mínimo 80ms entre sílabas
    this.historyFrames = [];
    this.nucleusCount = 0;
    this.activeSpeechFrames = 0;
    this.totalFrames = 0;
    this.startTime = Date.now();
    this.lastNucleusSampleIndex = -999999;
    this.totalSamplesProcessed = 0;
  }

  reset() {
    this.historyFrames = [];
    this.nucleusCount = 0;
    this.activeSpeechFrames = 0;
    this.totalFrames = 0;
    this.startTime = Date.now();
    this.lastNucleusSampleIndex = -999999;
    this.totalSamplesProcessed = 0;
  }

  processFrame(pcm16k) {
    if (!pcm16k || pcm16k.length === 0) return null;
    this.totalFrames++;

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < pcm16k.length; i++) {
      const abs = Math.abs(pcm16k[i]);
      if (abs > peak) peak = abs;
      sumSq += abs * abs;
    }
    const rms = Math.sqrt(sumSq / pcm16k.length);
    const isVoiced = rms > SILENCE_FLOOR_LINEAR * 2.0;

    if (isVoiced) {
      this.activeSpeechFrames++;
    }

    // Detecção de núcleo silábico por variação de energia local
    const frameIndex = this.totalSamplesProcessed;
    if (isVoiced && peak > 0.05) {
      if (frameIndex - this.lastNucleusSampleIndex >= this.minNucleusGapSamples) {
        this.nucleusCount++;
        this.lastNucleusSampleIndex = frameIndex;
      }
    }

    this.totalSamplesProcessed += pcm16k.length;

    const elapsedSeconds = Math.max(0.5, (Date.now() - this.startTime) / 1000);
    const syllableRateHz = parseFloat((this.nucleusCount / elapsedSeconds).toFixed(2));
    const estimatedWpm = Math.round(syllableRateHz * 60 / 1.8); // Média de ~1.8 sílabas por palavra em PT
    const voicedRatio = this.totalFrames > 0 
      ? Math.min(100, Math.round((this.activeSpeechFrames / this.totalFrames) * 100))
      : 0;

    // Normalização acústica de cadência para versos: 2.5 a 4.5 sílabas/segundo é a cadência perfeita de poesia
    let cadenciaScore = 100;
    if (syllableRateHz < 1.5) {
      cadenciaScore = Math.max(40, Math.round((syllableRateHz / 1.5) * 85));
    } else if (syllableRateHz > 5.5) {
      cadenciaScore = Math.max(50, Math.round(100 - (syllableRateHz - 5.5) * 15));
    }

    return {
      rms,
      audioLevel: Math.min(100, Math.round(rms * 400)),
      syllableRateHz,
      estimatedWpm,
      voicedRatio,
      cadenciaScore
    };
  }
}

// ── 4. DECODIFICADOR FONÉTICO PT-BR & COMBINAÇÃO LEXICAL ─────────────────────

/**
 * Normaliza strings para análise fonética estrita (minúsculas sem pontuação).
 */
export function normalizarTexto(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Metaphone fonético customizado para o Português Brasileiro.
 * Mapeia variações sonoras idênticas em fala rápida para o mesmo código fonético.
 */
export function codificarFoneticaPtBr(palavra) {
  if (!palavra) return '';
  // Tratar 'ç' antes de NFD remover diacríticos e virar 'c'
  // 'ç' tem som surdo de 'S' (não sonoriza em 'Z' intervocálico)
  let raw = palavra.toLowerCase().replace(/ç/g, 'S');
  let w = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
  if (!w) return '';

  // 1. Redução do 'r' final em verbos no infinitivo (ex: 'falar' -> 'fala', 'querer' -> 'quere')
  if (w.endsWith('r') && w.length > 2) {
    w = w.slice(0, -1);
  }

  // 2. Redução vocálica átona final (ex: 'salgado' -> 'salgadu', 'noite' -> 'noiti')
  if (w.endsWith('o')) w = w.slice(0, -1) + 'u';
  if (w.endsWith('e')) w = w.slice(0, -1) + 'i';

  // 3. Nasalização ('am' / 'an' / 'ão' -> 'AO')
  w = w.replace(/a[mn]$|ao$/g, 'AO');

  // 4. Consoantes homófonas no PT-BR:
  // 'ch' -> 'X', 'x' -> 'X'
  w = w.replace(/ch/g, 'X');
  // 'lh' -> 'LI', 'nh' -> 'NI'
  w = w.replace(/lh/g, 'LI').replace(/nh/g, 'NI');
  // 'qu'/'gu' antes de e/i
  w = w.replace(/qu(?=[ei])/g, 'K').replace(/gu(?=[ei])/g, 'G');
  // ç, sc, sç, xc, ss -> 'S' (som sibilante surdo)
  w = w.replace(/s[cç]|xc|ç|ss/g, 'S');
  // 'c' antes de e/i vira 'S', senão 'K'
  w = w.replace(/c(?=[ei])/g, 'S').replace(/c/g, 'K');
  // 's' intervocálico -> 'Z' (apenas 's' simples entre vogais, não 'S' maiúsculo derivado de ss/ç)
  w = w.replace(/([aeiou])s([aeiou])/g, '$1Z$2');
  // Todos os 's' restantes viram 'S'
  w = w.replace(/s/g, 'S');
  // 'w' -> 'V', 'y' -> 'I'
  w = w.replace(/w/g, 'V').replace(/y/g, 'I');
  // 'ph' -> 'F'
  w = w.replace(/ph/g, 'F');

  // 5. Eliminar duplicatas adjacentes
  let res = '';
  for (let i = 0; i < w.length; i++) {
    if (i === 0 || w[i] !== w[i - 1]) {
      res += w[i];
    }
  }

  return res.toUpperCase();
}

/**
 * Distância de Levenshtein entre duas strings.
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

/**
 * Similaridade lexical clássica (0.0 a 1.0).
 */
export function calcularSimilaridadeLexical(a, b) {
  if (a === b) return 1.0;
  const normA = normalizarTexto(a);
  const normB = normalizarTexto(b);
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Avaliação Híbrida: Combina Similaridade Lexical + Código Fonético PT-BR.
 * Permite que pequenas reduções da fala coloquial sejam pontuadas como acerto poético.
 */
export function calcularSimilaridadeFonetica(palavraOuvida, palavraEsperada) {
  const normOuvida = normalizarTexto(palavraOuvida);
  const normEsperada = normalizarTexto(palavraEsperada);

  if (normOuvida === normEsperada) return 1.0;
  if (!normOuvida || !normEsperada) return 0.0;

  // 1. Similaridade Lexical direta
  const simLexical = calcularSimilaridadeLexical(normOuvida, normEsperada);
  if (simLexical >= 0.82) return simLexical;

  // 2. Comparação Fonética PT-BR (usa strings originais para preservar 'ç' antes do NFD)
  const foneOuvida = codificarFoneticaPtBr(palavraOuvida);
  const foneEsperada = codificarFoneticaPtBr(palavraEsperada);

  if (foneOuvida && foneOuvida === foneEsperada) {
    // Códigos fonéticos idênticos (ex: salgado/salgadu, coracao/corassao) garantem acerto com 92%
    return Math.max(0.92, simLexical);
  }

  const maxFoneLen = Math.max(foneOuvida.length, foneEsperada.length);
  const distFone = levenshteinDistance(foneOuvida, foneEsperada);
  const simFonetica = maxFoneLen > 0 ? Math.max(0, 1 - distFone / maxFoneLen) : 0;

  // Ponderação: 60% fonética acústica + 40% proximidade de letras
  return Math.max(simLexical, simFonetica * 0.6 + simLexical * 0.4);
}

// ── 5. GRAMÁTICA CONTEXTUAL KALDI & NORMALIZAÇÃO DE TEXTO ────────────────────

/**
 * Extrai vocabulário único de um poema e monta o array de gramática aceito pelo KaldiRecognizer do Vosk.
 * Inclui o token especial "[unk]" para palavras desconhecidas/fora do poema.
 */
export function extrairGramaticaContextual(textoPoemaOuTexto) {
  if (!textoPoemaOuTexto) return null;
  const palavras = textoPoemaOuTexto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(p => p.trim())
    .filter(p => p.length >= 2);

  const setPalavras = new Set(palavras);
  if (setPalavras.size === 0) return null;

  // Sempre adicionar token de palavras fora da gramática
  setPalavras.add('[unk]');
  return Array.from(setPalavras);
}

/**
 * Normaliza e limpa a transcrição para o Copiloto Neural (pontuação inicial, caixa alta).
 */
export function normalizarTranscricaoCopiloto(texto) {
  if (!texto) return '';
  const limpo = texto.trim();
  if (!limpo) return '';
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}
