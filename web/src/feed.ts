import type { ChipSource, ContextChipEcho, HandoffProjection, Library, SessionState } from './types'
import { groupFactors, humanLabel, type FactorDirection, type LevelFactor } from './workstation/explain'

export function sourceForChip(
  chips: readonly ContextChipEcho[] | undefined,
  id: string,
): ChipSource | undefined {
  if (!chips) {
    return undefined
  }
  let found: ChipSource | undefined
  for (const chip of chips) {
    if (chip.id === id) {
      found = chip.source
    }
  }
  return found
}

export function originText(source: ChipSource | undefined, confirmed: boolean): 'Observed' | 'Teller confirmed' {
  if (confirmed || source === 'teller') {
    return 'Teller confirmed'
  }
  return 'Observed'
}

export function rememberChipOrder(order: readonly string[], incoming: readonly string[]): string[] {
  const next = [...order]
  for (const id of incoming) {
    if (!next.includes(id)) {
      next.push(id)
    }
  }
  return next
}

export function listedChipIds(
  posted: readonly string[],
  chips: readonly ContextChipEcho[] | undefined,
  dismissed: readonly string[] = [],
  order: readonly string[] = [],
): string[] {
  const incoming = [...posted]
  for (const chip of chips ?? []) {
    if (!incoming.includes(chip.id)) {
      incoming.push(chip.id)
    }
  }
  for (const id of dismissed) {
    if (!incoming.includes(id)) {
      incoming.push(id)
    }
  }
  const live = new Set(incoming)
  const stable = order.filter((id) => live.has(id))
  for (const id of incoming) {
    if (!stable.includes(id)) {
      stable.push(id)
    }
  }
  return stable
}

/**
 * Source badge for a factor already shown in Why this level.
 * Matches a context chip by signal id, chip id, or label. Returns null when
 * that chip was not posted and the session did not echo it.
 */
export function factorOrigin(
  library: Library | null,
  factorId: string,
  factorLabel: string,
  postedChipIds: readonly string[],
  echoes: readonly ContextChipEcho[] | undefined,
): 'Observed' | 'Teller confirmed' | null {
  const chip = library?.context_chips.find(
    (item) => item.signal === factorId || item.id === factorId || item.label === factorLabel,
  )
  if (!chip) {
    return null
  }
  const echoed = (echoes ?? []).some((item) => item.id === chip.id)
  if (!postedChipIds.includes(chip.id) && !echoed) {
    return null
  }
  return originText(sourceForChip(echoes, chip.id), false)
}

export function fileSignalStatus(
  posted: boolean,
  confirmed: boolean,
  dismissed: boolean,
  source: ChipSource | undefined,
): 'Not yet' | 'Observed' | 'Teller confirmed' | 'Dismissed' {
  if (dismissed) {
    return 'Dismissed'
  }
  if (source === 'teller' || confirmed) {
    return 'Teller confirmed'
  }
  if (source === 'observed' || posted) {
    return 'Observed'
  }
  return 'Not yet'
}

/** Context chips that do not map to a signal stay in teller notes, not on a row. */
export function notesOnlyChip(library: Library | null, chipId: string): boolean {
  const chip = library?.context_chips.find((item) => item.id === chipId)
  return chip != null && chip.signal === null
}

export function notesOnlyLabels(
  library: Library | null,
  posted: readonly string[],
  echoes: readonly ContextChipEcho[] | undefined,
): string[] {
  const labels: string[] = []
  for (const id of listedChipIds(posted, echoes)) {
    if (!notesOnlyChip(library, id)) {
      continue
    }
    const chip = library?.context_chips.find((item) => item.id === id)
    if (chip?.label && !labels.includes(chip.label)) {
      labels.push(chip.label)
    }
  }
  return labels
}

export function chipForFactor(
  library: Library | null,
  factorId: string,
  factorLabel: string,
): { id: string; label: string; signal: string | null } | undefined {
  return library?.context_chips.find(
    (item) => item.signal === factorId || item.id === factorId || item.label === factorLabel,
  )
}

export function latestActivityTs(rows: readonly { ts: string }[] | null | undefined): string | null {
  if (!rows || rows.length === 0) {
    return null
  }
  let latest: string | null = null
  let latestMs = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const ms = Date.parse(row.ts)
    if (!Number.isNaN(ms) && ms >= latestMs) {
      latestMs = ms
      latest = row.ts
    }
  }
  return latest
}

function rowState(confirmed: boolean, dismissed: boolean, teller: boolean): 'dismissed' | 'confirmed' | 'auto' {
  if (dismissed) {
    return 'dismissed'
  }
  if (confirmed || teller) {
    return 'confirmed'
  }
  return 'auto'
}

export type MergedSignalRow = LevelFactor & {
  chipId: string | null
  state: 'dismissed' | 'confirmed' | 'auto'
  origin: 'Observed' | 'Teller confirmed' | null
}

function decorateFactor(
  library: Library | null,
  session: SessionState,
  factor: LevelFactor,
  postedChipIds: readonly string[],
  confirmed: readonly string[],
  dismissed: readonly string[],
  used: Set<string>,
): MergedSignalRow {
  const chip = chipForFactor(library, factor.id, factor.label)
  const chipId = chip && !notesOnlyChip(library, chip.id) ? chip.id : null
  if (chipId) {
    used.add(chipId)
  }
  const source = chipId ? sourceForChip(session.context_chips, chipId) : undefined
  const wasConfirmed = Boolean(chipId && confirmed.includes(chipId))
  const wasDismissed = Boolean(chipId && dismissed.includes(chipId))
  const teller = source === 'teller'
  const listed = Boolean(
    chipId && (postedChipIds.includes(chipId) || source !== undefined || wasDismissed || wasConfirmed),
  )
  return {
    ...factor,
    chipId,
    state: rowState(wasConfirmed, wasDismissed, teller),
    origin: listed
      ? originText(source, wasConfirmed)
      : factorOrigin(library, factor.id, factor.label, postedChipIds, session.context_chips),
  }
}

function leftoverDirection(library: Library | null, chipId: string): FactorDirection {
  const chip = library?.context_chips.find((item) => item.id === chipId)
  const signal = chip?.signal ? library?.signals.find((item) => item.id === chip.signal) : undefined
  return signal?.direction === 'mitigating' ? 'lowers' : 'raises'
}

function rowOrderKey(row: MergedSignalRow): string {
  return row.chipId ?? row.id
}

function sortByChipOrder(rows: MergedSignalRow[], order: readonly string[]): MergedSignalRow[] {
  if (order.length === 0) {
    return rows
  }
  return [...rows].sort((left, right) => {
    const leftAt = order.indexOf(rowOrderKey(left))
    const rightAt = order.indexOf(rowOrderKey(right))
    const leftIndex = leftAt === -1 ? order.length : leftAt
    const rightIndex = rightAt === -1 ? order.length : rightAt
    return leftIndex - rightIndex
  })
}

/**
 * One row per signal for Why this level. Notes-only chips stay out.
 * Placement uses the server factor lists, then leftover posted chips.
 * `order` is first-seen chip/signal ids so dismiss/restore/confirm do not jump.
 */
export function mergeSignalRows(
  library: Library | null,
  session: SessionState,
  postedChipIds: readonly string[],
  confirmed: readonly string[] = [],
  dismissed: readonly string[] = [],
  order: readonly string[] = [],
): { raises: MergedSignalRow[]; lowers: MergedSignalRow[] } {
  const grouped = groupFactors(session, library)
  const used = new Set<string>()
  const raises = grouped.raises.map((factor) =>
    decorateFactor(library, session, factor, postedChipIds, confirmed, dismissed, used),
  )
  const lowers = grouped.lowers.map((factor) =>
    decorateFactor(library, session, factor, postedChipIds, confirmed, dismissed, used),
  )
  for (const chipId of listedChipIds(postedChipIds, session.context_chips, dismissed, order)) {
    if (used.has(chipId) || notesOnlyChip(library, chipId)) {
      continue
    }
    const chip = library?.context_chips.find((item) => item.id === chipId)
    const signal = chip?.signal ? library?.signals.find((item) => item.id === chip.signal) : undefined
    const source = sourceForChip(session.context_chips, chipId)
    const wasConfirmed = confirmed.includes(chipId)
    const wasDismissed = dismissed.includes(chipId)
    const direction = leftoverDirection(library, chipId)
    const row: MergedSignalRow = {
      id: chip?.signal ?? chipId,
      chipId,
      label: humanLabel(library, chipId, chip?.label ?? chipId),
      rationale: signal?.rationale ?? '',
      weight: null,
      direction,
      state: rowState(wasConfirmed, wasDismissed, source === 'teller'),
      origin: originText(source, wasConfirmed),
    }
    if (direction === 'lowers') {
      lowers.push(row)
    } else {
      raises.push(row)
    }
  }
  return {
    raises: sortByChipOrder(raises, order),
    lowers: sortByChipOrder(lowers, order),
  }
}

export type FlaggedSignal = {
  id: string
  label: string
  status: 'Observed' | 'Teller confirmed' | 'Dismissed' | null
}

/**
 * Badge for the Handoff "Why it was flagged" list only.
 * `factorOrigin` stays null when no context chip matches (recorded answers).
 * Those rows still read Observed here. Teller confirmed and Dismissed stay.
 * The explanation overlay and copilot panel do not call this; they hide Observed.
 */
export function handoffReasonBadge(
  status: FlaggedSignal['status'],
): Exclude<FlaggedSignal['status'], null> {
  if (status === 'Teller confirmed' || status === 'Dismissed') {
    return status
  }
  return 'Observed'
}

/** Display-only handoff list. Uses the merged Why this level rows when a session exists. */
export function flaggedSignals(
  session: SessionState | null,
  projection: HandoffProjection | null,
  library: Library | null,
  dismissed: readonly string[] = [],
  confirmed: readonly string[] = [],
  postedChipIds: readonly string[] = [],
  order: readonly string[] = [],
): FlaggedSignal[] {
  if (session) {
    const posted = postedChipIds.length > 0 ? postedChipIds : (session.context_chips ?? []).map((chip) => chip.id)
    const merged = mergeSignalRows(library, session, posted, confirmed, dismissed, order)
    const rows = [...merged.raises, ...merged.lowers]
    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.chipId ?? row.id,
        label: row.label,
        status: row.state === 'dismissed' ? 'Dismissed' : row.origin,
      }))
    }
  }
  const reasons = session?.risk.reasons ?? projection?.risk.reasons ?? []
  return reasons.map((reason) => ({ id: reason.id, label: reason.label, status: null }))
}
