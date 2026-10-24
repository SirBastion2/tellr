export function apiBase(): string {
  return import.meta.env.VITE_API_URL ?? ''
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
