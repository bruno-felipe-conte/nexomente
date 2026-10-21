/**
 * Módulo puro para inicialização e aplicação de defaults de configuração da aplicação.
 * Desacopla as responsabilidades de bootstrap do componente de visualização App.jsx.
 */

export const APP_DEFAULTS = {
  nexomente_ai_provider: "embedded",
  nexomente_ai_language: "Português Brasileiro",
  nexomente_tema: "dark",
  nexomente_ai_temp: "0.7",
  nexomente_ai_max_tokens: "1024",
  nexomente_embedded_path: "./electron/models/gemma-4-E2B-it-GGUF/gemma-4-E2B-it-Q4_K_M.gguf",
  nexomente_ai_system_prompt: "Você é o NexoMente, um assistente de estudos de alto desempenho. Responda de forma lógica, profunda e estruturada.",
};

export function initAppDefaults() {
  if (typeof window === "undefined") return;

  Object.entries(APP_DEFAULTS).forEach(([key, val]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, val);
    }
  });

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
