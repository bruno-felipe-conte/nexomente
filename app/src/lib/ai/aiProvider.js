import * as embedded from './embeddedService';

/**
 * Provedor de IA do NexoMente:
 * - 'embedded': Motor Local GGUF nativo (node-llama-cpp / Gemma 4 / Llama)
 */

/**
 * Busca as configurações personalizadas do usuário
 */
export function getAIConfig() {
  const defaultLanguage = localStorage.getItem('nexomente_ai_language') || 'Português Brasileiro';
  let sysPrompt = localStorage.getItem('nexomente_ai_system_prompt') || 'Você é um assistente de estudos prestativo e inteligente. Responda sempre de forma clara e estruturada.';
  
  // Força o idioma da IA
  sysPrompt += `\n\n[IMPORTANT REQUIREMENT]: You MUST respond exclusively in ${defaultLanguage}. Do not use any other language.`;

  return {
    temperature: parseFloat(localStorage.getItem('nexomente_ai_temp')) || 0.7,
    max_tokens: parseInt(localStorage.getItem('nexomente_ai_max_tokens')) || 512,
    system_prompt: sysPrompt,
    language: defaultLanguage
  };
}

export function getActiveProvider() {
  return 'embedded';
}

export function setActiveProvider() {
  localStorage.setItem('nexomente_ai_provider', 'embedded');
}

export async function chat(messages, options = {}) {
  const globalConfig = getAIConfig();
  
  // Mescla as opções (prioriza as passadas por parâmetro)
  const finalOptions = {
    temperature: options.temperature ?? globalConfig.temperature,
    max_tokens: options.max_tokens ?? globalConfig.max_tokens,
    ...options
  };

  // Se for a primeira mensagem, injeta o system prompt global
  const finalMessages = [...messages];
  if (!messages.find(m => m.role === 'system')) {
    finalMessages.unshift({ role: 'system', content: globalConfig.system_prompt });
  }

  const result = await embedded.chat(finalMessages, finalOptions);

  // Padronização: garante que 'content' e 'response' existam para o frontend
  if (result.success) {
    if (!result.content && result.response) result.content = result.response;
    if (result.content && !result.response) result.response = result.content;
  }
  
  return result;
}

// Exportação explícita para evitar erros de importação
export const aiChat = chat;

export async function generate(prompt, options = {}) {
  const messages = [{ role: 'user', content: prompt }];
  const result = await embedded.chat(messages, options);

  if (!result.success && (result.error?.includes('Falha na conexão') || result.error?.includes('Exceeded') || result.error?.includes('fetch') || result.error?.includes('not a function'))) {
    result.isProviderError = true;
  }
  
  return result;
}

export async function checkStatus() {
  return embedded.checkStatus();
}

export async function listModels() {
  const res = await embedded.checkStatus();
  return res.models;
}

export function getModel() {
  return localStorage.getItem('nexomente_embedded_model') || 'gemma-4-E2B-it (Motor Interno)';
}

export async function askAI(pergunta, contexto = '') {
  const prompt = contexto
    ? `Contexto Atual:\n${contexto}\n\nPergunta do Usuário:\n${pergunta}`
    : pergunta;

  const res = await chat([{ role: 'user', content: prompt }]);
  return res.response || res.content || 'Sem resposta do modelo.';
}


