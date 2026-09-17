import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: { reporter: ['text', 'html'] },
  },
})
