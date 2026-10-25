/** Display-only redaction. Demo/API payloads still carry names; the UI does not. */

export const CUSTOMER_LABEL = 'Customer'

const GENDERED =
  /\b(?:she|he|her|hers|him|his|herself|himself|woman|man|female|male|lady|gentleman)\b/gi

export function displayCustomerLabel(): string {
  return CUSTOMER_LABEL
}

export function personalNamesFrom(name: string): string[] {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 1)
  return [...new Set([name.trim(), ...parts].filter((part) => part.length > 0))]
}

export function redactPersonalCopy(text: string, names: readonly string[] = []): string {
  let out = text
  const extra = [...names].filter((name) => name.trim().length > 0).sort((left, right) => right.length - left.length)
  for (const name of extra) {
    out = out.replaceAll(name, CUSTOMER_LABEL)
  }
  out = out.replace(GENDERED, (match) => {
    if (match[0] === match[0]?.toUpperCase()) {
      return CUSTOMER_LABEL
    }
    return CUSTOMER_LABEL.toLowerCase()
  })
  return out
}

export function displaySpeaker(kind: 'dialogue' | 'transaction', speaker?: string, names: readonly string[] = []): string {
  if (speaker) {
    const redacted = redactPersonalCopy(speaker, names)
    if (redacted !== CUSTOMER_LABEL && !names.includes(speaker)) {
      return redacted
    }
  }
  if (kind === 'transaction' && !speaker) {
    return 'Transaction'
  }
  return CUSTOMER_LABEL
}
