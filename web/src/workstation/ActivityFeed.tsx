import type { CSSProperties } from 'react'
import { humanLabel } from './explain'
import { activityTime, amountBandLabel, eventTypeLabel } from '../ui/plain'
import type { ActivityRow, Library } from '../types'

const term: CSSProperties = {
  margin: 0,
  fontWeight: 700,
  textAlign: 'left',
  padding: 8,
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
      {showHeading ? <h3 className="tc-section-heading">Recent activity</h3> : null}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={term}>When</th>
            <th style={term}>What</th>
            <th style={term}>Amount</th>
            <th style={term}>Record</th>
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
              <td style={{ padding: 8, verticalAlign: 'top' }}>{activityTime(row.ts)}</td>
              <td style={{ padding: 8, verticalAlign: 'top', fontWeight: 700 }}>
                {humanLabel(library, row.channel, row.channel)}
              </td>
              <td style={{ padding: 8, verticalAlign: 'top' }}>{amountBandLabel(row.amount_band)}</td>
              <td style={{ padding: 8, verticalAlign: 'top' }}>{eventTypeLabel(row.type)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="tc-tech" data-testid="activity-technical">
        <summary>Technical details</summary>
        <ul>
          {rows.map((row, index) => (
            <li key={`raw-${row.ts}-${index}`}>
              {row.ts}. {row.channel}. {row.amount_band}. {row.type}.
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
