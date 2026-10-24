import libraryJson from '../../contract/library.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen } from './screens/HomeScreen'
import type { Library } from './types'

const library = libraryJson as Library

describe('Home shell', () => {
  it('renders raw library fields and starts a case', () => {
    const onStart = vi.fn()
    render(<HomeScreen library={library} cases={[{ id: 'T2' }]} onStart={onStart} />)
    expect(screen.getByTestId('library-version').textContent).toBe(library.library_version)
    expect(screen.getByTestId('copy-status').textContent).toBe(library.copy_status)
    screen.getByTestId('case-T2').click()
    expect(onStart).toHaveBeenCalledWith('T2')
  })
})
