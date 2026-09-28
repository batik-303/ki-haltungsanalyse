// Ab dieser Handgelenk-Geschwindigkeit (Bildbreiten pro Sekunde) gilt die
// Bewegung als Rutschen (Lagenwechsel, Vibrato). Geigen-Test 28.09.: 0,45
// verpasste kleine, ruhige Lagenwechsel; mit 0,2 bleiben sie blau, echter
// Knick im Stillstand wird weiter sofort gelb.
const SLIDE_SPEED_THRESHOLD = 0.2
// So lange hält der Schutz nach der letzten schnellen Bewegung an.
const SLIDE_SHIELD_SECONDS = 0.22
// Anteil des Knicks, der während des Schutzes in die Farbe zählt.
export const SLIDE_DAMPING = 0.35

/**
 * Factory: Rutsch-Schutz für den Knick. Rutscht das Handgelenk, zählt der
 * Knick kurz nur gedämpft — Messsprünge beim Lagenwechsel und im Vibrato
 * sollen den Anker nicht gelb färben. Echter Knick im Stillstand bleibt
 * voll empfindlich.
 */
export function createSlideShield() {
  let prev: { x: number; y: number } | null = null
  let remaining = 0

  /** Liefert den Dämpfungsfaktor für diesen Frame (1 = keine Dämpfung). */
  function update(wrist: { x: number; y: number }, dt: number): number {
    if (prev && dt > 0) {
      const speed = Math.hypot(wrist.x - prev.x, wrist.y - prev.y) / dt
      if (speed > SLIDE_SPEED_THRESHOLD) remaining = SLIDE_SHIELD_SECONDS
    }
    prev = { x: wrist.x, y: wrist.y }
    if (remaining > 0) remaining = Math.max(0, remaining - dt)
    return remaining > 0 ? SLIDE_DAMPING : 1
  }

  function reset() {
    prev = null
    remaining = 0
  }

  return { update, reset }
}
