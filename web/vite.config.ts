import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { mockApiPlugin } from './mock/plugin.ts'

export default defineConfig({
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
})
