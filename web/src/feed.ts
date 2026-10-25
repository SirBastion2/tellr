import type { ActivityRow, ChipSource, ContextChipEcho, HandoffProjection, Library, SessionState } from './types'

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

export function activityKey(row: ActivityRow): string {
  return `${row.ts}|${row.channel}|${row.type}`
}

export function rememberActivityRows(
  seen: readonly ActivityRow[],
  incoming: readonly ActivityRow[],
): ActivityRow[] {
  const keys = new Set(seen.map(activityKey))
  const next = [...seen]
  for (const row of incoming) {
    const key = activityKey(row)
    if (!keys.has(key)) {
      next.push(row)
      keys.add(key)
    }
  }
  return next
}

export function visibleActivityRows(
  seen: readonly ActivityRow[],
  current: readonly ActivityRow[] | null,
  dismissed: readonly string[],
): ActivityRow[] {
  const currentKeys = new Set((current ?? []).map(activityKey))
  return seen.filter((row) => currentKeys.has(activityKey(row)) || dismissed.includes(row.channel))
}

export type FlaggedSignal = {
  id: string
  label: string
  status: 'Observed' | 'Teller confirmed' | 'Dismissed' | null
}

function chipLabel(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.label ?? id
}

function chipSignalId(library: Library | null, id: string): string {
  return library?.context_chips.find((chip) => chip.id === id)?.signal ?? id
}

/** Display-only list of signals the final SessionState already reports. */
export function flaggedSignals(
  session: SessionState | null,
  projection: HandoffProjection | null,
  library: Library | null,
  dismissed: readonly string[] = [],
  confirmed: readonly string[] = [],
): FlaggedSignal[] {
  const chips = session?.context_chips ?? []
  const reasons = session?.risk.reasons ?? projection?.risk.reasons ?? []
  const chipIds = listedChipIds(
    chips.map((chip) => chip.id),
    chips,
    dismissed,
  )
  const items: FlaggedSignal[] = []
  const shown = new Set<string>()

  for (const id of chipIds) {
    const source = sourceForChip(chips, id)
    const status = fileSignalStatus(
      chips.some((chip) => chip.id === id),
      confirmed.includes(id),
      dismissed.includes(id),
      source,
    )
    items.push({
      id,
      label: chipLabel(library, id),
      status: status === 'Not yet' ? null : status,
    })
    shown.add(id)
    shown.add(chipSignalId(library, id))
  }

  if (chipIds.length === 0) {
    for (const reason of reasons) {
      items.push({ id: reason.id, label: reason.label, status: null })
    }
    return items
  }

  for (const reason of reasons) {
    if (shown.has(reason.id)) {
      continue
    }
    items.push({ id: reason.id, label: reason.label, status: null })
    shown.add(reason.id)
  }
  return items
}
