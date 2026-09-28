import { describe, it, expect } from 'vitest'
import { createSlideShield, SLIDE_DAMPING } from '../../src/core/analysis/slide-shield'

// Rutsch-Schutz: Während das Handgelenk rutscht (Lagenwechsel, Vibrato),
// zählt der Knick nur gedämpft in die Farbe. Geigen-Test 28.09.: Schon
// kleine, ruhige Lagenwechsel (1. → 3. Lage) müssen den Schutz auslösen,
// sonst springt der Anker trotz geradem Handgelenk kurz auf Gelb.

const DT = 1 / 30

/** Bewegt das Handgelenk mit `speed` (Bildbreiten pro Sekunde) über `frames` Frames. */
function move(shield: ReturnType<typeof createSlideShield>, speed: number, frames: number, start = 0.5) {
  let x = start
  let factor = 1
  for (let i = 0; i < frames; i++) {
    x = start + i * speed * DT
    factor = shield.update({ x, y: 0.5 }, DT)
  }
  return { factor, x }
}

describe('createSlideShield', () => {
  it('Stillstand mit leichtem Zittern: keine Dämpfung', () => {
    const shield = createSlideShield()
    let factor = 1
    for (let i = 0; i < 60; i++) {
      // ±0,001 um die Ruhelage ≈ 0,06 Bildbreiten/s
      factor = shield.update({ x: 0.5 + (i % 2 === 0 ? 0.001 : -0.001), y: 0.5 }, DT)
      expect(factor).toBe(1)
    }
  })

  it('kleiner, ruhiger Lagenwechsel (0,25/s) löst den Schutz aus', () => {
    const shield = createSlideShield()
    expect(move(shield, 0.25, 6).factor).toBe(SLIDE_DAMPING)
  })

  it('schneller Rutsch löst den Schutz aus', () => {
    const shield = createSlideShield()
    expect(move(shield, 0.8, 6).factor).toBe(SLIDE_DAMPING)
  })

  it('Schutz klingt nach dem Rutsch ab (≈ 0,22 s)', () => {
    const shield = createSlideShield()
    const { x } = move(shield, 0.8, 6)
    // Kurz nach dem Rutsch noch gedämpft …
    for (let i = 0; i < 3; i++) expect(shield.update({ x, y: 0.5 }, DT)).toBe(SLIDE_DAMPING)
    // … nach ≈ 0,22 s wieder volle Empfindlichkeit.
    let factor = SLIDE_DAMPING
    for (let i = 0; i < 6; i++) factor = shield.update({ x, y: 0.5 }, DT)
    expect(factor).toBe(1)
  })

  it('reset: erster Frame danach misst keine Geschwindigkeit', () => {
    const shield = createSlideShield()
    move(shield, 0.8, 6)
    shield.reset()
    expect(shield.update({ x: 0.1, y: 0.5 }, DT)).toBe(1)
  })
})
