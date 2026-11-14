// Macht aus beliebigen `console`-Argumenten einen kurzen, datenschutz-sicheren Text
// fürs Diagnose-Log (docs/spec/stabilisierung.md, Abschnitt 6).

// Bilder (z. B. Canvas-Inhalt als data-Adresse) kommen nie ins Log.
const DATA_URL = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

/** Längster Text je Eintrag; hält ein Bündel weit unter 64 KiB. */
export const MAX_LOG_MESSAGE_CHARS = 2000

function scrub(text: string): string {
  const clean = text.replace(DATA_URL, '[Bild ausgelassen]').replace(EMAIL, '[E-Mail ausgelassen]')
  return clean.length > MAX_LOG_MESSAGE_CHARS ? `${clean.slice(0, MAX_LOG_MESSAGE_CHARS - 1)}…` : clean
}

const isPoint = (value: object): boolean =>
  'x' in value && 'y' in value && typeof value.x === 'number' && typeof value.y === 'number'

// Sucht (begrenzt tief) nach Körper-/Hand-Punkten, auch in Listen und Ergebnis-Objekten.
function containsPoints(value: unknown, depth = 0): boolean {
  if (typeof value !== 'object' || value === null || depth > 4) return false
  if (isPoint(value)) return true
  const children = Array.isArray(value) ? value : Object.values(value)
  return children.some((child) => containsPoints(child, depth + 1))
}

// Objekte werden nie ausgeschrieben: so geraten weder Punkte noch Personendaten ins Log.
function formatPart(part: unknown): string {
  if (part instanceof Error) return `${part.name}: ${part.message}`
  if (typeof part === 'object' && part !== null) {
    return containsPoints(part) ? '[Punkte ausgelassen]' : '[Objekt]'
  }
  return String(part)
}

export function formatLogMessage(parts: readonly unknown[]): string {
  return scrub(parts.map(formatPart).join(' '))
}
