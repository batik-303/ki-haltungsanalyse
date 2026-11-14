// Zählt Bilder der Erkennungs-Schleife und liefert je Zeitfenster die mittlere
// Bildrate (Bilder pro Sekunde) fürs Diagnose-Log. Keine Bildinhalte.

export function createFrameRateMeter(windowMs: number) {
  let windowStart: number | undefined
  let frames = 0

  return {
    /** Ein Bild zum Zeitpunkt `nowMs`; gibt am Fensterende die Bildrate zurück. */
    tick(nowMs: number): number | undefined {
      if (windowStart === undefined) {
        windowStart = nowMs
        return undefined
      }
      frames += 1
      const elapsed = nowMs - windowStart
      if (elapsed < windowMs) return undefined
      const fps = (frames * 1000) / elapsed
      windowStart = nowMs
      frames = 0
      return fps
    },
  }
}
