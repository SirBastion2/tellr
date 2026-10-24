import type { SchemaIssue } from './validate'

export function SchemaBanner({ issues }: { issues: readonly SchemaIssue[] }) {
  if (issues.length === 0) {
    return null
  }
  return (
    <div role="alert" data-testid="schema-banner" className="border-2 border-red-800 bg-red-50 p-3 text-red-950">
      <p className="font-semibold">Contract mismatch</p>
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.instancePath}:${issue.message}`}>
            {issue.instancePath}: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
