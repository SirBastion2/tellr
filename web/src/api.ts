let baseOverride: string | null = null

export function apiBase(): string {
  if (baseOverride !== null) {
    return baseOverride
  }
  return import.meta.env.VITE_API_URL ?? ''
}

/** Browser probe sets this after GET /health. Tests leave it unset. */
export function setApiBase(base: string): void {
  baseOverride = base
}

export function resetApiBase(): void {
  baseOverride = null
}

export async function apiSend(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers()
  let payload: string | undefined
  if (body !== undefined) {
    headers.set('content-type', 'application/json')
    payload = JSON.stringify(body)
  }
  const response = await fetch(`${apiBase()}${path}`, { method, headers, body: payload })
  const text = await response.text()
  if (!text) {
    return { status: response.status, body: null }
  }
  try {
    return { status: response.status, body: JSON.parse(text) as unknown }
  } catch {
    return { status: response.status, body: null }
  }
}
