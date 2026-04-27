const OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2:3b';

let currentModel = DEFAULT_MODEL;

export async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return { status: 'online', models: data.models || [] };
    }
    return { status: 'offline', models: [] };
  } catch (error) {
    return { status: 'offline', models: [], error: error.message };
  }
}

export async function generate(prompt, options = {}) {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || currentModel,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, response: data.response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function suggestTags(nota) {
  const prompt = `
Analise esta nota e sugira 3-5 tags relevantes em formato JSON.
Retorne apenas um array de strings.

Nota:
Título: ${nota.titulo}
Conteúdo: ${nota.conteudo?.substring(0, 1000)}

Resposta (JSON array):
`;
  
  const result = await generate(prompt);
  
  if (!result.success) {
    return [];
  }
  
  try {
    const tags = JSON.parse(result.response);
    return Array.isArray(tags) ? tags : [];
  } catch {
    const matches = result.response.match(/"([^"]+)"/g);
    return matches ? matches.map(m => m.replace(/"/g, '')) : [];
  }
}

export async function summarizeContent(content) {
  const prompt = `
Resuma o seguinte conteúdo em 2-3 frases curtas:

${content.substring(0, 2000)}

Resumo:
`;
  
  const result = await generate(prompt);
  return result.success ? result.response : '';
}

export async function generateFlashcards(nota, count = 3) {
  const prompt = `
Com base nesta nota, gere ${count} flashcards no formato JSON.
Cada flashcard deve ter "frente" (pergunta) e "verso" (resposta).

Nota:
Título: ${nota.titulo}
Conteúdo: ${nota.conteudo?.substring(0, 1500)}

Resposta (JSON array de objetos com frente e verso):
`;
  
  const result = await generate(prompt);
  
  if (!result.success) {
    return [];
  }
  
  try {
    const cards = JSON.parse(result.response);
    return Array.isArray(cards) ? cards : [];
  } catch {
    return [];
  }
}

export async function suggestLinks(notas) {
  const notasText = notas.map(n => `- ${n.titulo}: ${n.conteudo?.substring(0, 200)}`).join('\n');
  
  const prompt = `
Dadas estas notas, sugira possíveis conexões/linkagens em formato JSON.
Retorne um array de objetos com "from" (título da nota origem) e "to" (título da nota destino).

Notas:
${notasText}

Resposta (JSON array):
`;
  
  const result = await generate(prompt);
  
  if (!result.success) {
    return [];
  }
  
  try {
    const links = JSON.parse(result.response);
    return Array.isArray(links) ? links : [];
  } catch {
    return [];
  }
}

export function setModel(modelName) {
  currentModel = modelName;
}