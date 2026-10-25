/** True when the dev server should answer /library, /health, and /sessions with the mock. */
export function useMockApi(apiUrl: string | undefined): boolean {
  return (apiUrl ?? '').trim().length === 0
}

/** Directory of a `file:` URL. Handles Windows paths (`/C:/...`) without Node's path module. */
export function directoryFromFileUrl(fileUrl: string): string {
  let path = decodeURIComponent(new URL('.', fileUrl).pathname)
  if (/^\/[A-Za-z]:\//.test(path)) {
    path = path.slice(1)
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  return path
}
