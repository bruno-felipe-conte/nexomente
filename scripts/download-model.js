import { pipeline } from '@xenova/transformers';

async function download() {
  console.log('--- NexoMente AI: Iniciando download do modelo Whisper-small ---');
  
  try {
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
      quantized: true,
      progress_callback: (p) => {
        if (p.status === 'downloading') {
          const progress = Math.round(p.progress || 0);
          process.stdout.write(`\r[DOWNLOAD] ${p.file}: ${progress}%`);
        }
      }
    });
    
    console.log('\n\n✅ Modelo baixado e armazenado em cache com sucesso.');
    console.log('O modelo está pronto para uso local.');
  } catch (error) {
    console.error('\n❌ Erro durante o download:', error);
  }
}

download();
