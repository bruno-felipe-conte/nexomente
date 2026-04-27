/**
 * geminiService.js — Provedor de IA via Google Gemini API.
 * Fallback em nuvem para quando o processamento local não for possível.
 */

const getApiKey = () => localStorage.getItem('nexomente_gemini_key') || '';
const getModel = () => localStorage.getItem('nexomente_gemini_model') || 'gemini-2.0-flash';

export async function chat(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return { success: false, error: 'Chave API do Gemini não configurada.' };

  const model = options.model || getModel();
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  // Converte o histórico para o formato do Gemini, removendo mensagens vazias
  const contents = messages
    .filter(m => (m.content || m.texto || '').trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.texto }]
    }));

  if (contents.length === 0) return { success: false, error: 'Nenhuma mensagem válida para enviar.' };

  try {
    const payload = {
      url,
      body: {
        contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.max_tokens || 1024,
        }
      }
    };

    // Tenta usar a ponte do Electron (evita CORS), senão usa fetch direto (browser)
    let res;
    if (window.electronAPI?.geminiChat) {
      res = await window.electronAPI.geminiChat(payload);
    } else {
      // Fallback para browser comum
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.body)
      });
      const data = await response.json();
      res = { ok: response.ok, data };
    }

    if (!res.ok) {
      return { success: false, error: res.data?.error?.message || res.error || 'Erro na API do Gemini' };
    }

    const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, response: text };
  } catch (error) {
    return { success: false, error: `Falha na conexão com Gemini: ${error.message}` };
  }
}

export async function checkStatus() {
  const apiKey = getApiKey();
  if (!apiKey) return { status: 'offline', models: [] };
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      // Filtra apenas modelos que suportam geração de conteúdo
      const models = data.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      return { status: 'online', models };
    }
    return { status: 'offline', error: 'Chave inválida ou sem permissão', models: [] };
  } catch {
    return { status: 'online', models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'] };
  }
}
