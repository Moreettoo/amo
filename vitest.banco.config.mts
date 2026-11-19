import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/** Os testes que falam com o banco de desenvolvimento (npm run test:banco). */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/banco/**/*.test.ts'],
    setupFiles: ['./tests/banco/preparar.ts'],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      'server-only': resolve(import.meta.dirname, './tests/apoio/vazio.ts'),
    },
  },
})
