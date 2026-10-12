import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { detectHardware } from '../ai/hardwareDetector.js';
import diagnostics from '../ai/diagnostics.js';
import { SmartContextManager } from '../ai/SmartContextManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

let llamaInstance = null;
let modelInstance = null;
let contextInstance = null;
let smartContext = null;
let currentModelPath = null;

export function registerAiHandlers() {
  // Gemini Proxy
  ipcMain.handle('ai:geminiChat', async (event, { url, body }) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // Embedded LLM (node-llama-cpp)
  ipcMain.handle('ai:embeddedChat', async (event, { modelPath, messages, options = {} }) => {
    console.log('[AI ENGINE] Requisicao recebida. Iniciando processamento...');
    try {
      console.log('[AI ENGINE] Importando node-llama-cpp...');
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

      if (!llamaInstance) {
        console.log('[AI ENGINE] Inicializando instancia Llama...');
        llamaInstance = await getLlama({
          debug: isDev
        });
        console.log('[AI ENGINE] Instancia Llama pronta.');
      }

      // Caminho dos modelos internos
      const internalModelsDir = app.isPackaged
        ? path.join(process.resourcesPath, 'models')
        : path.join(__dirname, '..', 'models');

      let finalModelPath = path.isAbsolute(modelPath) ? modelPath : path.resolve(process.cwd(), modelPath);

      if (fs.existsSync(internalModelsDir)) {
        const files = fs.readdirSync(internalModelsDir);
        const ggufFile = files.find(f => f.endsWith('.gguf'));
        if (ggufFile) {
          finalModelPath = path.join(internalModelsDir, ggufFile);
          console.log('[AI ENGINE] Modelo interno detectado:', ggufFile);
        }
      }

      // Só recarrega se o modelo mudou ou não existe
      if (!modelInstance || currentModelPath !== finalModelPath) {
        console.log('[AI ENGINE] Carregando modelo do disco:', finalModelPath);

        if (!fs.existsSync(finalModelPath)) {
          throw new Error(`Arquivo nao encontrado: ${finalModelPath}`);
        }

        try {
          console.log('[AI ENGINE] Tentando carregamento acelerado (GPU)...');
          modelInstance = await llamaInstance.loadModel({
            modelPath: finalModelPath,
            gpuLayers: -1,
            useMmap: true,
          });
        } catch (gpuError) {
          console.warn('[AI ENGINE] Falha na GPU, tentando modo CPU/Compatibilidade:', gpuError.message);
          modelInstance = await llamaInstance.loadModel({
            modelPath: finalModelPath,
            gpuLayers: 0,
            useMmap: false,
          });
        }

        currentModelPath = finalModelPath;
        console.log('[AI ENGINE] Modelo carregado com sucesso.');

        // Detectar hardware para configuracao adaptativa
        const hardware = await detectHardware();
        diagnostics.snapshot('before-context');

        // Configuracao adaptativa do KV Cache (Fase 1 do Guia TurboQuant)
        const contextConfig = {
          contextSize: hardware.ramGB >= 16 ? 8192 : 4096,
          batchSize: hardware.ramGB >= 16 ? 512 : 256,
          threads: Math.max(1, Math.floor(hardware.cpuCores * 0.75)),
          flashAttention: false,
          cacheTypeK: hardware.ramGB >= 16 ? 'q8_0' : 'q4_0',
          cacheTypeV: 'q4_0'
        };

        console.log(`[AI ENGINE] Criando contexto adaptativo (${hardware.tier} tier):`, contextConfig);
        contextInstance = await modelInstance.createContext(contextConfig);

        smartContext = new SmartContextManager(contextInstance, hardware);

        diagnostics.snapshot('after-context');
        const delta = diagnostics.delta('before-context', 'after-context');
        console.log(`[AI ENGINE] KV Cache alocado: ~${delta.externalDeltaMB}MB`);
      }

      console.log('[AI ENGINE] Iniciando sessao de chat...');
      const lastMessage = messages[messages.length - 1].content || messages[messages.length - 1].texto;

      await smartContext.addMessage('user', lastMessage);

      const session = new LlamaChatSession({ contextSequence: contextInstance.getSequence() });

      console.log('[AI ENGINE] Gerando resposta...');
      const response = await session.prompt(smartContext.buildOptimizedPrompt(), {
        maxTokens: options.max_tokens || 512,
        temperature: options.temperature || 0.7,
      });

      await smartContext.addMessage('assistant', response);

      console.log('[AI ENGINE] Resposta gerada com sucesso.');
      return { success: true, response };
    } catch (error) {
      console.error('[AI ENGINE] ERRO CRITICO:', error);

      let errorCode = 'ERR-AI-500';
      if (error.message.includes('not found')) errorCode = 'ERR-AI-001';
      if (error.message.includes('VRAM') || error.message.includes('out of memory')) errorCode = 'ERR-AI-002';
      if (error.message.includes('Failed to load model')) errorCode = 'ERR-AI-003';
      if (error.message.includes('context size')) errorCode = 'ERR-AI-004';
      if (error.message.includes('permission denied')) errorCode = 'ERR-SYS-001';

      return {
        success: false,
        error: error.message,
        code: errorCode,
        details: `Consulte o manual para o codigo ${errorCode}`,
        stack: isDev ? error.stack : undefined
      };
    }
  });

  // Info de hardware
  ipcMain.handle('ai:getHardwareInfo', async () => {
    try {
      return await detectHardware();
    } catch (error) {
      return { error: error.message };
    }
  });

  // Estatisticas de contexto
  ipcMain.handle('ai:getContextStats', async () => {
    if (!smartContext) return { activeTokens: 0, maxTokens: 4096 };
    return {
      activeTokens: smartContext.getTotalActiveTokens(),
      maxTokens: smartContext.maxActiveTokens
    };
  });
}
