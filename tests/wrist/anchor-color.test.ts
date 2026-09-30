import { describe, it, expect } from 'vitest'
import { createAnchorColorFade, createAnchorColorState, parseAnchorColorOverrides, type AnchorColor } from '../../src/core/analysis/anchor-color'

// Ein Zustand blau/gelb/grau für Anker, periphere Leiste und Statistik (#88,
// Entscheidung #75). Zeit in Millisekunden, Bildrate 30 fps.

const FRAME_MS = 1000 / 30

interface Step {
  knick: number
  visible?: boolean
  /** Rutsch-Schutz-Faktor aus `createSlideShield` (1 = kein Rutschen). */
  slide?: number
}

/** Spielt eine Folge von Frames ab und liefert Zeit und Farbe je Frame. */
function play(steps: Step[], state = createAnchorColorState()) {
  return steps.map((s, i) => {
    const t = i * FRAME_MS
    const color = state.update({ knickDiff: s.knick, visible: s.visible ?? true, nowMs: t, slideDamping: s.slide })
    return { t, color }
  })
}

function hold(ms: number, step: Step): Step[] {
  return Array.from({ length: Math.round(ms / FRAME_MS) }, () => step)
}

function firstTime(out: { t: number; color: AnchorColor }[], color: AnchorColor, fromMs = 0) {
  return out.find((o) => o.t >= fromMs && o.color === color)?.t
}

describe('createAnchorColorState — Lehnen', () => {
  it('gerade Haltung bleibt blau', () => {
    const out = play(hold(3000, { knick: 2 }))
    expect(out.every((o) => o.color === 'blue')).toBe(true)
  })

  it('gehaltener Knick über 8° wird gelb, frühestens nach der Haltedauer von 500 ms', () => {
    const out = play(hold(2000, { knick: 15 }))
    const yellowAt = firstTime(out, 'yellow')
    expect(yellowAt).toBeDefined()
    expect(yellowAt!).toBeGreaterThanOrEqual(500)
    expect(yellowAt!).toBeLessThanOrEqual(1000)
  })
})

/** Vibrato: Knick schwingt mit 6 Hz um `centerDeg` (Winkel ohne Vorzeichen). */
function vibrato(ms: number, centerDeg: number, amplitudeDeg: number): Step[] {
  return Array.from({ length: Math.round(ms / FRAME_MS) }, (_, i) => ({
    knick: Math.abs(centerDeg + amplitudeDeg * Math.sin(2 * Math.PI * 6 * (i * FRAME_MS) / 1000)),
  }))
}

describe('createAnchorColorState — Vibrato', () => {
  it('Vibrato um die gerade Haltung bleibt blau', () => {
    const out = play(vibrato(5000, 0, 10))
    expect(out.every((o) => o.color === 'blue')).toBe(true)
  })

  it('Vibrato um eine geknickte Haltung wird gelb und bleibt gelb', () => {
    const out = play(vibrato(5000, 15, 10))
    const yellowAt = firstTime(out, 'yellow')
    expect(yellowAt).toBeDefined()
    expect(out.filter((o) => o.t > yellowAt!).every((o) => o.color === 'yellow')).toBe(true)
  })
})

describe('createAnchorColorState — Korrektur', () => {
  it('nach dem Zurückgehen in die gerade Haltung wird der Anker schnell wieder blau', () => {
    const out = play([...hold(2000, { knick: 15 }), ...hold(1000, { knick: 1 })])
    expect(out[Math.round(2000 / FRAME_MS) - 1]!.color).toBe('yellow')
    const blueAt = firstTime(out, 'blue', 2000)!
    // Mittelungsfenster muss unter 5° fallen (≈ 330 ms) + 150 ms Haltedauer.
    expect(blueAt - 2000).toBeLessThanOrEqual(600)
  })

  it('kurzer Mess-Ausreißer nach der Korrektur erzeugt kein Gelb-Blinken', () => {
    const out = play([
      ...hold(2000, { knick: 15 }),
      ...hold(800, { knick: 1 }),
      ...hold(200, { knick: 25 }), // Ausreißer, 0,2 s
      ...hold(2000, { knick: 1 }),
    ])
    const blueAt = firstTime(out, 'blue', 2000)!
    expect(out.filter((o) => o.t >= blueAt).every((o) => o.color === 'blue')).toBe(true)
  })
})

describe('createAnchorColorState — Rutsch-Schutz (#90/#93)', () => {
  // Der Rutsch-Schutz dämpft nur den Weg nach Gelb: Rutschen hält Blau, macht
  // aber nie Blau — sonst pendelt der Anker bei Korrektur-Rucken einer noch
  // geknickten Hand (Geigen-Test 29.09.).
  it('hält Blau, solange das Handgelenk rutscht (Lagenwechsel, Vibrato)', () => {
    const out = play(hold(2000, { knick: 12, slide: 0.35 }))
    expect(out.every((o) => o.color === 'blue')).toBe(true)
  })

  it('macht nicht blau: Korrektur-Ruck bei noch geknickter Hand bleibt gelb', () => {
    const out = play([...hold(1500, { knick: 12 }), ...hold(2000, { knick: 12, slide: 0.35 })])
    expect(out[Math.round(1500 / FRAME_MS) - 1]!.color).toBe('yellow')
    expect(out.filter((o) => o.t >= 1500).every((o) => o.color === 'yellow')).toBe(true)
  })

  it('echte Korrektur während des Rutschens wird so schnell blau wie ohne Rutschen', () => {
    const out = play([...hold(1500, { knick: 12 }), ...hold(1000, { knick: 3, slide: 0.35 })])
    const blueAt = firstTime(out, 'blue', 1500)!
    expect(blueAt - 1500).toBeLessThanOrEqual(600)
  })
})

describe('createAnchorColorState — Grau (Kamera sieht das Handgelenk nicht sicher)', () => {
  it('Hand kurz weg bei gerader Haltung → grau, nicht gelb', () => {
    // Während die Hand fehlt, liefert der Pose-Fallback grobe Werte (hier 30°).
    const out = play([...hold(1000, { knick: 1 }), ...hold(1000, { knick: 30, visible: false })])
    const after = out.filter((o) => o.t >= 1000)
    expect(after.some((o) => o.color === 'yellow')).toBe(false)
    expect(after.at(-1)!.color).toBe('grey')
  })

  it('zurück geknickt → nach kurzem Neu-Messen sofort gelb, ohne 500-ms-Haltedauer', () => {
    const out = play([
      ...hold(1000, { knick: 1 }),
      ...hold(1000, { knick: 0, visible: false }),
      ...hold(1000, { knick: 15 }),
    ])
    const yellowAt = firstTime(out, 'yellow', 2000)!
    expect(yellowAt - 2000).toBeGreaterThanOrEqual(150)
    expect(yellowAt - 2000).toBeLessThanOrEqual(250)
    // bis dahin grau, kein Blau-Zwischenschritt
    expect(out.filter((o) => o.t >= 2000 && o.t < yellowAt).every((o) => o.color === 'grey')).toBe(true)
  })

  it('zurück gerade → nach kurzem Neu-Messen sofort blau; alte Werte vor dem Grau zählen nicht', () => {
    const out = play([
      ...hold(2000, { knick: 20 }), // gelb
      ...hold(1000, { knick: 20, visible: false }),
      ...hold(1000, { knick: 1 }),
    ])
    expect(out[Math.round(2000 / FRAME_MS) - 1]!.color).toBe('yellow')
    const blueAt = firstTime(out, 'blue', 3000)!
    expect(blueAt - 3000).toBeLessThanOrEqual(250)
  })

  it('verschwindet die Hand während des Neu-Messens, beginnt das Neu-Messen von vorn', () => {
    const out = play([
      ...hold(1000, { knick: 0, visible: false }),
      ...hold(100, { knick: 1 }),
      { knick: 1, visible: false },
      ...hold(1000, { knick: 1 }),
    ])
    const back = 1000 + 100 + FRAME_MS
    const blueAt = firstTime(out, 'blue', 1000)!
    expect(blueAt - back).toBeGreaterThanOrEqual(150 - 1e-9)
  })
})

describe('parseAnchorColorOverrides — vorübergehender Test-Schalter per URL', () => {
  it('liest Schwellen und Zeiten aus den URL-Parametern', () => {
    expect(parseAnchorColorOverrides('?knickGelb=10&knickBlau=6&mittelMs=400&gelbMs=700&blauMs=100')).toEqual({
      enterDeg: 10, exitDeg: 6, averageMs: 400, toYellowMs: 700, toBlueMs: 100,
    })
  })

  it('ignoriert fehlende, leere und ungültige Werte', () => {
    expect(parseAnchorColorOverrides('')).toEqual({})
    expect(parseAnchorColorOverrides('?knickGelb=abc&knickBlau=-2&gelbMs=&foo=1')).toEqual({})
  })

  it('eine höhere Gelb-Schwelle per URL lässt 9° blau bleiben', () => {
    const state = createAnchorColorState(parseAnchorColorOverrides('?knickGelb=10'))
    const out = play(hold(2000, { knick: 9 }), state)
    expect(out.every((o) => o.color === 'blue')).toBe(true)
  })
})

describe('createAnchorColorFade — Farbwechsel mit ca. 0,2 s Überblenden', () => {
  it('zeigt die Farbe ohne Überblenden, solange sie sich nicht ändert', () => {
    const fade = createAnchorColorFade()
    expect(fade.update('blue', 0)).toEqual({ from: 'blue', to: 'blue', progress: 1 })
    expect(fade.update('blue', 500)).toEqual({ from: 'blue', to: 'blue', progress: 1 })
  })

  it('blendet beim Wechsel in 200 ms von der alten zur neuen Farbe über', () => {
    const fade = createAnchorColorFade()
    fade.update('blue', 0)
    expect(fade.update('yellow', 1000)).toEqual({ from: 'blue', to: 'yellow', progress: 0 })
    expect(fade.update('yellow', 1100).progress).toBeCloseTo(0.5, 6)
    expect(fade.update('yellow', 1200)).toEqual({ from: 'blue', to: 'yellow', progress: 1 })
  })

  it('startet beim Wechsel mitten im Überblenden von der gerade sichtbaren Farbe', () => {
    const fade = createAnchorColorFade()
    fade.update('blue', 0)
    fade.update('yellow', 1000)
    fade.update('yellow', 1150) // 75 % gelb
    expect(fade.update('grey', 1160)).toEqual({ from: 'yellow', to: 'grey', progress: 0 })
  })
})
