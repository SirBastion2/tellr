import type { Plugin } from 'vite'
import { mockRequest } from './replay.ts'

type NodeRequest = {
  url?: string
  method?: string
  setEncoding: (encoding: string) => void
  on: (event: 'data' | 'end', listener: (chunk?: string | Uint8Array) => void) => void
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'teller-mock',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const nodeReq = req as NodeRequest
        const url = nodeReq.url ?? ''
        const path = url.split('?')[0] ?? ''
        if (path !== '/library' && path !== '/health' && !path.startsWith('/sessions')) {
          next()
          return
        }
        const chunks: string[] = []
        nodeReq.setEncoding('utf8')
        nodeReq.on('data', (chunk) => {
          if (chunk === undefined) {
            return
          }
          chunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk))
        })
        nodeReq.on('end', () => {
          const raw = chunks.join('')
          let body: unknown
          if (raw.length > 0) {
            try {
              body = JSON.parse(raw) as unknown
            } catch {
              res.statusCode = 422
              res.setHeader('content-type', 'application/json')
              res.end('null')
              return
            }
          }
          const result = mockRequest(nodeReq.method ?? 'GET', url, body)
          for (const warning of result.warnings) {
            console.warn(`mock: ${warning}`)
          }
          res.statusCode = result.status
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(result.body))
        })
      })
    },
  }
}
