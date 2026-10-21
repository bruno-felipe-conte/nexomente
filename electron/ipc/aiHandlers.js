import electronPkg from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { detectHardware } from "../ai/hardwareDetector.js";
import diagnostics from "../ai/diagnostics.js";
import { SmartContextManager } from "../ai/SmartContextManager.js";

const { ipcMain, app } = electronPkg || {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === "development";

let llamaInstance = null;
let modelInstance = null;
let contextInstance = null;
let persistentSequence = null;
let smartContext = null;
let currentModelPath = null;
let cachedHardware = null;
let cachedChatWrapper = null;
let warmupPromise = null;

export const DEFAULT_GEMMA_DIR = path.join(__dirname, "..", "models", "gemma-4-E2B-it-GGUF");
export const DEFAULT_GEMMA_FILE = path.join(DEFAULT_GEMMA_DIR, "gemma-4-E2B-it-Q4_K_M.gguf");

/**
 * Token Bucket Rate Limiter para ai:embeddedChat
 * Permite até 3 requisições por segundo com burst de 5
 */
class RateLimiter {
  constructor({ maxTokens = 5, refillRate = 3 } = {}) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate; // tokens por segundo
    this.buckets = new Map(); // key -> { tokens, lastRefill }
  }

  _refill(bucket) {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // segundos
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate);
    bucket.lastRefill = now;
  }

  tryConsume(key, cost = 1) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { tokens: this.maxTokens, lastRefill: Date.now() });
    }
    const bucket = this.buckets.get(key);
    this._refill(bucket);
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }
    return { allowed: false, remaining: Math.floor(bucket.tokens), retryAfterMs: Math.ceil((cost - bucket.tokens) / this.refillRate * 1000) };
  }

  // Limpeza periódica de buckets inativos
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 60000) { // 1 minuto sem uso
        this.buckets.delete(key);
      }
    }
  }
}

const rateLimiter = new RateLimiter({ maxTokens: 5, refillRate: 3 });
// Limpeza a cada 30 segundos
setInterval(() => rateLimiter.cleanup(), 30000);

function isValidTextGguf(filename) {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".gguf") &&
    !lower.startsWith("mmproj-") &&
    !lower.includes("mmproj") &&
    !lower.startsWith("downloading_") &&
    !lower.endsWith(".part")
  );
}

export function resolveEmbeddedModelPath(requestedPath) {
  const internalModelsDir = app?.isPackaged
    ? path.join(process.resourcesPath, "models")
    : path.join(__dirname, "..", "models");

  const candidatePaths = [
    requestedPath,
    path.join(internalModelsDir, "gemma-4-E2B-it-GGUF", "gemma-4-E2B-it-Q4_K_M.gguf"),
    path.join(internalModelsDir, "gemma-4-E2B-it-GGUF"),
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
      if (base.endsWith(".part") || base.startsWith("downloading_")) {
        downloadingPartDetected = resolved;
      }
    } else if (stat.isDirectory()) {
      const files = fs.readdirSync(resolved);
      const partFile = files.find((f) => f.endsWith(".part") || f.startsWith("downloading_"));
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

export async function ensureEmbeddedEngineReady(requestedModelPath) {
  const { getLlama, LlamaChatSession, Gemma4ChatWrapper, resolveChatWrapper } = await import("node-llama-cpp");

  if (!llamaInstance) {
    console.log("[AI ENGINE] Inicializando instancia Llama (GPU auto)...");
    llamaInstance = await getLlama({
      gpu: "auto",
      debug: false,
    });
    console.log(`[AI ENGINE] Instancia Llama pronta (Backend GPU: ${llamaInstance.gpu || "CPU"}).`);
  }

  const resolvedInfo = resolveEmbeddedModelPath(requestedModelPath);
  const finalModelPath = resolvedInfo.modelPath;

  if (!finalModelPath || !fs.existsSync(finalModelPath)) {
    const partMsg = resolvedInfo.downloadingPartDetected
      ? ` O arquivo "${path.basename(resolvedInfo.downloadingPartDetected)}" ainda está incompleto (.part).`
      : "";
    throw new Error(`Modelo GGUF não encontrado para o caminho "${requestedModelPath || DEFAULT_GEMMA_DIR}".${partMsg}`);
  }

  if (!modelInstance || currentModelPath !== finalModelPath) {
    console.log("[AI ENGINE] Carregando modelo em VRAM:", finalModelPath);

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
        gpuLayers: "auto",
        useMmap: true,
      });
    } catch (gpuError) {
      console.warn("[AI ENGINE] Fallback para modo CPU/Compatibilidade:", gpuError.message);
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
    diagnostics.snapshot("before-context");

    const contextConfig = {
      contextSize: 8192,
      batchSize: 512,
      threads: Math.max(4, Math.floor(cachedHardware.cpuCores * 0.75)),
    };

    contextInstance = await modelInstance.createContext(contextConfig);
    persistentSequence = contextInstance.getSequence();
    smartContext = new SmartContextManager(contextInstance, cachedHardware);

    const isGemma4 = resolvedInfo.modelName.toLowerCase().includes("gemma-4") ||
      modelInstance.fileInfo?.metadata?.general?.architecture === "gemma4";
    cachedChatWrapper = isGemma4
      ? new Gemma4ChatWrapper({ reasoning: false })
      : resolveChatWrapper(modelInstance);

    try {
      const warmupSession = new LlamaChatSession({
        contextSequence: persistentSequence,
        chatWrapper: cachedChatWrapper,
      });
      await warmupSession.prompt("Oi", { maxTokens: 2 });
      if (persistentSequence.nextTokenIndex > 0) {
        await persistentSequence.eraseContextTokenRanges([{ start: 0, end: persistentSequence.nextTokenIndex }]);
      }
      console.log("[AI ENGINE] Shaders GPU aquecidos e prontos para resposta instantânea.");
    } catch (warmErr) {
      console.warn("[AI ENGINE] Aviso no aquecimento de shaders:", warmErr.message);
    }

    diagnostics.snapshot("after-context");
  }

  return { resolvedInfo, finalModelPath };
}

export function warmupEmbeddedModel(requestedModelPath) {
  if (!warmupPromise) {
    warmupPromise = ensureEmbeddedEngineReady(requestedModelPath).catch((err) => {
      console.warn("[AI ENGINE] Warmup em background falhou:", err.message);
      warmupPromise = null;
    });
  }
  return warmupPromise;
}

export async function runEmbeddedInference({ modelPath, messages = [], options = {} }) {
  try {
    const { LlamaChatSession, Gemma4ChatWrapper } = await import("node-llama-cpp");

    if (warmupPromise) {
      await warmupPromise;
      warmupPromise = null;
    }

    await ensureEmbeddedEngineReady(modelPath);

    const systemMsg = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");
    const lastMessageObj = userMessages[userMessages.length - 1] || messages[messages.length - 1] || {};
    const lastMessage = lastMessageObj.content || lastMessageObj.texto || "";

    await smartContext.addMessage("user", lastMessage);

    if (!persistentSequence || persistentSequence.disposed) {
      persistentSequence = contextInstance.getSequence();
    } else if (persistentSequence.nextTokenIndex > 0) {
      await persistentSequence.eraseContextTokenRanges([
        { start: 0, end: persistentSequence.nextTokenIndex },
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
    const promptOptions = {
      maxTokens,
      temperature: Number(options.temperature) || 0.7,
    };

    if (options.jsonSchema && llamaInstance) {
      try {
        promptOptions.grammar = await llamaInstance.createGrammarForJsonSchema(options.jsonSchema);
      } catch (grammarErr) {
        console.warn("[AI ENGINE] Falha ao compilar JSON Grammar, seguindo sem grammar:", grammarErr.message);
      }
    }

    // C8: Timeout configurável com AbortSignal (default 30s)
    const timeoutMs = Number(options.timeoutMs || process.env.AI_INFERENCE_TIMEOUT_MS) || 30000;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort(new Error("Timeout: modelo não respondeu no tempo limite de " + (timeoutMs / 1000) + "s"));
    }, timeoutMs);

    let meta;
    try {
      meta = await session.promptWithMeta(lastMessage, {
        ...promptOptions,
        signal: abortController.signal,
        onTextChunk: options.onChunk
          ? (chunk) => options.onChunk(chunk)
          : undefined,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
    let response = (meta?.responseText || "").trim();
    if (!response && Array.isArray(meta?.response)) {
      response = meta.response
        .map((seg) => (typeof seg === "string" ? seg : seg?.text || ""))
        .join("\n")
        .trim();
    }

    await smartContext.addMessage("assistant", response);

    return {
      success: true,
      response,
      modelName: path.basename(currentModelPath),
      modelPath: currentModelPath,
    };
  } catch (error) {
    console.error("[AI ENGINE] ERRO CRITICO:", error);

    let errorCode = "ERR-AI-500";
    if (error.message.includes("not found") || error.message.includes("não encontrado")) errorCode = "ERR-AI-001";
    if (error.message.includes("VRAM") || error.message.includes("out of memory")) errorCode = "ERR-AI-002";
    if (error.message.includes("Failed to load model")) errorCode = "ERR-AI-003";
    if (error.message.includes("context size")) errorCode = "ERR-AI-004";
    if (error.message.includes("permission denied")) errorCode = "ERR-SYS-001";

    return {
      success: false,
      error: error.message,
      code: errorCode,
      details: `Consulte o manual para o codigo ${errorCode}`,
      stack: isDev ? error.stack : undefined,
    };
  }
}

export function registerAiHandlers() {
  setTimeout(() => {
    warmupEmbeddedModel();
  }, 1500);

  // Embedded LLM (node-llama-cpp) com Rate Limiting e Streaming
  ipcMain.handle("ai:embeddedChat", async (event, payload) => {
    // Rate limit por session (senderFrameId) ou IP se disponível
    const key = event.senderFrameId || "default";
    const rateLimit = rateLimiter.tryConsume(key);
    if (!rateLimit.allowed) {
      console.warn(`[AI RATE LIMIT] Bloqueado: ${key}, retry after ${rateLimit.retryAfterMs}ms`);
      return {
        success: false,
        error: "Rate limit excedido. Aguarde um momento antes de tentar novamente.",
        code: "ERR-AI-429",
        details: `Tente novamente em ${Math.ceil(rateLimit.retryAfterMs / 1000)}s`,
        retryAfterMs: rateLimit.retryAfterMs,
      };
    }

    const streamChannel = payload?.options?.streamChannel;
    if (streamChannel && event.sender) {
      payload.options.onChunk = (chunk) => {
        event.sender.send(streamChannel, { chunk });
      };
    }

    return runEmbeddedInference(payload || {});
  });

  ipcMain.handle("ai:getHardwareInfo", async () => {
    try {
      if (!cachedHardware) {
        cachedHardware = await detectHardware();
      }
      return cachedHardware;
    } catch (error) {
      return { error: error.message };
    }
  });

  ipcMain.handle("ai:getContextStats", async () => {
    if (!smartContext) return { activeTokens: 0, maxTokens: 4096 };
    return {
      activeTokens: smartContext.getTotalActiveTokens(),
      maxTokens: smartContext.maxActiveTokens,
    };
  });
}
