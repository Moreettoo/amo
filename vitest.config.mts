import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // os testes que falam com o banco de verdade rodam a parte (npm run test:banco)
    exclude: [...configDefaults.exclude, 'tests/banco/**'],
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      'server-only': resolve(import.meta.dirname, './tests/apoio/vazio.ts'),
    },
  },
})
