/**
 * geminiService.js — Provedor de IA via Google Gemini API.
 * Fallback em nuvem para quando o processamento local não for possível.
 */

const getApiKey = () => localStorage.getItem('nexomente_gemini_key') || '';
const getModel = () => localStorage.getItem('nexomente_ai_model') || 'gemini-1.5-flash';

export async function chat(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) return { success: false, error: 'Chave API do Gemini não configurada.' };

  let model = options.model || getModel();
  if (model.includes('models/')) model = model.replace('models/', '');
  
  
  // O processamento da URL e do payload agora ocorre dentro do bloco try para maior segurança

  // Converte o histórico para o formato do Gemini, removendo mensagens vazias
  const contents = messages
    .filter(m => (m.content || m.texto || '').trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.texto }]
    }));

  if (contents.length === 0) return { success: false, error: 'Nenhuma mensagem válida para enviar.' };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey // Redundância para chaves sensíveis
        },
        body: JSON.stringify(payload.body)
      });
      const data = await response.json();
      res = { ok: response.ok, status: response.status, data };
    }

    if (!res.ok) {
      return { success: false, error: res.data?.error?.message || res.error || `Erro na API do Gemini (${res.status || '?'})` };
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
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
    return { status: 'online', models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'] };
  }
}
