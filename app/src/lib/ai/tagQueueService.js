/**
 * Serviço de Fila Inteligente de Auto-Tagging de Notas (Requisito R1).
 *
 * Coordena a geração imediata de tags quando online ou enfileiramento persistente
 * no SQLite WASM (tags_queue) quando offline ou em motor local, sem consumir
 * ciclos pesados de CPU/GPU da máquina do usuário.
 */

import toast from 'react-hot-toast';
import { useDBStore, dbPromise } from '../../store/useDBStore.js';
import { useAIStore } from '../../store/useAIStore.js';
import * as aiProvider from './aiProvider.js';
import { httpProvider } from './httpProvider.js';

let isDraining = false;
let pendingDrain = false;
let listenersInitialized = false;
const tagUpdateListeners = new Set();

/**
 * Determina se a URL aponta para um serviço local (LM Studio / Ollama local).
 */
export function isLocalhost(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
  }
}

/**
 * Verifica se um provedor de IA online remoto está ativo e com conectividade.
 * Condição: provedor 'http' ativo, navigator.onLine !== false e URL não-localhost.
 */
export function isOnlineProviderActive() {
  const activeProvider = aiProvider.getActiveProvider();
  if (activeProvider !== 'http') return false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const baseUrl = httpProvider.getBaseUrl();
  if (isLocalhost(baseUrl)) {
    return false;
  }

  return true;
}

/**
 * Normaliza uma tag para o padrão do NexoMente (minúsculas, sem acentos, hífens para espaços).
 */
export function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);
}

/**
 * Monta o prompt pedagógico e taxonômico para geração de até 6 tags semânticas.
 */
export function buildTagPrompt(titulo, conteudo) {
  const cleanTitle = (titulo || '').trim();
  const cleanContent = (conteudo || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);

  return (
    'Analise esta nota e sugira até 6 tags semânticas em português (minúsculas, hífen para espaço, máximo 2 palavras cada). ' +
    'Responda APENAS com JSON no formato: {"tags": ["tag1", "tag2"]}\n' +
    `Título: ${cleanTitle}\nConteúdo: ${cleanContent}`
  );
}

/**
 * Extrai a lista de tags da resposta bruta da IA.
 */
export function parseTagsFromResponse(responseContent) {
  if (!responseContent || typeof responseContent !== 'string') return [];
  try {
    const parsed = JSON.parse(responseContent);
    if (Array.isArray(parsed.tags)) return parsed.tags;
  } catch {}

  const jsonMatch = responseContent.match(/\{[\s\S]*?"tags"\s*:\s*\[([\s\S]*?)\]\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.tags)) return parsed.tags;
    } catch {}
  }

  const quotes = [...responseContent.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return quotes.filter((q) => q.toLowerCase() !== 'tags');
}

/**
 * Invoca diretamente o provedor HTTP remoto sem permitir fallback para o motor local.
 */
export async function generateTagsViaOnlineAI(titulo, conteudo) {
  const prompt = buildTagPrompt(titulo, conteudo);
  try {
    const res = await httpProvider.chat(
      [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em taxonomia e indexação de notas. Responda exclusivamente com um objeto JSON válido no formato {"tags": ["tag1", "tag2"]}.',
        },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 256, temperature: 0.2, timeout: 15000 }
    );

    if (res && res.success) {
      const raw = res.content || res.response || '';
      const parsed = parseTagsFromResponse(raw);
      const normalized = parsed.map(normalizeTag).filter(Boolean);
      return Array.from(new Set(normalized)).slice(0, 6);
    }
  } catch (err) {
    console.warn('[tagQueueService] Erro ao chamar IA online para tags:', err);
  }
  return null;
}

/**
 * Notifica ouvintes registrados (ex: editor aberto) de tags atualizadas em uma nota.
 */
function notifyTagListeners(data) {
  for (const cb of tagUpdateListeners) {
    try {
      cb(data);
    } catch (e) {
      console.warn('[tagQueueService] Erro em listener de tags:', e);
    }
  }
}

/**
 * Registra um callback para ser invocado sempre que tags automáticas forem aplicadas a uma nota.
 */
export function onTagsUpdated(callback) {
  tagUpdateListeners.add(callback);
  return () => tagUpdateListeners.delete(callback);
}

/**
 * Enfileira ou processa imediatamente uma nota para auto-tagging.
 */
export async function enqueueNote(notaId, content = {}) {
  if (!notaId) return;

  const dbState = useDBStore.getState();
  let TagsQueue = dbState.TagsQueue;
  let Notas = dbState.Notas;

  if (!TagsQueue || !Notas) {
    try {
      if (typeof dbPromise !== 'undefined') await dbPromise;
    } catch {}
    TagsQueue = useDBStore.getState().TagsQueue;
    Notas = useDBStore.getState().Notas;
  }

  if (!TagsQueue || !Notas) return;

  const nota = Notas.getById(notaId);
  if (!nota || nota.status === 'deletado' || nota.status === 'lixeira') {
    TagsQueue.dequeue(notaId);
    return;
  }
  const titulo = content.titulo ?? nota?.titulo ?? '';
  const conteudo = content.conteudo ?? nota?.conteudo ?? '';
  const existingTags = Array.isArray(nota?.tags) ? nota.tags : [];

  // Validação de conteúdo mínimo para evitar tags alucinadas em notas em branco
  const cleanTitle = titulo.trim();
  const cleanBody = conteudo.replace(/<[^>]*>/g, '').trim();
  const isMeaningful = (cleanTitle.length > 0 && cleanTitle !== 'Nova Nota') || cleanBody.length >= 5;
  if (!isMeaningful) {
    return;
  }

  // Se o provedor online não estiver ativo (offline ou local), enfileira com 0 uso de CPU local
  if (!isOnlineProviderActive()) {
    TagsQueue.enqueue(notaId);
    return;
  }

  // Provedor online ativo: gera e aplica as tags imediatamente
  try {
    const generatedTags = await generateTagsViaOnlineAI(titulo, conteudo);
    if (generatedTags && generatedTags.length > 0) {
      const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
      const toAdd = generatedTags.filter((t) => !existingLower.has(t.toLowerCase()));

      if (toAdd.length > 0) {
        const merged = [...existingTags, ...toAdd];
        Notas.update(notaId, { tags: merged });
        notifyTagListeners({ notaId, tags: merged });
        toast('🏷️ Tags automáticas adicionadas');
      }
      TagsQueue.dequeue(notaId);
    } else {
      // Se a chamada online falhou (ex: 429 rate limit temporário), insere na fila para dreno
      TagsQueue.enqueue(notaId);
    }
  } catch (err) {
    console.warn('[tagQueueService] Falha no auto-tagging online, enfileirando:', err);
    TagsQueue.enqueue(notaId);
  }
}

/**
 * Processa a fila persistente em segundo plano com controle de concorrência e espaçamento de 250ms.
 */
export async function drainQueue() {
  if (isDraining) {
    pendingDrain = true;
    return;
  }

  if (!isOnlineProviderActive()) {
    return;
  }

  const dbState = useDBStore.getState();
  const TagsQueue = dbState.TagsQueue;
  const Notas = dbState.Notas;
  if (!TagsQueue || !Notas) return;

  isDraining = true;
  pendingDrain = false;

  try {
    let items = TagsQueue.peek(10);
    let taggedCount = 0;

    while (items.length > 0 && isOnlineProviderActive()) {
      for (const item of items) {
        if (!isOnlineProviderActive()) break;

        const nota = Notas.getById(item.nota_id);
        if (!nota || nota.status === 'deletado' || nota.status === 'lixeira') {
          // Nota excluída: retira da fila
          TagsQueue.dequeue(item.nota_id);
          continue;
        }

        const cleanTitle = (nota.titulo || '').trim();
        const cleanContent = (nota.conteudo || '').replace(/<[^>]*>/g, '').trim();
        if ((!cleanTitle || cleanTitle === 'Nova Nota') && cleanContent.length < 5) {
          continue;
        }

        const tags = await generateTagsViaOnlineAI(nota.titulo, nota.conteudo);
        if (tags && tags.length > 0) {
          const existingTags = Array.isArray(nota.tags) ? nota.tags : [];
          const existingLower = new Set(existingTags.map((t) => t.toLowerCase()));
          const toAdd = tags.filter((t) => !existingLower.has(t.toLowerCase()));

          if (toAdd.length > 0) {
            const merged = [...existingTags, ...toAdd];
            Notas.update(nota.id, { tags: merged });
            notifyTagListeners({ notaId: nota.id, tags: merged });
            taggedCount++;
          }
          TagsQueue.dequeue(item.nota_id);
        } else {
          TagsQueue.markFailed(item.nota_id);
        }

        // Espaçamento de 250ms entre requisições para evitar rate limit
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!isOnlineProviderActive()) break;
      items = TagsQueue.peek(10);
    }

    if (taggedCount > 0) {
      toast('🏷️ Tags automáticas adicionadas');
    }
  } catch (err) {
    console.error('[tagQueueService] Erro ao drenar fila de tags:', err);
  } finally {
    isDraining = false;
    if (pendingDrain && isOnlineProviderActive()) {
      pendingDrain = false;
      drainQueue().catch(() => {});
    }
  }
}

/**
 * Configura os ouvintes de rede e provedor para disparo automático do dreno da fila.
 */
export function setupListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // 1. Ouvinte de retorno de conexão com a Internet
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setTimeout(() => drainQueue().catch(() => {}), 100);
    });
  }

  // 2. Ouvinte de alternância de provedor na store reativa useAIStore
  if (typeof useAIStore?.subscribe === 'function') {
    useAIStore.subscribe((state, prevState) => {
      if (state?.provider === 'http' && prevState?.provider !== 'http') {
        setTimeout(() => drainQueue().catch(() => {}), 150);
      }
    });
  }

  // 3. Interceptador de chamadas HTTP bem-sucedidas no httpProvider
  if (typeof httpProvider !== 'undefined' && typeof httpProvider.chat === 'function') {
    const originalChat = httpProvider.chat.bind(httpProvider);
    httpProvider.chat = async function (...args) {
      const res = await originalChat(...args);
      if (res && res.success) {
        setTimeout(() => {
          if (isOnlineProviderActive()) {
            drainQueue().catch(() => {});
          }
        }, 300);
      }
      return res;
    };
  }
}

// Inicializa automaticamente os ouvintes no carregamento do módulo
setupListeners();

export const tagQueueService = {
  isLocalhost,
  isOnlineProviderActive,
  normalizeTag,
  buildTagPrompt,
  parseTagsFromResponse,
  generateTagsViaOnlineAI,
  onTagsUpdated,
  enqueueNote,
  drainQueue,
  setupListeners,
};

export default tagQueueService;
