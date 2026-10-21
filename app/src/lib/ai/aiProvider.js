import * as embedded from './embeddedService';
import { httpProvider } from './httpProvider';

/**
 * Interface AIProvider (Plugin System para IA - E1)
 * Suporta múltiplos provedores intercambiáveis:
 * - 'embedded': Motor Local GGUF nativo (node-llama-cpp / Gemma 4)
 * - 'http': Servidor Local HTTP / OpenAI compatível (LM Studio / Ollama)
 */
const providers = {
  embedded,
  http: httpProvider,
};

export function registerAIProvider(name, providerInstance) {
  providers[name] = providerInstance;
}

export function getAvailableProviders() {
  return Object.keys(providers);
}

/**
 * Busca as configurações personalizadas do usuário
 */
export function getAIConfig() {
  const defaultLanguage = localStorage.getItem('nexomente_ai_language') || 'Português Brasileiro';
  let sysPrompt = localStorage.getItem('nexomente_ai_system_prompt') || 'Você é um assistente de estudos prestativo e inteligente. Responda sempre de forma clara e estruturada.';
  
  sysPrompt += `\n\n[IMPORTANT REQUIREMENT]: You MUST respond exclusively in ${defaultLanguage}. Do not use any other language.`;

  return {
    temperature: parseFloat(localStorage.getItem('nexomente_ai_temp')) || 0.7,
    max_tokens: parseInt(localStorage.getItem('nexomente_ai_max_tokens')) || 512,
    system_prompt: sysPrompt,
    language: defaultLanguage
  };
}

export function getActiveProvider() {
  const stored = localStorage.getItem('nexomente_ai_provider');
  return stored && providers[stored] ? stored : 'embedded';
}

export function setActiveProvider(providerName) {
  if (providers[providerName]) {
    localStorage.setItem('nexomente_ai_provider', providerName);
    return true;
  }
  return false;
}

export async function chat(messages, options = {}) {
  const globalConfig = getAIConfig();
  const providerKey = getActiveProvider();
  const currentProvider = providers[providerKey] || embedded;
  
  const finalOptions = {
    temperature: options.temperature ?? globalConfig.temperature,
    max_tokens: options.max_tokens ?? globalConfig.max_tokens,
    ...options
  };

  const finalMessages = [...messages];
  if (!messages.find(m => m.role === 'system')) {
    finalMessages.unshift({ role: 'system', content: globalConfig.system_prompt });
  }

  const result = await currentProvider.chat(finalMessages, finalOptions);

  if (result.success) {
    if (!result.content && result.response) result.content = result.response;
    if (result.content && !result.response) result.response = result.content;
  }
  
  return result;
}

export const aiChat = chat;

export async function generate(prompt, options = {}) {
  const messages = [{ role: 'user', content: prompt }];
  const result = await chat(messages, options);

  if (!result.success && (result.error?.includes('Falha na conexão') || result.error?.includes('Exceeded') || result.error?.includes('fetch') || result.error?.includes('not a function'))) {
    result.isProviderError = true;
  }
  
  return result;
}

export async function checkStatus() {
  const providerKey = getActiveProvider();
  const currentProvider = providers[providerKey] || embedded;
  return currentProvider.checkStatus();
}

export async function listModels() {
  const res = await checkStatus();
  return res.models || [];
}

export function getModel() {
  const providerKey = getActiveProvider();
  if (providerKey === 'http') {
    return localStorage.getItem('nexomente_ai_http_model') || 'LM Studio / Ollama (HTTP)';
  }
  return localStorage.getItem('nexomente_embedded_model') || 'gemma-4-E2B-it (Motor Interno)';
}

export async function askAI(pergunta, contexto = '') {
  const prompt = contexto
    ? `Contexto Atual:\n${contexto}\n\nPergunta do Usuário:\n${pergunta}`
    : pergunta;

  const res = await chat([{ role: 'user', content: prompt }]);
  return res.response || res.content || 'Sem resposta do modelo.';
}
