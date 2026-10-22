/**
 * embeddedService.js — Provedor de IA embutido usando node-llama-cpp.
 * Carrega modelos GGUF locais diretamente no processo do Electron ou via bridge local do Vite.
 */

export const DEFAULT_EMBEDDED_MODEL_PATH = "./electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf";

export const getModelPath = () => {
  const saved = localStorage.getItem("nexomente_embedded_path");
  if (
    !saved ||
    saved.includes("llama-3-8b") ||
    saved.includes("llama-3.2-1b") ||
    saved.includes(".lmstudio")
  ) {
    return DEFAULT_EMBEDDED_MODEL_PATH;
  }
  return saved;
};

function extractErrorMessage(res) {
  if (!res?.error) return "O motor interno de IA não respondeu.";
  // Novo formato canônico: { error: { code, message, details?, stack? } }
  if (typeof res.error === "object" && res.error.message) {
    return res.error.message;
  }
  // Formato legado: error é string
  return String(res.error);
}

function extractErrorCode(res) {
  if (!res?.error) return "ERR-AI-500";
  // Novo formato canônico
  if (typeof res.error === "object" && res.error.code) {
    return res.error.code;
  }
  // Formato legado
  return res.code || "ERR-AI-500";
}

export async function chat(messages, options = {}) {
  const modelPath = options.modelPath || getModelPath();

  const payload = {
    modelPath,
    messages,
    options: {
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 512,
      reasoning: Boolean(options.reasoning),
      jsonSchema: options.jsonSchema || undefined,
    }
  };

  try {
    let res;
    if (window.electronAPI?.embeddedChat) {
      res = await window.electronAPI.embeddedChat(payload);
    } else {
      const httpRes = await fetch("/api/embedded/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      res = await httpRes.json();
    }

    if (!res || !res.success) {
      return {
        success: false,
        error: extractErrorMessage(res),
        code: extractErrorCode(res)
      };
    }

    return {
      success: true,
      content: res.response,
      response: res.response,
      modelName: res.modelName,
      role: "assistant"
    };
  } catch (error) {
    console.error("Embedded AI Error:", error);
    return {
      success: false,
      code: "ERR-IPC-500",
      error: `Erro de conexão com o motor interno: ${error.message}`
    };
  }
}

export async function checkStatus() {
  if (window.electronAPI?.embeddedChat) {
    return { status: "online", models: ["gemma-4-E2B-it (Motor Interno)"] };
  }
  try {
    const res = await fetch("/api/embedded/status");
    if (res.ok) {
      const data = await res.json();
      return {
        status: data.status || "online",
        models: data.models || ["gemma-4-E2B-it (Motor Interno)"],
        modelPath: data.modelPath,
        downloadingPartDetected: data.downloadingPartDetected,
      };
    }
  } catch {
    // ignore
  }
  return { status: "online", models: ["gemma-4-E2B-it (Motor Interno)"] };
}

