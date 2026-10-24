import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SchemaBanner } from './SchemaBanner'

describe('schema banner', () => {
  it('is visible when validation fails', () => {
    render(
      <SchemaBanner
        issues={[{ instancePath: '/session_id', message: 'must be string' }]}
      />,
    )
    const banner = screen.getByRole('alert')
    expect(banner.textContent).toContain('Contract mismatch')
    expect(banner.textContent).toContain('/session_id')
    expect(banner.textContent).toContain('must be string')
  })

  it('stays hidden when the payload matches', () => {
    render(<SchemaBanner issues={[]} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
