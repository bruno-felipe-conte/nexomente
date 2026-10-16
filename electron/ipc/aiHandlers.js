import electronPkg from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectHardware } from '../ai/hardwareDetector.js';
import diagnostics from '../ai/diagnostics.js';
import { SmartContextManager } from '../ai/SmartContextManager.js';

const { ipcMain, app } = electronPkg || {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

let llamaInstance = null;
let modelInstance = null;
let contextInstance = null;
let persistentSequence = null;
let smartContext = null;
let currentModelPath = null;
let cachedHardware = null;
let cachedChatWrapper = null;
let warmupPromise = null;

export const DEFAULT_GEMMA_DIR = path.join(__dirname, '..', 'models', 'gemma-4-E2B-it-GGUF');
export const DEFAULT_GEMMA_FILE = path.join(DEFAULT_GEMMA_DIR, 'gemma-4-E2B-it-Q4_K_M.gguf');

/**
 * Verifica se um arquivo é um modelo de texto GGUF válido (ignorando mmproj de visão e downloads incompletos .part)
 */
function isValidTextGguf(filename) {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.gguf') &&
    !lower.startsWith('mmproj-') &&
    !lower.includes('mmproj') &&
    !lower.startsWith('downloading_') &&
    !lower.endsWith('.part')
  );
}

/**
 * Resolve um caminho de arquivo ou pasta para o arquivo .gguf principal de linguagem,
 * priorizando a pasta própria dentro do projeto (electron/models/gemma-4-E2B-it-GGUF).
 */
export function resolveEmbeddedModelPath(requestedPath) {
  const internalModelsDir = app?.isPackaged
    ? path.join(process.resourcesPath, 'models')
    : path.join(__dirname, '..', 'models');

  const candidatePaths = [
    requestedPath,
    path.join(internalModelsDir, 'gemma-4-E2B-it-GGUF', 'gemma-4-E2B-it-Q4_K_M.gguf'),
    path.join(internalModelsDir, 'gemma-4-E2B-it-GGUF'),
    DEFAULT_GEMMA_FILE,
    DEFAULT_GEMMA_DIR,
    internalModelsDir,
  ].filter(Boolean);

  let downloadingPartDetected = null;

  for (const rawCandidate of candidatePaths) {
    const resolved = path.isAbsolute(rawCandidate)
      ? rawCandidate
      : path.resolve(process.cwd(), rawCandidate);

    if (!fs.existsSync(resolved)) continue;

    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
      const base = path.basename(resolved);
      if (isValidTextGguf(base)) {
        return { modelPath: resolved, modelName: base, downloadingPartDetected };
      }
      if (base.endsWith('.part') || base.startsWith('downloading_')) {
        downloadingPartDetected = resolved;
      }
    } else if (stat.isDirectory()) {
      const files = fs.readdirSync(resolved);
      const partFile = files.find(f => f.endsWith('.part') || f.startsWith('downloading_'));
      if (partFile && !downloadingPartDetected) {
        downloadingPartDetected = path.join(resolved, partFile);
      }
      const validGguf = files.find(isValidTextGguf);
      if (validGguf) {
        const full = path.join(resolved, validGguf);
        return { modelPath: full, modelName: validGguf, downloadingPartDetected };
      }
    }
  }

  return { modelPath: null, modelName: null, downloadingPartDetected };
}

/**
 * Carrega e mantém aquecido em VRAM (GPU) o modelo interno para que as mensagens respondam em ~200-500ms.
 */
export async function ensureEmbeddedEngineReady(requestedModelPath) {
  const { getLlama, LlamaChatSession, Gemma4ChatWrapper, resolveChatWrapper } = await import('node-llama-cpp');

  if (!llamaInstance) {
    console.log('[AI ENGINE] Inicializando instancia Llama (GPU auto)...');
    llamaInstance = await getLlama({
      gpu: 'auto',
      debug: false,
    });
    console.log(`[AI ENGINE] Instancia Llama pronta (Backend GPU: ${llamaInstance.gpu || 'CPU'}).`);
  }

  const resolvedInfo = resolveEmbeddedModelPath(requestedModelPath);
  const finalModelPath = resolvedInfo.modelPath;

  if (!finalModelPath || !fs.existsSync(finalModelPath)) {
    const partMsg = resolvedInfo.downloadingPartDetected
      ? ` O arquivo "${path.basename(resolvedInfo.downloadingPartDetected)}" ainda está incompleto (.part).`
      : '';
    throw new Error(`Modelo GGUF não encontrado para o caminho "${requestedModelPath || DEFAULT_GEMMA_DIR}".${partMsg}`);
  }

  if (!modelInstance || currentModelPath !== finalModelPath) {
    console.log('[AI ENGINE] Carregando modelo em VRAM:', finalModelPath);

    if (persistentSequence) {
      try { persistentSequence.dispose?.(); } catch { /* ignore */ }
      persistentSequence = null;
    }
    if (contextInstance) {
      try { await contextInstance.dispose?.(); } catch { /* ignore */ }
      contextInstance = null;
    }
    if (modelInstance) {
      try { await modelInstance.dispose?.(); } catch { /* ignore */ }
      modelInstance = null;
    }

    try {
      modelInstance = await llamaInstance.loadModel({
        modelPath: finalModelPath,
        gpuLayers: 'auto',
        useMmap: true,
      });
    } catch (gpuError) {
      console.warn('[AI ENGINE] Fallback para modo CPU/Compatibilidade:', gpuError.message);
      modelInstance = await llamaInstance.loadModel({
        modelPath: finalModelPath,
        gpuLayers: 0,
        useMmap: false,
      });
    }

    currentModelPath = finalModelPath;
    console.log(`[AI ENGINE] Modelo carregado (${resolvedInfo.modelName}) | Camadas em GPU: ${modelInstance.gpuLayers}`);

    if (!cachedHardware) {
      cachedHardware = await detectHardware();
    }
    diagnostics.snapshot('before-context');

    const contextConfig = {
      contextSize: 4096,
      batchSize: 512,
      threads: Math.max(4, Math.floor(cachedHardware.cpuCores * 0.75)),
    };

    contextInstance = await modelInstance.createContext(contextConfig);
    persistentSequence = contextInstance.getSequence();
    smartContext = new SmartContextManager(contextInstance, cachedHardware);

    // Desativa o canal invisível <|think|> por padrão no Gemma 4 para respostas até 60x mais rápidas (~200ms)
    const isGemma4 = resolvedInfo.modelName.toLowerCase().includes('gemma-4') ||
                     modelInstance.fileInfo?.metadata?.general?.architecture === 'gemma4';
    cachedChatWrapper = isGemma4
      ? new Gemma4ChatWrapper({ reasoning: false })
      : resolveChatWrapper(modelInstance);

    // Executa micro-prompt de 1 token para aquecer os shaders Vulkan/GPU na inicialização
    try {
      const warmupSession = new LlamaChatSession({
        contextSequence: persistentSequence,
        chatWrapper: cachedChatWrapper,
      });
      await warmupSession.prompt('Oi', { maxTokens: 2 });
      if (persistentSequence.nextTokenIndex > 0) {
        await persistentSequence.eraseContextTokenRanges([{ start: 0, end: persistentSequence.nextTokenIndex }]);
      }
      console.log('[AI ENGINE] Shaders GPU aquecidos e prontos para resposta instantânea.');
    } catch (warmErr) {
      console.warn('[AI ENGINE] Aviso no aquecimento de shaders:', warmErr.message);
    }

    diagnostics.snapshot('after-context');
  }

  return { resolvedInfo, finalModelPath };
}

/**
 * Dispara o pré-carregamento em background sem bloquear a inicialização.
 */
export function warmupEmbeddedModel(requestedModelPath) {
  if (!warmupPromise) {
    warmupPromise = ensureEmbeddedEngineReady(requestedModelPath).catch(err => {
      console.warn('[AI ENGINE] Warmup em background falhou:', err.message);
      warmupPromise = null;
    });
  }
  return warmupPromise;
}

export async function runEmbeddedInference({ modelPath, messages = [], options = {} }) {
  try {
    const { LlamaChatSession, Gemma4ChatWrapper } = await import('node-llama-cpp');

    if (warmupPromise) {
      await warmupPromise;
      warmupPromise = null;
    }

    await ensureEmbeddedEngineReady(modelPath);

    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    const lastMessageObj = userMessages[userMessages.length - 1] || messages[messages.length - 1] || {};
    const lastMessage = lastMessageObj.content || lastMessageObj.texto || '';

    await smartContext.addMessage('user', lastMessage);

    if (!persistentSequence || persistentSequence.disposed) {
      persistentSequence = contextInstance.getSequence();
    } else if (persistentSequence.nextTokenIndex > 0) {
      await persistentSequence.eraseContextTokenRanges([
        { start: 0, end: persistentSequence.nextTokenIndex }
      ]);
    }

    const useReasoning = Boolean(options.reasoning);
    const activeWrapper = useReasoning
      ? new Gemma4ChatWrapper({ reasoning: true })
      : cachedChatWrapper;

    const session = new LlamaChatSession({
      contextSequence: persistentSequence,
      chatWrapper: activeWrapper,
      systemPrompt: systemMsg?.content || undefined,
    });

    const maxTokens = Number(options.max_tokens) || 512;

    const meta = await session.promptWithMeta(lastMessage, {
      maxTokens,
      temperature: Number(options.temperature) || 0.7,
    });
    let response = (meta?.responseText || '').trim();
    if (!response && Array.isArray(meta?.response)) {
      response = meta.response
        .map(seg => (typeof seg === 'string' ? seg : seg?.text || ''))
        .join('\n')
        .trim();
    }

    await smartContext.addMessage('assistant', response);

    return {
      success: true,
      response,
      modelName: path.basename(currentModelPath),
      modelPath: currentModelPath,
    };
  } catch (error) {
    console.error('[AI ENGINE] ERRO CRITICO:', error);

    let errorCode = 'ERR-AI-500';
    if (error.message.includes('not found') || error.message.includes('não encontrado')) errorCode = 'ERR-AI-001';
    if (error.message.includes('VRAM') || error.message.includes('out of memory')) errorCode = 'ERR-AI-002';
    if (error.message.includes('Failed to load model')) errorCode = 'ERR-AI-003';
    if (error.message.includes('context size')) errorCode = 'ERR-AI-004';
    if (error.message.includes('permission denied')) errorCode = 'ERR-SYS-001';

    return {
      success: false,
      error: error.message,
      code: errorCode,
      details: `Consulte o manual para o codigo ${errorCode}`,
      stack: isDev ? error.stack : undefined
    };
  }
}

export function registerAiHandlers() {
  // Pré-aquece o modelo Gemma 4 em VRAM assim que o Electron inicia
  setTimeout(() => {
    warmupEmbeddedModel();
  }, 1500);

  // Gemini Proxy
  ipcMain.handle('ai:geminiChat', async (event, { url, body }) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Embedded LLM (node-llama-cpp)
  ipcMain.handle('ai:embeddedChat', async (event, payload) => {
    return runEmbeddedInference(payload || {});
  });

  // Info de hardware (usa cache para evitar spawn de PowerShell lento)
  ipcMain.handle('ai:getHardwareInfo', async () => {
    try {
      if (!cachedHardware) {
        cachedHardware = await detectHardware();
      }
      return cachedHardware;
    } catch (error) {
      return { error: error.message };
    }
  });

  // Estatisticas de contexto
  ipcMain.handle('ai:getContextStats', async () => {
    if (!smartContext) return { activeTokens: 0, maxTokens: 4096 };
    return {
      activeTokens: smartContext.getTotalActiveTokens(),
      maxTokens: smartContext.maxActiveTokens
    };
  });
}
