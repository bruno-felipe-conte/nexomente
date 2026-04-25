import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js', './app/src/test/setup.js'],
    include: ['src/test/**/*.{test,spec}.{js,jsx}', 'app/src/test/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Inclui apenas o código testável sem Electron/browser APIs
      include: [
        'app/src/utils/**/*.{js,jsx}',
        'app/src/constants/**/*.{js,jsx}',
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