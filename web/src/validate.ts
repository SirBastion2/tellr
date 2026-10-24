import Ajv from 'ajv/dist/2020'
import type { ErrorObject, ValidateFunction } from 'ajv'
import errorSchema from '../../contract/error.schema.json'
import librarySchema from '../../contract/library.schema.json'
import sessionSchema from '../../contract/session_state.schema.json'

export type SchemaIssue = {
  instancePath: string
  message: string
}

const ajv = new Ajv({ allErrors: true, strict: false })

function compile(schema: object): ValidateFunction {
  const clone = structuredClone(schema) as { $schema?: string }
  delete clone.$schema
  return ajv.compile(clone)
}

const sessionValidate = compile(sessionSchema)
const libraryValidate = compile(librarySchema)
const errorValidate = compile(errorSchema)

function issues(validate: ValidateFunction, data: unknown): SchemaIssue[] {
  if (validate(data)) {
    return []
  }
  return (validate.errors ?? []).map((error: ErrorObject) => ({
    instancePath: error.instancePath || '/',
    message: error.message ?? 'invalid',
  }))
}

export function validateSessionState(data: unknown): SchemaIssue[] {
  return issues(sessionValidate, data)
}

export function validateLibrary(data: unknown): SchemaIssue[] {
  return issues(libraryValidate, data)
}

export function validateError(data: unknown): SchemaIssue[] {
  return issues(errorValidate, data)
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data)
}

function isRiskItem(data: unknown): boolean {
  if (!isRecord(data)) {
    return false
  }
  return typeof data.id === 'string' && typeof data.label === 'string' && typeof data.rationale === 'string'
}

export function handoffShapeIssues(data: unknown): SchemaIssue[] {
  if (!isRecord(data)) {
    return [{ instancePath: '/handoff', message: 'expected an object' }]
  }
  const found: SchemaIssue[] = []
  if (typeof data.session_id !== 'string') {
    found.push({ instancePath: '/session_id', message: 'expected a string' })
  }
  if (data.mode !== 'live' && data.mode !== 'practice') {
    found.push({ instancePath: '/mode', message: 'expected live or practice' })
  }
  if (typeof data.stated_purpose !== 'string' && data.stated_purpose !== null) {
    found.push({ instancePath: '/stated_purpose', message: 'expected a string or null' })
  }
  if (typeof data.answers !== 'number') {
    found.push({ instancePath: '/answers', message: 'expected a number' })
  }
  if (data.suggested_outcome !== 'proceed' && data.suggested_outcome !== 'slow_down' && data.suggested_outcome !== 'escalate') {
    found.push({ instancePath: '/suggested_outcome', message: 'expected proceed, slow_down, or escalate' })
  }
  if (!isRecord(data.risk)) {
    found.push({ instancePath: '/risk', message: 'expected an object' })
  } else {
    if (data.risk.level !== 'clear' && data.risk.level !== 'caution' && data.risk.level !== 'high') {
      found.push({ instancePath: '/risk/level', message: 'expected clear, caution, or high' })
    }
    if (typeof data.risk.score !== 'number') {
      found.push({ instancePath: '/risk/score', message: 'expected a number' })
    }
    if (typeof data.risk.pattern_label !== 'string') {
      found.push({ instancePath: '/risk/pattern_label', message: 'expected a string' })
    }
    if (!Array.isArray(data.risk.reasons) || !data.risk.reasons.every(isRiskItem)) {
      found.push({ instancePath: '/risk/reasons', message: 'expected reason items' })
    }
    if (data.risk.counterpoint !== null && !isRiskItem(data.risk.counterpoint)) {
      found.push({ instancePath: '/risk/counterpoint', message: 'expected a reason item or null' })
    }
  }
  if (data.stop !== null) {
    if (!isRecord(data.stop) || (data.stop.kind !== 'hard' && data.stop.kind !== 'recommended') || typeof data.stop.reason !== 'string') {
      found.push({ instancePath: '/stop', message: 'expected a stop or null' })
    }
  }
  return found
}
