import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { mockApiPlugin } from './mock/plugin.ts'
import { directoryFromFileUrl, useMockApi } from './src/devApi.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, directoryFromFileUrl(import.meta.url), 'VITE_')
  const useMock = useMockApi(env.VITE_API_URL)
  return {
    plugins: [react(), tailwindcss(), ...(useMock ? [mockApiPlugin()] : [])],
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
