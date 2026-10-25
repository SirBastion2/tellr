import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppShell } from './App'
import type { Library, SessionState } from './types'

const library = libraryJson as Library
const session = t1.steps[0]?.response as SessionState

function Harness() {
  const [helpOpen, setHelpOpen] = useState(false)
  return (
    <MemoryRouter>
      <AppShell
        library={library}
        session={{ ...session, mode: 'live' }}
        issues={[]}
        helpOpen={helpOpen}
        onHelp={setHelpOpen}
      />
    </MemoryRouter>
  )
}

describe('shortcuts and landmarks', () => {
  it('opens shortcut help and announces the level with text', () => {
    render(<Harness />)
    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Screens' })).toBeTruthy()
    expect(screen.getByRole('main')).toBeTruthy()
    expect(screen.getByTestId('live-region').textContent).toMatch(/Level Clear/)
    expect(screen.getByTestId('live-region').textContent).toMatch(/Suggested action/)
    fireEvent.click(screen.getByTestId('shortcut-help-button'))
    expect(screen.getByTestId('shortcut-help')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('shortcut-help')).toBeNull()
    for (const link of screen.getAllByRole('link')) {
      expect(link.textContent ?? '').not.toMatch(/^\//)
      expect(link.textContent ?? '').not.toContain('/sessions')
    }
  })
})
