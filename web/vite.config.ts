import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { mockApiPlugin } from './mock/plugin.ts'

export default defineConfig(({ mode }) => {
  // Vite loads `.env.api` when mode is `api`. The mock stays installed so a
  // failed GET /health can fall back to sample data on this origin.
  void mode
  return {
    plugins: [react(), tailwindcss(), mockApiPlugin()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      fs: { allow: ['..'] },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['./src/test-setup.ts'],
    },
  }
})
