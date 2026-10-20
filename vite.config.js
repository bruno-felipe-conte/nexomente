import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function embeddedAiDevPlugin() {
  return {
    name: 'nexomente-embedded-ai-bridge',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/embedded/status' && req.method === 'GET') {
          try {
            const { resolveEmbeddedModelPath, DEFAULT_GEMMA_DIR, warmupEmbeddedModel } = await import('./electron/ipc/aiHandlers.js');
            const info = resolveEmbeddedModelPath(DEFAULT_GEMMA_DIR);
            if (info.modelPath) {
              warmupEmbeddedModel(info.modelPath);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: info.modelPath ? 'online' : 'offline',
              modelName: info.modelName || 'gemma-4-E2B-it (Motor Interno)',
              modelPath: info.modelPath,
              downloadingPartDetected: info.downloadingPartDetected,
              models: [
                'gemma-4-E2B-it (Motor Interno)',
                ...(info.modelName && !info.modelName.includes('gemma-4-E2B') ? [`${info.modelName} (Motor Interno)`] : []),
              ]
            }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'offline', error: err.message, models: [] }));
          }
          return;
        }

        if (req.url === '/api/embedded/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { runEmbeddedInference } = await import('./electron/ipc/aiHandlers.js');
              const result = await runEmbeddedInference(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    embeddedAiDevPlugin(),
    // Ativa bundle visualizer com: ANALYZE=true npm run build
    process.env.ANALYZE && visualizer({ open: true, filename: 'reports/bundle-stats.html', gzipSize: true }),
  ].filter(Boolean),
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app/src'),
      '@app': path.resolve(__dirname, './app/src/app'),
      '@core': path.resolve(__dirname, './app/src/core'),
      '@infra': path.resolve(__dirname, './app/src/infra'),
      '@shared': path.resolve(__dirname, './app/src/shared'),
      '@features': path.resolve(__dirname, './app/src/features'),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
      ignored: ['**/electron/models/**', '**/*.gguf', '**/*.part'],
    },
  },
});