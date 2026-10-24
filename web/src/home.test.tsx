import libraryJson from '../../contract/library.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './screens/HomeScreen'
import type { Library } from './types'

const library = libraryJson as Library

describe('Home shell', () => {
  it('renders raw library fields and starts a practice scenario', () => {
    const onStartPractice = vi.fn()
    const onStartLive = vi.fn()
    render(
      <HomeScreen
        library={library}
        scenarios={[{ id: 'T2', label: 'Bank impersonation' }]}
        onStartPractice={onStartPractice}
        onStartLive={onStartLive}
      />,
    )
    expect(screen.getByTestId('library-version').textContent).toBe(library.library_version)
    expect(screen.getByTestId('copy-status').textContent).toBe(library.copy_status)
    expect(screen.queryByTestId('start-live')).toBeNull()
    screen.getByTestId('scenario-T2').click()
    expect(onStartPractice).toHaveBeenCalledWith('T2')
    expect(onStartLive).not.toHaveBeenCalled()
  })
})
