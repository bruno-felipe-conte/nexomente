import * as lmStudio from './lmStudioService';
import * as gemini from './geminiService';
import * as embedded from './embeddedService';

/**
 * Provedores disponíveis:
 * - 'local': LM Studio / Ollama (Porta 1234)
 * - 'cloud': Google Gemini API
 * - 'embedded': Modelo embutido (Via Electron/Node) -- Em breve
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
  return localStorage.getItem('nexomente_ai_provider') || 'embedded';
}

export function setActiveProvider(provider) {
  localStorage.setItem('nexomente_ai_provider', provider);
}

export async function chat(messages, options = {}) {
  const provider = options.provider || getActiveProvider();
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

  let result;
  if (provider === 'cloud') {
    result = await gemini.chat(finalMessages, finalOptions);
  } else if (provider === 'embedded') {
    result = await embedded.chat(finalMessages, finalOptions);
  } else {
    result = await lmStudio.chat(finalMessages, finalOptions);
  }

  // Padronização: garante que 'content' exista para o frontend
  if (result.success && !result.content && result.response) {
    result.content = result.response;
  }
  
  return result;
}

// Exportação explícita para evitar erros de importação
export const aiChat = chat;

export async function generate(prompt, options = {}) {
  const provider = getActiveProvider();
  let result;
  
  if (provider === 'cloud') {
    const messages = [{ role: 'user', content: prompt }];
    result = await gemini.chat(messages, options);
  } else if (provider === 'embedded') {
    const messages = [{ role: 'user', content: prompt }];
    result = await embedded.chat(messages, options);
  } else {
    result = await lmStudio.generate(prompt, options);
  }

  if (!result.success && (result.error.includes('Falha na conexão') || result.error.includes('Exceeded') || result.error.includes('fetch') || result.error.includes('not a function'))) {
    result.isProviderError = true;
  }
  
  return result;
}

export async function checkStatus() {
  const provider = getActiveProvider();
  
  if (provider === 'cloud') {
    return gemini.checkStatus();
  } else if (provider === 'embedded') {
    return embedded.checkStatus();
  }
  
  return lmStudio.checkLMStudioStatus();
}

export async function listModels() {
  const provider = getActiveProvider();
  
  if (provider === 'cloud') {
    const res = await gemini.checkStatus();
    return res.models;
  } else if (provider === 'embedded') {
    const res = await embedded.checkStatus();
    return res.models;
  }
  
  return lmStudio.listModels();
}
