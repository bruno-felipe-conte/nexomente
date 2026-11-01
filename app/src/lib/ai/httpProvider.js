/**
 * Provedor HTTP local e remoto compatível com OpenAI (LM Studio / Ollama / OpenRouter / Groq / OpenAI)
 */

export const httpProvider = {
  name: 'http',
  defaultBaseUrl: 'http://localhost:1234/v1',

  _normalizeBaseUrl(rawUrl) {
    let url = (rawUrl || this.getBaseUrl() || '').trim().replace(/\/+$/, '');
    if (url.includes('generativelanguage.googleapis.com')) {
      if (!url.includes('/openai')) {
        if (url.endsWith('/v1beta')) {
          url = `${url}/openai`;
        } else if (url.endsWith('googleapis.com')) {
          url = `${url}/v1beta/openai`;
        } else {
          url = `${url}/openai`;
        }
      }
    }
    return url;
  },

  getBaseUrl() {
    const raw = localStorage.getItem('nexomente_ai_http_url') || this.defaultBaseUrl;
    return this._normalizeBaseUrl(raw);
  },

  getApiKey() {
    return localStorage.getItem('nexomente_ai_http_api_key') || '';
  },

  _buildHeaders(customApiKey, baseUrl) {
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = customApiKey !== undefined ? customApiKey : this.getApiKey();
    const targetUrl = (baseUrl || this.getBaseUrl() || '').toLowerCase();

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      if (targetUrl.includes('generativelanguage.googleapis.com')) {
        headers['x-goog-api-key'] = apiKey;
      }
    }
    if (targetUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = 'https://nexomente.app';
      headers['X-Title'] = 'NexoMente';
    }
    return headers;
  },

  async checkStatus() {
    try {
      const baseUrl = this.getBaseUrl();
      const headers = this._buildHeaders(undefined, baseUrl);

      const res = await fetch(`${baseUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return {
          status: 'offline',
          available: false,
          provider: 'http',
          error: `HTTP ${res.status}`,
          statusCode: res.status,
          models: [],
        };
      }

      const data = await res.json();
      const models = Array.isArray(data?.data)
        ? data.data.map((m) => m.id.replace(/^models\//, ''))
        : ['default'];
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
        error: e.name === 'TimeoutError' ? 'Tempo limite esgotado (timeout)' : (e.message || 'Falha de conexão'),
        models: [],
      };
    }
  },

  async chat(messages, options = {}) {
    const baseUrl = this.getBaseUrl();
    const rawModel = options.model || localStorage.getItem('nexomente_ai_http_model') || 'local-model';
    const model = rawModel.replace(/^models\//, '');
    const headers = this._buildHeaders(options.apiKey, baseUrl);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
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
        signal: AbortSignal.timeout(options.timeout || 30000),
      });

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errorDetail = `${errorDetail}: ${errJson.error.message}`;
          }
        } catch (_) {
          // Mantém errorDetail com status
        }
        return {
          success: false,
          error: errorDetail,
          statusCode: res.status,
          isProviderError: true,
        };
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
        error: e.name === 'TimeoutError' ? 'Tempo limite esgotado (timeout)' : (e.message || 'Falha na conexão HTTP'),
        isProviderError: true,
      };
    }
  },
};
