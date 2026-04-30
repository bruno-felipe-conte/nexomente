// src/hooks/useWhisper.js
import { useState, useRef, useEffect, useCallback } from 'react'

export function useWhisper({ language = 'portuguese', onResult }) {
  const [status, setStatus]           = useState('idle')
  const [downloadProgress, setDownloadProgress] = useState({})
  const workerRef   = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const languageRef = useRef(language)

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    // Whisper desativado para transição para Vosk
    /*
    const worker = new Worker(
      new URL('../workers/whisper.worker.js', import.meta.url),
      { type: 'module' }
    )
    ...
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('ready') // Simula que está pronto para não quebrar a UI
    return () => {}
  }, []) 

  const startRecording = useCallback(async () => {
    if (status !== 'ready') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setStatus('processing')

        try {
          const blob        = new Blob(chunksRef.current, { type: 'audio/webm' })
          const arrayBuffer = await blob.arrayBuffer()
          const audioCtx    = new AudioContext({ sampleRate: 16000 })
          const decoded     = await audioCtx.decodeAudioData(arrayBuffer)
          const float32     = decoded.getChannelData(0)

          workerRef.current.postMessage({
            type: 'transcribe',
            audio: float32,
            language: languageRef.current,
          })
        } catch (err) {
          console.error('[Whisper] Erro ao processar áudio:', err)
          setStatus('ready')
        }
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch (err) {
      console.error('[Whisper] Erro ao acessar microfone:', err)
      setStatus('error')
    }
  }, [status])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  return { status, startRecording, stopRecording, downloadProgress }
}
