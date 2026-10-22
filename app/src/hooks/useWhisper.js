// src/hooks/useWhisper.js
import { useState, useRef, useEffect, useCallback } from "react";

export function useWhisper({ language = "portuguese", _onResult }) {
  const [status, setStatus] = useState(() => "ready"); // Lazy init — evita setState em useEffect
  const [downloadProgress] = useState({});
  const workerRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Whisper desativado para transição para Vosk — status já inicializado como "ready"
  useEffect(() => {
    /*
    const worker = new Worker(
      new URL("../workers/whisper.worker.js", import.meta.url),
      { type: "module" }
    )
    ...
    */
    return () => {};
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== "ready") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setStatus("processing");

        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const arrayBuffer = await blob.arrayBuffer();
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const float32 = decoded.getChannelData(0);

          workerRef.current.postMessage({
            type: "transcribe",
            audio: float32,
            language: languageRef.current,
          });
        } catch (err) {
          console.error("[Whisper] Erro ao processar áudio:", err);
          setStatus("ready");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch (err) {
      console.error("[Whisper] Erro ao acessar microfone:", err);
      setStatus("error");
    }
  }, [status]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  return { status, startRecording, stopRecording, downloadProgress };
}
