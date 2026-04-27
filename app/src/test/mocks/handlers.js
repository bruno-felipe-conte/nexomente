import { http, HttpResponse } from 'msw';

export const handlers = [
  // OLLAMA MOCKS
  http.get('http://localhost:11434/api/tags', () => {
    return HttpResponse.json({
      models: [
        { name: 'llama3:latest' },
        { name: 'mistral:latest' }
      ]
    });
  }),
  http.post('http://localhost:11434/api/generate', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      response: `[MOCK_OLLAMA] ${body.prompt ? body.prompt.substring(0, 15) : 'response'}`,
      done: true
    });
  }),
  
  // LM STUDIO MOCKS
  http.get('http://127.0.0.1:1234/api/tags', () => {
    return HttpResponse.json({
      models: [
        { name: 'lmstudio-model-1' }
      ]
    });
  }),
  // For tags LM Studio uses GET /v1/models as standard OpenAI, but the app uses GET /api/tags per older LM Studio or GET /v1/models depending on the implementation. Let's mock both just in case.
  http.get('http://127.0.0.1:1234/v1/models', () => {
    return HttpResponse.json({
      data: [
        { id: 'lmstudio-model-1' }
      ]
    });
  }),
  http.post('http://127.0.0.1:1234/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    const lastMsg = body.messages ? body.messages[body.messages.length - 1].content : 'empty';
    return HttpResponse.json({
      choices: [{
        message: { content: `[MOCK_LMSTUDIO] ${lastMsg.substring(0, 15)}` }
      }]
    });
  }),
  http.post('http://127.0.0.1:1234/api/generate', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      response: `[MOCK_LMSTUDIO_GENERATE] ${body.prompt ? body.prompt.substring(0, 15) : 'response'}`
    });
  })
];
