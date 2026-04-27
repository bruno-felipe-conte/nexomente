/**
 * embeddedService.js — Provedor de IA embutido usando node-llama-cpp.
 * Carrega modelos GGUF locais diretamente no processo do Electron.
 */

const getModelPath = () => localStorage.getItem('nexomente_embedded_path') || 'C:/Users/bruno/.lmstudio/models/unsloth/gemma-4-E4B-it-GGUF/gemma-4-E4B-it-Q4_K_S.gguf';

export async function chat(messages, options = {}) {
  const modelPath = getModelPath();
  
  if (!window.electronAPI?.embeddedChat) {
    return { success: false, error: 'Motor embutido não disponível. Certifique-se de que o app foi reiniciado.' };
  }

  try {
    const res = await window.electronAPI.embeddedChat({
      modelPath,
      messages,
      options: {
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 512,
      }
    });

    if (!res || !res.success) {
      return { success: false, error: res?.error || 'O motor de IA não respondeu.' };
    }

    // Padroniza o retorno para o formato que o parser espera (estilo OpenAI)
    return {
      success: true,
      content: res.response,
      role: 'assistant'
    };
  } catch (error) {
    console.error('IPC Error:', error);
    if (error.message.includes('No handler registered')) {
      return { 
        success: false, 
        code: 'ERR-IPC-001',
        error: 'Erro de Comunicação: O motor interno não foi ativado corretamente na inicialização.' 
      };
    }
    return { 
      success: false, 
      code: 'ERR-IPC-500',
      error: `Erro de conexão com o motor: ${error.message}` 
    };
  }
}

export async function checkStatus() {
  if (window.electronAPI?.embeddedChat) {
    return { status: 'online', models: ['Gemma 4B (Interno)'] };
  }
  return { status: 'offline', models: [] };
}
