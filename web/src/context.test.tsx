import library from '../../contract/library.json'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContextScreen } from './screens/ContextScreen'
import type { Library } from './types'

describe('Context screen', () => {
  it('renders exactly the library context chips', () => {
    render(<ContextScreen library={library as Library} session={null} />)
    const chips = screen.getAllByTestId('context-chip')
    expect(chips.map((chip) => chip.textContent)).toEqual(
      library.context_chips.map((chip) => chip.label),
    )
  })

  it('uses the library label instead of a literal', () => {
    const altered = structuredClone(library) as Library
    const first = altered.context_chips[0]
    if (!first) {
      throw new Error('library has no context chips')
    }
    const original = first.label
    first.label = 'SENTINEL_CONTEXT_LABEL'
    altered.context_chips = [first]
    render(<ContextScreen library={altered} session={null} />)
    expect(screen.getByText('SENTINEL_CONTEXT_LABEL')).toBeTruthy()
    expect(screen.queryByText(original)).toBeNull()
    expect(screen.getAllByTestId('context-chip')).toHaveLength(1)
  })

  it('marks context chips the client has posted', () => {
    const posted = library.context_chips.find((chip) => chip.id === 'chip.on_phone')
    if (!posted) {
      throw new Error('chip.on_phone missing')
    }
    render(
      <ContextScreen
        library={library as Library}
        session={null}
        postedChipIds={[posted.id]}
      />,
    )
    const marked = screen
      .getAllByTestId('context-chip')
      .filter((chip) => chip.getAttribute('data-posted') === 'true')
    expect(marked.map((chip) => chip.textContent)).toEqual([posted.label])
  })
})
