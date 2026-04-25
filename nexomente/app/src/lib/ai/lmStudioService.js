// ============================================================================
// NexoMente LM Studio Service - AI Integration Layer
// ============================================================================
// Purpose: Abstract local LLM interaction from UI components
// Architecture: Stateless client with persistent model/temperature preferences
// Dev Mode: Uses Vite proxy (/v1 → http://localhost:1234/v1)
// Prod Mode: Direct connection to LM Studio endpoint

const LMSTUDIO_HOST = import.meta.env.DEV ? '' : 'http://127.0.0.1:1234';
const DEFAULT_MODEL = 'qwen/qwen3.5-9b'; // Optimized for Portuguese/English chat
const DEFAULT_TEMP = 0.4; // Balanced creativity vs determinism

// Persistence layer - retains user preferences across sessions
let currentModel = localStorage.getItem('nexomente_ai_model') || DEFAULT_MODEL;
let currentTemp = parseFloat(localStorage.getItem('nexomente_ai_temp')) || DEFAULT_TEMP;

export function setModel(modelName) {
  currentModel = modelName;
  localStorage.setItem('nexomente_ai_model', modelName);
}

export function getModel() {
  return currentModel;
}

export function setTemperature(t) {
  currentTemp = Math.max(0.1, Math.min(1.0, t));
  localStorage.setItem('nexomente_ai_temp', currentTemp.toString());
}

export function getTemperature() {
  return currentTemp;
}

export async function checkLMStudioStatus() {
  // Checks if LM Studio is running and returns available chat models
  // Filters out embedding models which can't generate text
  try {
    const response = await fetch(`${LMSTUDIO_HOST}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      // Filter to only include chat-capable models (exclude embeddings)
      const chatModels = (data.data || []).filter(m => isChatModel(m.id || m.name || m));
      return { status: 'online', models: chatModels };
    }
    return { status: 'offline', models: [] };
  } catch {
    return { status: 'offline', models: [] };
  }
}

// Tags to exclude from model list (embedding models don't generate text)
const EXCLUDE_TAGS = ['embedding', 'embed', 'nomic-embed'];

// Determines if a model is capable of text generation (vs embeddings only)
function isChatModel(modelName) {
  const lower = (modelName || '').toLowerCase();
  return !EXCLUDE_TAGS.some(tag => lower.includes(tag));
}

export async function listModels() {
  // Returns list of available chat models for UI dropdown
  // Falls back to default model if none available
  const res = await checkLMStudioStatus();
  if (res.status === 'online' && res.models.length > 0) {
    const chatModels = res.models.map(m => m.id || m.name || m).filter(isChatModel);
    return chatModels.length > 0 ? chatModels : ['qwen/qwen3.5-9b'];
  }
  return ['qwen/qwen3.5-9b'];
}

/**
 * Gera resposta simples (texto puro, sem estrutura de mensagem explícita)
 * @param {string} prompt - Texto ou instrução a ser processada
 * @param {object} options - Opções: model, temperature, max_tokens
 * @returns {Promise<{success: boolean, response?: string, error?: string}>}
 */
export async function generate(prompt, options = {}) {
  try {
    const temp = options.temperature ?? currentTemp;
    const response = await fetch(`${LMSTUDIO_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || currentModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: temp,
        max_tokens: options.max_tokens ?? 512,
      }),
    });

    if (!response.ok) {
      let errDetalhes = '';
      try {
        const errorData = await response.json();
        errDetalhes = errorData.error?.message || JSON.stringify(errorData.error);
      } catch (e) {
        errDetalhes = await response.text();
      }
      return { success: false, error: `Erro HTTP ${response.status}: ${errDetalhes}` };
    }

    const data = await response.json();
    return { success: true, response: data.choices?.[0]?.message?.content?.trim() || '' };
  } catch (error) {
    return { success: false, error: `Erro de conexão: ${error.message}` };
  }
}

/**
 * Gera resposta em formato chat (suporta múltiplas mensagens com contexto)
 * @param {Array} messages - Array de objetos {role: 'user'|'assistant', content: string}
 * @param {object} options - Opções: model, temperature, max_tokens
 */
export async function chat(messages, options = {}) {
  try {
    const temp = options.temperature ?? currentTemp;
    const response = await fetch(`${LMSTUDIO_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || currentModel,
        messages,
        stream: false,
        max_tokens: options.max_tokens ?? 512,
        temperature: temp,
      }),
    });

    if (!response.ok) {
      let errDetalhes = '';
      try {
        const errorData = await response.json();
        errDetalhes = errorData.error?.message || JSON.stringify(errorData.error);
      } catch (e) {
        errDetalhes = await response.text();
      }
      console.error('LM Studio HTTP Error:', response.status, errDetalhes);
      return { success: false, error: `Erro HTTP ${response.status}: ${errDetalhes}` };
    }

    const data = await response.json();
    return { success: true, response: data.choices?.[0]?.message?.content?.trim() || '' };
  } catch (error) {
    console.error('LM Studio Chat Exception:', error);
    return { success: false, error: `Erro de conexão: ${error.message}` };
  }
}

/**
 * Extrai tags semânticas de uma nota
 * @param {object} nota - Objeto com titulo e conteudo da nota
 * @param {number} maxTags - Número máximo de tags a sugerir (default: 8)
 */
export async function suggestTags(nota, maxTags = 8) {
  const prompt = `Analise esta nota e sugira até ${maxTags} tags em português (minúsculas, hífen para espaço, máximo 2 palavras cada).
Responda APENAS com JSON válido: {"tags": ["tag1", "tag2"]}
Título: ${nota.titulo}
Conteúdo: ${(nota.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 1500)}`;

  const result = await generate(prompt, { max_tokens: 384 });
  if (!result.success) return [];
  try {
    const parsed = JSON.parse(result.response);
    return Array.isArray(parsed.tags) ? parsed.tags.slice(0, maxTags) : [];
  } catch {
    const match = result.response.match(/\[[\s\S]*?\]\s*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]).slice(0, maxTags);
      } catch (_ignored) { /* fallback: parse falhou, tenta regex abaixo */ }
    }
    const quotes = [...result.response.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    if (quotes.length > 0) return quotes.slice(0, maxTags);
    return [];
  }
}

/**
 * Gera um resumo conciso do conteúdo de uma nota
 * @param {string} content - Conteúdo da nota para ser resumido  
 * @param {number} maxTokens - Limite máximo de tokens no resumo (default: 256)
 */
export async function summarizeContent(content, maxTokens = 256) {
  const clean = content.replace(/<[^>]*>/g, '').substring(0, 3000);
  const prompt = `Resuma o conteúdo abaixo em 3-5 frases curtas e objetivas:\n\n${clean}\n\nResumo:`;
  const result = await generate(prompt, { max_tokens: maxTokens });
  return result.success ? result.response : '';
}

/**
 * Gera flashcards de revisão baseados na nota
 * Cada card tem 'frente' (pergunta) e 'verso' (resposta)
 * @param {object} nota - Objeto com titulo e conteudo da nota
 * @param {number} maxCards - Número máximo de cards (default: 5)
 */
export async function generateFlashcards(nota, maxCards = 5) {
  const prompt = `Gere flashcards de revisão sobre esta nota. Gere o máximo que fizer sentido (até ${maxCards}).
Cada flashcard deve ter frente (pergunta clara) e verso (resposta objetiva).
Responda APENAS com JSON: [{"frente": "pergunta", "verso": "resposta"}]
Nota: ${nota.titulo}
Conteúdo: ${(nota.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 2000)}`;

  const result = await generate(prompt, { max_tokens: 768 });
  if (!result.success) return [];
  try {
    const parsed = JSON.parse(result.response);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Gera conteúdo usando um template predeterminado
 * Templates disponíveis: 'resumir', 'conceitos', 'perguntas', 'critica',
 * 'conexoes', 'exemplos', 'analogias'
 * @param {object} nota - Objeto com titulo e conteudo da nota
 * @param {string} template - Nome do template a usar
 * @param {object} options - Opções adicionais (temperature, etc.)
 */
export async function generateWithTemplate(nota, template, options = {}) {
  const templateMap = {
    resumir: {
      prompt: `Resuma o conteúdo abaixo em 3-5 frases curtas:\n\n{conteudo}\n\nResumo:`,
      max_tokens: 384,
    },
    conceitos: {
      prompt: `Extraia os 5 conceitos-chave deste conteúdo. Responda como lista:\n\n{conteudo}`,
      max_tokens: 512,
    },
    perguntas: {
      prompt: `Gere 5 perguntas de revisão sobre este conteúdo:\n\n{conteudo}`,
      max_tokens: 512,
    },
    critica: {
      prompt: `Analise criticamente: o que está faltando? O que pode melhorar?\n\n{conteudo}`,
      max_tokens: 512,
    },
    conexoes: {
      prompt: `Que conexões este conteúdo tem com outras áreas do conhecimento?\n\n{conteudo}`,
      max_tokens: 512,
    },
    exemplos: {
      prompt: `Gere 3 exemplos práticos deste conceito:\n\n{conteudo}`,
      max_tokens: 512,
    },
    analogias: {
      prompt: `Explique com uma analogia do cotidiano:\n\n{conteudo}`,
      max_tokens: 384,
    },
  };

  const tpl = templateMap[template];
  if (!tpl) return { success: false, error: 'template desconhecido' };

  const conteudo = (nota.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 2000);
  const prompt = tpl.prompt.replace('{conteudo}', conteudo);
  const result = await generate(prompt, { max_tokens: tpl.max_tokens, temperature: options.temperature });
  return result;
}

export { checkLMStudioStatus as checkStatus };
export const HOST = LMSTUDIO_HOST;