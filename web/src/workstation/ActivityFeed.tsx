import type { CSSProperties } from 'react'
import type { ActivityRow, Library } from '../types'

const term: CSSProperties = {
  margin: 0,
  color: 'var(--tc-muted)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textAlign: 'left',
  padding: 8,
}

function channelLabel(library: Library | null, channel: string): string {
  return library?.context_chips.find((chip) => chip.id === channel)?.label ?? channel
}

export function SessionActivity({
  library,
  rows,
  showHeading = true,
}: {
  library: Library | null
  rows: readonly ActivityRow[]
  showHeading?: boolean
}) {
  if (rows.length === 0) {
    return null
  }
  return (
    <div data-testid="session-activity" style={{ display: 'grid', gap: 8 }}>
      {showHeading ? <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent activity</h3> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={term}>Time</th>
            <th style={term}>Channel</th>
            <th style={term}>Amount band</th>
            <th style={term}>Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.ts}-${row.channel}-${row.type}-${index}`}
              data-testid="activity-row"
              data-feed="session"
              data-channel={row.channel}
            >
              <td style={{ padding: 8, verticalAlign: 'top' }}>{row.ts}</td>
              <td style={{ padding: 8, verticalAlign: 'top' }}>{channelLabel(library, row.channel)}</td>
              <td style={{ padding: 8, verticalAlign: 'top' }}>{row.amount_band}</td>
              <td style={{ padding: 8, verticalAlign: 'top' }}>{row.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
