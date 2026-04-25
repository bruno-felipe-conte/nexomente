import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js', './app/src/test/setup.js'],
    include: ['src/test/**/*.test.js', 'app/src/test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/src/**/*.{js,jsx}', 'src/lib/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'node_modules/**'],
      thresholds: {
        lines: 4,
        branches: 10,
        functions: 4,
        statements: 4
      }
    }
  }
});