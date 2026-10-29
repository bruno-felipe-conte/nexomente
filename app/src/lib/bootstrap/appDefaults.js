/**
 * Módulo puro para inicialização e aplicação de defaults de configuração da aplicação.
 * Desacopla as responsabilidades de bootstrap do componente de visualização App.jsx.
 */
import { DEFAULT_COPILOT_SYSTEM_PROMPT } from "../ai/aiProvider.js";

export const APP_DEFAULTS = {
  nexomente_ai_provider: "embedded",
  nexomente_ai_language: "Português Brasileiro",
  nexomente_tema: "dark",
  nexomente_ai_temp: "0.35",
  nexomente_ai_max_tokens: "800",
  nexomente_embedded_path: "./electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf",
  nexomente_ai_system_prompt: DEFAULT_COPILOT_SYSTEM_PROMPT,
};

export function initAppDefaults() {
  if (typeof window === "undefined") return;

  Object.entries(APP_DEFAULTS).forEach(([key, val]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, val);
    }
  });

  // Sobrescreve prompt legado ou genérico que prejudica dedução matemática
  const existingPrompt = localStorage.getItem("nexomente_ai_system_prompt");
  if (
    !existingPrompt ||
    existingPrompt.includes("alto desempenho") ||
    existingPrompt.includes("em no máximo 2 frases curtas") ||
    !existingPrompt.includes("ANCORAGEM E CORREÇÃO FONÉTICA")
  ) {
    localStorage.setItem("nexomente_ai_system_prompt", DEFAULT_COPILOT_SYSTEM_PROMPT);
  }

  // Garante temperatura de 0.35 se estivesse no default antigo de 0.7
  const currentTemp = localStorage.getItem("nexomente_ai_temp");
  if (!currentTemp || currentTemp === "0.7" || currentTemp === "0.45") {
    localStorage.setItem("nexomente_ai_temp", "0.35");
  }

  // Atualiza caminhos legados para o modelo padrão Gemma 4
  const currentEmbeddedPath = localStorage.getItem("nexomente_embedded_path");
  if (
    currentEmbeddedPath === "./electron/models/llama-3-8b-instruct.gguf" ||
    currentEmbeddedPath === "./electron/models/llama-3.2-1b.gguf" ||
    currentEmbeddedPath?.includes(".lmstudio")
  ) {
    localStorage.setItem(
      "nexomente_embedded_path",
      APP_DEFAULTS.nexomente_embedded_path
    );
  }

  // Aplica tema
  const savedTema = localStorage.getItem("nexomente_tema") || "dark";
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(savedTema);
}
