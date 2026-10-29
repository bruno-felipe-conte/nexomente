import { ipcMain } from 'electron';
import crypto from 'crypto';

// Cache em memória das últimas 50 frases sintetizadas para repetição instantânea sem lag
const audioCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Normaliza o valor de rate (0.8 a 1.5) para o formato percentual do MsEdgeTTS (ex: "-10%", "+15%")
 */
function normalizeRate(rate) {
  if (typeof rate !== 'number' || Number.isNaN(rate)) return '+0%';
  const pct = Math.round((rate - 1.0) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Normaliza o pitch (ex: 0 -> "+0Hz")
 */
function normalizePitch(pitch) {
  if (typeof pitch === 'string') return pitch;
  if (typeof pitch !== 'number' || Number.isNaN(pitch)) return '+0Hz';
  return pitch >= 0 ? `+${Math.round(pitch)}Hz` : `${Math.round(pitch)}Hz`;
}

export function registerAudioHandlers() {
  ipcMain.handle('audio:synthesizeSpeech', async (_, payload = {}) => {
    const {
      text,
      voice = 'pt-BR-FranciscaNeural',
      rate = 1.05,
      pitch = 0
    } = payload;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return { success: false, error: 'Texto não fornecido para síntese' };
    }

    const cleanText = text.trim();
    const rateStr = normalizeRate(rate);
    const pitchStr = normalizePitch(pitch);

    // Gerar chave de cache
    const cacheKey = crypto
      .createHash('md5')
      .update(`${voice}|${rateStr}|${pitchStr}|${cleanText}`)
      .digest('hex');

    if (audioCache.has(cacheKey)) {
      return {
        success: true,
        cached: true,
        audioBase64: audioCache.get(cacheKey),
        mimeType: 'audio/mp3'
      };
    }

    try {
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
      const tts = new MsEdgeTTS();

      // Configuração de formato de áudio MP3 de alta clareza
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = await tts.toStream(cleanText, {
        rate: rateStr,
        pitch: pitchStr
      });

      const audioBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        audioStream.on('data', (chunk) => chunks.push(chunk));
        audioStream.on('end', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', (err) => reject(err));
      });

      const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

      // Armazenar no cache com eviction LRU simples
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value;
        audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, audioBase64);

      return {
        success: true,
        audioBase64,
        mimeType: 'audio/mp3'
      };
    } catch (err) {
      console.error('[AUDIO IPC] Falha ao sintetizar voz via MsEdgeTTS:', err);
      return {
        success: false,
        error: err.message || 'Falha na conexão com motor neural'
      };
    }
  });
}
