// src/workers/whisper.worker.js
import { pipeline, env } from '@xenova/transformers'

// Configuração para Electron / Produção
const isDev = typeof process !== 'undefined' &&
  process.env?.NODE_ENV === 'development'

if (!isDev && typeof process !== 'undefined') {
  // Em produção no Electron, os modelos ficam em resources/models
  env.localModelPath = process.resourcesPath + '/models'
  env.allowRemoteModels = false
}

let transcriber = null

async function loadModel() {
  transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-small',
    {
      quantized: true,
      progress_callback: (p) => {
        if (p.status === 'downloading') {
          self.postMessage({
            type: 'download',
            file: p.file,
            progress: Math.round(p.progress ?? 0),
          })
        }
        if (p.status === 'done') {
          self.postMessage({ type: 'download_done', file: p.file })
        }
      },
    }
  )
}

self.onmessage = async (e) => {
  const { type, audio, language } = e.data

  if (type === 'load') {
    self.postMessage({ type: 'loading' })
    try {
      await loadModel()
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message })
    }
    return
  }

  if (type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ type: 'error', message: 'Modelo não carregado.' })
      return
    }
    try {
      const result = await transcriber(audio, {
        language,
        task: 'transcribe',
        return_timestamps: false,
      })
      self.postMessage({ type: 'result', text: result.text.trim() })
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message })
    }
  }
}
