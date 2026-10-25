import type { ChipSource, ContextChipEcho, Library } from './types'

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

export function listedChipIds(
  posted: readonly string[],
  chips: readonly ContextChipEcho[] | undefined,
  dismissed: readonly string[] = [],
): string[] {
  const ids = [...posted]
  for (const chip of chips ?? []) {
    if (!ids.includes(chip.id)) {
      ids.push(chip.id)
    }
  }
  for (const id of dismissed) {
    if (!ids.includes(id)) {
      ids.push(id)
    }
  }
  return ids
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
