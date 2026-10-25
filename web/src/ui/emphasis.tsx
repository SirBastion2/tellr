const PHRASES = [
  'on the phone',
  'cash only',
  'in cash',
  'word for word',
  'not to explain',
  'not to mention',
  'not in a hurry',
  "cashier's check",
  'cashier’s check',
]

export type TextPart = { text: string; strong: boolean }

/** Bold amounts and the facts a teller scans for. Does not score anything. */
export function emphasize(text: string): TextPart[] {
  const ranges: { start: number; end: number }[] = []
  const lower = text.toLowerCase()
  for (const needle of PHRASES) {
    const probe = needle.toLowerCase()
    let from = 0
    while (from < text.length) {
      const at = lower.indexOf(probe, from)
      if (at < 0) {
        break
      }
      ranges.push({ start: at, end: at + needle.length })
      from = at + needle.length
    }
  }
  for (const match of text.matchAll(/\$\d[\d,]*/g)) {
    if (match.index !== undefined) {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: { start: number; end: number }[] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (!last || range.start >= last.end) {
      merged.push({ ...range })
    }
  }
  const parts: TextPart[] = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) {
      parts.push({ text: text.slice(cursor, range.start), strong: false })
    }
    parts.push({ text: text.slice(range.start, range.end), strong: true })
    cursor = range.end
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), strong: false })
  }
  if (parts.length === 0) {
    parts.push({ text, strong: false })
  }
  return parts
}

export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {emphasize(text).map((part, index) =>
        part.strong ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
      )}
    </>
  )
}
