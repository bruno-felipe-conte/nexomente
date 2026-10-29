import * as embedded from './embeddedService';
import { httpProvider } from './httpProvider';

export const MAX_COPILOT_CHARS = 1500;

export const DEFAULT_COPILOT_SYSTEM_PROMPT = `Você é o Copiloto Neural, um assistente local de estudos, ciências exatas, humanidades e gestão de conhecimento altamente analítico e dedutivo.

REGRAS DE OURO DE INTERPRETAÇÃO E RESPOSTA:
1. ANCORAGEM E CORREÇÃO FONÉTICA: O usuário pode digitar rápido, sem acentos ou com erros fonéticos (ex: "bascar" -> Fórmula de Bhaskara; "tutancamom" -> Faraó Tutancâmon; "pitagora" -> Teorema de Pitágoras). SEMPRE inicie a resposta identificando explicitamente o conceito correto antes de explicá-lo (ex: "Referindo-se à **Fórmula de Bhaskara** (equação do 2º grau): ..."). NUNCA confunda termos matemáticos ou científicos com funções de Excel/planilhas, a menos que o usuário peça explicitamente sobre planilhas.
2. CORREÇÃO DE PREMISSAS COM DEDUÇÃO: Se a pergunta contiver uma premissa tecnicamente inexata (ex: perguntar o "sobrenome" de uma figura da Antiguidade que não usava sobrenomes modernos), NUNCA responda "Não tenho informações" ou "Forneça mais contexto". Em vez disso, explique por que a premissa não se aplica e entregue o dado histórico/conceitual equivalente (como o nome de nascimento, nome de trono ou epíteto dinástico).
3. PRECISÃO EM EXATAS: Ao fornecer fórmulas matemáticas, físicas ou químicas, escreva a equação completa de forma clara (usando LaTeX ou notação legível) e defina brevemente o que cada variável representa.
4. CONCISÃO INTELIGENTE: Seja direto, denso e sem cumprimentos robóticos repetitivos, mas nunca sacrifique a precisão da resposta para economizar palavras.`;

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
 * Higieniza, remove loops de repetição/preâmbulos verborrágicos e aplica limite inteligente de até 1500 caracteres.
 */
export function enforceCharLimit(rawText, maxChars = MAX_COPILOT_CHARS) {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    // Remove caracteres tailandeses/corrompidos fora do alfabeto ocidental
    .replace(/[\u0E00-\u0E7F]+/g, '')
    // Remove preâmbulos verborrágicos típicos da LLM
    .replace(/^Como assistente de estudos[^.\n]*\.\s*/i, '')
    .replace(/^A pergunta\s+["“][^"”]+["”]\s+refere-se[^.\n]*\.\s*/i, '')
    .replace(/\*\*Resposta Factual:\*\*\s*/gi, '')
    // Remove completamente caudas de repetição degenerada (3+ repetições seguidas)
    .replace(/(?:,\s*|\s+)?(\b\S{1,15})(?:\s+\1){2,}[\s\S]*$/gi, '')
    .replace(/(.{3,15})\1{2,}[\s\S]*$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[,;:\-\s]+$/, '')
    .trim();

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const slice = cleaned.slice(0, maxChars);

  // Tenta encerrar no último ponto final (. ! ?) dentro de uma faixa natural
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.endsWith('.') || slice.endsWith('!') || slice.endsWith('?') ? slice.length - 1 : -1
  );

  if (lastSentenceEnd >= 70) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  // Caso contrário, corta na última palavra inteira antes de maxChars - 1 e fecha com ponto
  const lastSpace = slice.slice(0, maxChars - 1).lastIndexOf(' ');
  if (lastSpace > 40) {
    const wordCut = slice.slice(0, lastSpace).replace(/[,;:\-\s]+$/, '').trim();
    return /[.!?]$/.test(wordCut) ? wordCut : `${wordCut}.`;
  }

  return `${slice.slice(0, maxChars - 1).trim()}.`;
}

/**
 * Busca as configurações personalizadas do usuário
 */
export function getAIConfig() {
  const defaultLanguage = localStorage.getItem('nexomente_ai_language') || 'Português Brasileiro';
  let sysPrompt =
    localStorage.getItem('nexomente_ai_system_prompt') ||
    DEFAULT_COPILOT_SYSTEM_PROMPT;

  sysPrompt += `\n\n[REGRA ESTRITA]: Responda exclusivamente em ${defaultLanguage}, sem preâmbulos redundantes ("Como assistente..."), em até ${MAX_COPILOT_CHARS} caracteres mantendo total rigor técnico.`;

  return {
    temperature: parseFloat(localStorage.getItem('nexomente_ai_temp')) || 0.35,
    top_p: 0.90,
    min_p: 0.05,
    repeat_penalty: 1.10,
    max_tokens: parseInt(localStorage.getItem('nexomente_ai_max_tokens')) || 800,
    system_prompt: sysPrompt,
    language: defaultLanguage,
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
  const startPerf = performance.now();
  const globalConfig = getAIConfig();
  const providerKey = getActiveProvider();
  const currentProvider = providers[providerKey] || embedded;

  const isStructuredJson = Boolean(options.jsonSchema || options.skipCharLimit);
  const maxChars = isStructuredJson ? 0 : (options.maxChars ?? MAX_COPILOT_CHARS);

  const finalOptions = {
    temperature: options.temperature ?? globalConfig.temperature,
    top_p: options.top_p ?? globalConfig.top_p,
    min_p: options.min_p ?? globalConfig.min_p,
    repeat_penalty: options.repeat_penalty ?? globalConfig.repeat_penalty,
    max_tokens: isStructuredJson ? (options.max_tokens || 800) : (options.max_tokens || globalConfig.max_tokens || 800),
    maxChars: maxChars || undefined,
    ...options,
  };

  const finalMessages = [...messages];
  if (!messages.find((m) => m.role === 'system')) {
    finalMessages.unshift({ role: 'system', content: globalConfig.system_prompt });
  }

  const result = await currentProvider.chat(finalMessages, finalOptions);
  const elapsedMs = Math.round(performance.now() - startPerf);

  if (result.success) {
    let rawText = result.response || result.content || '';
    if (!isStructuredJson && maxChars > 0) {
      rawText = enforceCharLimit(rawText, maxChars);
    }
    result.response = rawText;
    result.content = rawText;
    result.durationMs = result.durationMs || elapsedMs;
  } else {
    result.durationMs = elapsedMs;
  }

  return result;
}

export const aiChat = chat;

export async function generate(prompt, options = {}) {
  const messages = [{ role: 'user', content: prompt }];
  const result = await chat(messages, { ...options, skipCharLimit: options.skipCharLimit ?? true });

  if (
    !result.success &&
    (result.error?.includes('Falha na conexão') ||
      result.error?.includes('Exceeded') ||
      result.error?.includes('fetch') ||
      result.error?.includes('not a function'))
  ) {
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

export async function askAI(pergunta, contexto = '', options = {}) {
  const prompt = contexto
    ? `[Contexto: ${contexto}]\n${pergunta}`
    : pergunta;

  const res = await chat([{ role: 'user', content: prompt }], {
    max_tokens: 800,
    maxChars: MAX_COPILOT_CHARS,
    temperature: 0.35,
    top_p: 0.90,
    min_p: 0.05,
    repeat_penalty: 1.10,
    ...options,
  });

  const finalAnswer = enforceCharLimit(res.response || res.content || 'Sem resposta do modelo.', MAX_COPILOT_CHARS);

  if (options.withMetrics) {
    return {
      text: finalAnswer,
      durationMs: res.durationMs || 0,
      charCount: finalAnswer.length,
    };
  }

  return finalAnswer;
}
