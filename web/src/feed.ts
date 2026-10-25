import type { ChipSource, ContextChipEcho } from './types'

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
): string[] {
  const ids = [...posted]
  for (const chip of chips ?? []) {
    if (!ids.includes(chip.id)) {
      ids.push(chip.id)
    }
  }
  return ids
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
