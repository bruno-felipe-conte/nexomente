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
        status: 'online',
        available: true,
        provider: 'http',
        models,
        currentModel: models[0] || 'default',
      };
    } catch (e) {
      return {
        status: 'offline',
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
          temperature: options.temperature ?? 0.35,
          top_p: options.top_p ?? 0.90,
          min_p: options.min_p ?? 0.05,
          repeat_penalty: options.repeat_penalty ?? 1.10,
          max_tokens: options.max_tokens ?? 800,
          num_predict: options.num_predict ?? 800,
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
