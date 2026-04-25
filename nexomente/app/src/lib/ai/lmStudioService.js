const LMSTUDIO_HOST = import.meta.env.DEV ? '' : 'http://127.0.0.1:1234';
const DEFAULT_MODEL = 'qwen/qwen3.5-9b';
const DEFAULT_TEMP = 0.4;

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
  try {
    const response = await fetch(`${LMSTUDIO_HOST}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { status: 'online', models: data.data || [] };
    }
    return { status: 'offline', models: [] };
  } catch {
    return { status: 'offline', models: [] };
  }
}

export async function listModels() {
  const res = await checkLMStudioStatus();
  if (res.status === 'online' && res.models.length > 0) {
    return res.models.map(m => m.id || m.name || m);
  }
  return [currentModel];
}

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

export async function summarizeContent(content, maxTokens = 256) {
  const clean = content.replace(/<[^>]*>/g, '').substring(0, 3000);
  const prompt = `Resuma o conteúdo abaixo em 3-5 frases curtas e objetivas:\n\n${clean}\n\nResumo:`;
  const result = await generate(prompt, { max_tokens: maxTokens });
  return result.success ? result.response : '';
}

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