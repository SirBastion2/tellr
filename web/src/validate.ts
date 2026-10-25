import Ajv from 'ajv/dist/2020'
import type { ErrorObject, ValidateFunction } from 'ajv'
import activitySchema from '../../contract/activity.schema.json'
import errorSchema from '../../contract/error.schema.json'
import handoffSchema from '../../contract/handoff.schema.json'
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
const activityValidate = compile(activitySchema)
const libraryValidate = compile(librarySchema)
const errorValidate = compile(errorSchema)
const handoffValidate = compile(handoffSchema)

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

export function validateActivity(data: unknown): SchemaIssue[] {
  return issues(activityValidate, data)
}

export function validateLibrary(data: unknown): SchemaIssue[] {
  return issues(libraryValidate, data)
}

export function validateError(data: unknown): SchemaIssue[] {
  return issues(errorValidate, data)
}

export function validateHandoff(data: unknown): SchemaIssue[] {
  return issues(handoffValidate, data)
}
