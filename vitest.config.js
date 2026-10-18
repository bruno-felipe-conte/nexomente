import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/src/test/setup.js'],
    include: ['app/src/test/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Inclui apenas o código testável sem Electron/browser APIs
      include: [
        'app/src/utils/**/*.{js,jsx}',
        'app/src/constants/**/*.{js,jsx}',
        'app/src/core/**/*.{js,jsx}',
        'app/src/features/**/domain/**/*.{js,jsx}',
        'app/src/hooks/sm2.js',
        'app/src/hooks/useNotes.js',
      ],
      // Exclui: pages (precisam Electron), services (API externa), stores (IndexedDB)
      exclude: [
        'app/src/pages/**',
        'app/src/services/**',
        'app/src/store/**',
        'app/src/lib/ai/**',
        'app/src/lib/sync/**',
        'app/src/lib/editor/**',
        'app/src/hooks/use*.js', // hooks com electronAPI
        'src/test/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 60,
        branches: 55,
        functions: 60,
        statements: 60,
      }
    }
  },
  esbuild: {
    jsxInject: "import React from 'react'"
  }
});