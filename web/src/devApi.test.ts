import packageJson from '../package.json'
import { describe, expect, it, vi } from 'vitest'
import config from '../vite.config'
import { directoryFromFileUrl, useMockApi } from './devApi'

describe('real API dev mode', () => {
  it('keeps npm run dev on Vite and adds a mode script with no inline env assignment', () => {
    expect(packageJson.scripts.dev).toBe('vite')
    expect(packageJson.scripts['dev:api']).toBe('vite --mode api')
  })

  it('points mode api at the local API', async () => {
    const text = await readEnvApi()
    expect(text).toContain('VITE_API_URL=http://127.0.0.1:8000')
  })

  it('uses the mock plugin only when VITE_API_URL is unset', () => {
    expect(useMockApi(undefined)).toBe(true)
    expect(useMockApi('')).toBe(true)
    expect(useMockApi('   ')).toBe(true)
    expect(useMockApi('http://127.0.0.1:8000')).toBe(false)
  })

  it('resolves the config directory from file URLs on Windows and POSIX', () => {
    expect(directoryFromFileUrl('file:///workspace/web/vite.config.ts')).toBe('/workspace/web')
    expect(directoryFromFileUrl('file:///C:/Users/teller/web/vite.config.ts')).toBe('C:/Users/teller/web')
    expect(directoryFromFileUrl('file:///C:/Users/teller%20copilot/web/vite.config.ts')).toBe(
      'C:/Users/teller copilot/web',
    )
  })

  it('keeps the mock plugin installed when VITE_API_URL is set', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8000')
    try {
      const resolved = await loadConfig('development')
      expect(pluginNames(resolved.plugins)).toContain('teller-mock')
      expect(resolved.server?.proxy).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('keeps the mock plugin for the default dev server', async () => {
    vi.stubEnv('VITE_API_URL', '')
    try {
      const resolved = await loadConfig('development')
      expect(pluginNames(resolved.plugins)).toContain('teller-mock')
      expect(resolved.server?.proxy).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('loads api mode with the mock fallback still installed', async () => {
    vi.unstubAllEnvs()
    const resolved = await loadConfig('api')
    expect(pluginNames(resolved.plugins)).toContain('teller-mock')
  })
})

async function readEnvApi(): Promise<string> {
  const specifier = 'node:fs/promises'
  const fs = (await import(specifier)) as {
    readFile: (path: string, encoding: 'utf8') => Promise<string>
  }
  const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd()
  return fs.readFile(`${cwd}/.env.api`, 'utf8')
}

async function loadConfig(mode: string): Promise<{ plugins?: unknown; server?: { proxy?: unknown } }> {
  if (typeof config !== 'function') {
    throw new Error('vite config must stay a function of mode')
  }
  return config({ command: 'serve', mode })
}

function pluginNames(plugins: unknown): string[] {
  const names: string[] = []
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item)
      }
      return
    }
    if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
      names.push(value.name)
    }
  }
  walk(plugins)
  return names
}
