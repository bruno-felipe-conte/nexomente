/**
 * Provedor HTTP local compatível com OpenAI (LM Studio / Ollama / LocalAI)
 */

export const httpProvider = {
  name: 'http',
  defaultBaseUrl: 'http://localhost:1234/v1',

  getBaseUrl() {
    return localStorage.getItem('nexomente_ai_http_url') || this.defaultBaseUrl;
  },

  async checkStatus() {
    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = Array.isArray(data.data) ? data.data.map(m => m.id) : ['default'];
      return {
        available: true,
        provider: 'http',
        models,
        currentModel: models[0] || 'default',
      };
    } catch (e) {
      return {
        available: false,
        provider: 'http',
        error: e.message,
        models: [],
      };
    }
  },

  async chat(messages, options = {}) {
    const baseUrl = this.getBaseUrl();
    const model = options.model || localStorage.getItem('nexomente_ai_http_model') || 'local-model';

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 512,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        throw new Error(`Servidor HTTP retornou erro ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        response: reply,
        content: reply,
        modelName: model,
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        isProviderError: true,
      };
    }
  },
};
