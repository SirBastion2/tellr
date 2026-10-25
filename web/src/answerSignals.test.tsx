import libraryJson from '../../contract/library.json'
import t1 from '../../contract/fixtures/T1.json'
import { render, screen, within } from '@testing-library/react'
import type { CSSProperties } from 'react'
import { describe, expect, it } from 'vitest'
import { ANSWER_ORIGIN, ANSWER_SIGNAL_DECISION, answerSignalDecision, answerSignalRows } from './answerSignals'
import { themeForScheme } from './theme/palette'
import { THEME_IDS, THEMES } from './theme/registry'
import { themeVars } from './theme/vars'
import type { Library, SessionState } from './types'
import { CopilotStrip } from './workstation/CopilotStrip'

const library = libraryJson as Library
const emptyVisit = t1.steps[0]?.response as SessionState

const governmentContributions = [
  { signal_id: 'sig.secrecy_bank', label: 'Told not to discuss with the bank', weight: 22, direction: 'raises' as const },
  { signal_id: 'sig.answer_relayed', label: 'Answer relayed by caller', weight: 18, direction: 'raises' as const },
  { signal_id: 'sig.specificity_gap', label: 'Missing details', weight: 18, direction: 'raises' as const },
  { signal_id: 'sig.urgency_secrecy_mentioned', label: 'Mentioned urgency or secrecy', weight: 18, direction: 'raises' as const },
  { signal_id: 'sig.someone_directing', label: 'Someone else directing them', weight: 16, direction: 'raises' as const },
  { signal_id: 'sig.cash_refusal_unexplained', label: 'Turned down a safer option', weight: 14, direction: 'raises' as const },
  { signal_id: 'sig.third_party_call', label: 'On the phone during the visit', weight: 14, direction: 'raises' as const },
  { signal_id: 'sig.cash_insistence', label: 'Insists on cash', weight: 12, direction: 'raises' as const },
  { signal_id: 'sig.story_drift', label: 'Story changed', weight: 12, direction: 'raises' as const },
]

describe('answer signal keep/suppress', () => {
  it('decides every answer-derived signal id', () => {
    expect(answerSignalDecision('sig.answer_relayed')).toBe('keep')
    expect(answerSignalDecision('sig.specificity_gap')).toBe('keep')
    expect(answerSignalDecision('sig.story_drift')).toBe('keep')
    expect(answerSignalDecision('mit.purpose_specific')).toBe('keep')
    expect(answerSignalDecision('mit.named_counterparty')).toBe('keep')
    expect(answerSignalDecision('mit.written_estimate')).toBe('keep')
    expect(answerSignalDecision('mit.own_named_account')).toBe('keep')
    expect(answerSignalDecision('mit.accepts_alternative')).toBe('keep')
    expect(answerSignalDecision('sig.secrecy_bank')).toBe('suppress')
    expect(answerSignalDecision('sig.cash_refusal_unexplained')).toBe('suppress')
    expect(Object.keys(ANSWER_SIGNAL_DECISION).sort()).toEqual([
      'mit.accepts_alternative',
      'mit.named_counterparty',
      'mit.own_named_account',
      'mit.purpose_specific',
      'mit.written_estimate',
      'sig.answer_relayed',
      'sig.cash_refusal_unexplained',
      'sig.secrecy_bank',
      'sig.specificity_gap',
      'sig.story_drift',
    ])
  })

  it('drops chip signals, suppressed answers, and duplicate ids, and keeps the engine label and order', () => {
    expect(answerSignalDecision('sig.third_party_call')).toBeNull()
    expect(answerSignalDecision('sig.cash_insistence')).toBeNull()
    expect(answerSignalDecision('sig.urgency_secrecy_mentioned')).toBeNull()
    const rows = answerSignalRows([
      ...governmentContributions,
      { signal_id: 'sig.answer_relayed', label: 'Answer relayed by caller', weight: 18, direction: 'raises' as const },
    ])
    expect(rows.map((row) => row.signal_id)).toEqual([
      'sig.answer_relayed',
      'sig.specificity_gap',
      'sig.story_drift',
    ])
    expect(rows.map((row) => row.label)).toEqual([
      'Answer relayed by caller',
      'Missing details',
      'Story changed',
    ])
    expect(answerSignalRows([])).toEqual([])
    expect(
      answerSignalRows([{ signal_id: 'mit.purpose_specific', label: 'Clear purpose from the engine' }]).map(
        (row) => row.label,
      ),
    ).toEqual(['Clear purpose from the engine'])
  })
})

describe('answer signal rows on the copilot', () => {
  const posted = [
    'chip.on_phone',
    'chip.someone_directing',
    'chip.urgency_secrecy',
    'chip.cash_only',
    'chip.above_threshold',
  ]
  const session: SessionState = {
    ...emptyVisit,
    answers: 5,
    context_chips: posted.filter((id) => id !== 'chip.above_threshold').map((id) => ({ id, source: 'observed' as const })),
    explanation: {
      confidence: null,
      used_fallback: false,
      contributions: governmentContributions,
    },
  }

  function renderStrip(style?: CSSProperties) {
    return render(
      <div style={style}>
        <CopilotStrip
          library={library}
          session={session}
          postedChipIds={posted}
          pending={false}
          onConfirm={() => undefined}
          onDismiss={() => undefined}
          onRestore={() => undefined}
          onEscalate={() => undefined}
        />
      </div>,
    )
  }

  function expectAnswerRows() {
    const list = within(screen.getByRole('list', { name: 'Signals' }))
    const relayed = list.getByText('Answer relayed by caller').closest('li')
    const missing = list.getByText('Missing details').closest('li')
    const changed = list.getByText('Story changed').closest('li')
    for (const row of [relayed, missing, changed]) {
      expect(row).toBeTruthy()
      const item = row as HTMLElement
      expect(item.className).toContain('tc-signal-row')
      expect(item.getAttribute('data-origin')).toBe('answer')
      const label = within(item).getByText(/Answer relayed|Missing details|Story changed/)
      const badge = within(item).getByTestId('signal-origin')
      expect(badge.textContent).toBe(ANSWER_ORIGIN)
      expect(badge.className).toContain('tc-badge')
      expect(label.className).toContain('tc-signal-label')
      expect(label.nextElementSibling).toBe(badge)
      expect(badge.parentElement?.className).toContain('tc-signal-meta')
      expect(within(item).queryByTestId('signal-confirm')).toBeNull()
      expect(within(item).queryByTestId('signal-dismiss')).toBeNull()
      expect(within(item).queryByTestId('signal-restore')).toBeNull()
    }
    expect(list.getByText('Insists on cash')).toBeTruthy()
    expect(list.getByText('Mentions urgency, secrecy, or being told what to say')).toBeTruthy()
    expect(list.queryByText('Told not to discuss with the bank')).toBeNull()
    expect(list.queryByText('Turned down a safer option')).toBeNull()
    expect(list.queryByText('Mentioned urgency or secrecy')).toBeNull()
    expect(list.queryByText('On the phone during the visit')).toBeNull()
    const cash = list.getByText('Insists on cash').closest('li') as HTMLElement
    expect(within(cash).getByTestId('signal-confirm')).toBeTruthy()
    expect(within(cash).getByTestId('signal-dismiss')).toBeTruthy()
  }

  it('adds kept answer rows under the chip rows and leaves confirm on the chip rows', () => {
    renderStrip()
    expectAnswerRows()
  })

  it('uses the same row and badge placement in tellr, pnc, mtb, and fnb', () => {
    for (const themeId of THEME_IDS) {
      for (const scheme of ['dark', 'light'] as const) {
        const theme = THEMES[themeId]
        expect(theme, themeId).toBeTruthy()
        const { unmount } = renderStrip(themeVars(themeForScheme(theme!, scheme)) as CSSProperties)
        expectAnswerRows()
        unmount()
      }
    }
  })
})
