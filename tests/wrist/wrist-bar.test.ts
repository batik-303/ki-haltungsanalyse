import { describe, it, expect } from 'vitest'
import { createWristBarTilt, isKnickTowardNeck } from '../../src/core/analysis/wrist-bar'
import type { AnchorColor, KnickSide } from '../../src/core/types'

// Periphere Leiste (#76/#94): Arm unten fest, Anker = Gelenk, Hand oben kippt.
// tiltDeg ist der Kippwinkel der Hand, wie die Nutzerin den (gespiegelten)
// Bildschirm sieht: negativ = links, positiv = rechts.

const FRAME_MS = 1000 / 30

interface Step {
  color: AnchorColor
  knickDiff: number
  knickSide: KnickSide
}

/** Spielt `frames` gleiche Frames ab (30 fps) und liefert alle Ergebnisse. */
function run(bar: ReturnType<typeof createWristBarTilt>, step: Step, frames: number, start = { t: 0 }) {
  const out = []
  for (let i = 0; i < frames; i++) {
    start.t += FRAME_MS
    out.push(bar.update({ ...step, nowMs: start.t }))
  }
  return out
}

describe('createWristBarTilt — blau', () => {
  it('Hand steht gerade, egal wie groß die Abweichung innerhalb der Toleranz ist', () => {
    const bar = createWristBarTilt()
    for (const knickDiff of [0, 4, 7.9, 12]) {
      const out = run(bar, { color: 'blue', knickDiff, knickSide: 1 }, 30)
      expect(out.every((o) => o.tiltDeg === 0)).toBe(true)
    }
  })
})

// #188: Beim Korrigieren folgt die Hand dem echten Handgelenk auch im Blau
// weiter, bis es wirklich gerade ist („ah, ich bin angekommen“). Im Blau darf
// die Neigung nur kleiner werden (Ratsche): kein Wackeln bei Vibrato/Lagenwechsel.
describe('createWristBarTilt — folgt bis gerade (#188)', () => {
  /** Gelb mit 20° einschwingen lassen (Seite −1 → Hand rechts, positiv). */
  function afterYellow() {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    const yellow = run(bar, { color: 'yellow', knickDiff: 20, knickSide: -1 }, 60, clock)
    return { bar, clock, last: yellow.at(-1)!.tiltDeg }
  }

  it('gelb → blau: kein Sprung, die Hand folgt dem Knick 4, 3, 2, 1, 0 (× 1,5)', () => {
    const { bar, clock, last } = afterYellow()
    const tilts = [last]
    const settled: number[] = []
    for (const knickDiff of [4, 3, 2, 1, 0]) {
      const out = run(bar, { color: 'blue', knickDiff, knickSide: -1 }, 30, clock)
      tilts.push(...out.map((o) => o.tiltDeg))
      settled.push(out.at(-1)!.tiltDeg)
    }
    expect(tilts[1]!).toBeGreaterThan(last * 0.6)
    expect(tilts.slice(1).every((t, i) => t <= tilts[i]! && t >= 0)).toBe(true)
    expect(settled[0]).toBeCloseTo(6, 0)
    expect(settled[1]).toBeCloseTo(4.5, 0)
    // Unter 3° Knick zählt Blau als gerade (Anzeige-Totzone).
    expect(settled[2]).toBe(0)
    expect(settled[3]).toBe(0)
    expect(settled[4]).toBe(0)
  })

  it('Handgelenk bleibt im Blau bei 2,5° stehen (Messrauschen): Hand geht stetig auf gerade', () => {
    const { bar, clock, last } = afterYellow()
    const out = run(bar, { color: 'blue', knickDiff: 2.5, knickSide: -1 }, 30, clock)
    const tilts = [last, ...out.map((o) => o.tiltDeg)]
    expect(tilts[1]!).toBeGreaterThan(last * 0.6)
    expect(tilts.slice(1).every((t, i) => t <= tilts[i]! && t >= 0)).toBe(true)
    expect(out.at(-1)!.tiltDeg).toBe(0)
  })

  it('einmal gerade, bleibt gerade: Knick 3° im Blau → Hand bleibt bei 0', () => {
    const { bar, clock } = afterYellow()
    run(bar, { color: 'blue', knickDiff: 0, knickSide: -1 }, 30, clock)
    const out = run(bar, { color: 'blue', knickDiff: 3, knickSide: -1 }, 30, clock)
    expect(out.every((o) => o.tiltDeg === 0)).toBe(true)
  })

  it('Knick schwankt im Blau 4 → 2 → 4: die Hand kippt nicht wieder weiter', () => {
    const { bar, clock } = afterYellow()
    run(bar, { color: 'blue', knickDiff: 4, knickSide: -1 }, 30, clock)
    const low = run(bar, { color: 'blue', knickDiff: 2, knickSide: -1 }, 30, clock)
    const again = run(bar, { color: 'blue', knickDiff: 4, knickSide: -1 }, 30, clock)
    const floor = low.at(-1)!.tiltDeg
    expect(again.every((o) => o.tiltDeg <= floor)).toBe(true)
  })
})

describe('createWristBarTilt — grau (#92: Kamera sieht das Handgelenk nicht sicher)', () => {
  it('Hand steht gerade: ohne sichere Sicht keine Richtung', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 12, knickSide: 1 }, 30, clock)
    const out = run(bar, { color: 'grey', knickDiff: 12, knickSide: 1 }, 30, clock)
    expect(out.at(-1)!.tiltDeg).toBe(0)
  })

  it('gelb → grau → blau: kein Leuchten — wieder Sicht ist keine Korrektur', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 12, knickSide: 1 }, 30, clock)
    const grey = run(bar, { color: 'grey', knickDiff: 12, knickSide: 1 }, 30, clock)
    const blue = run(bar, { color: 'blue', knickDiff: 2, knickSide: 1 }, 30, clock)
    expect([...grey, ...blue].every((o) => o.anchorGlow === 0)).toBe(true)
  })
})

describe('createWristBarTilt — gelb', () => {
  it('Hand kippt nach dem Einschwingen um Abweichung × 1,5', () => {
    const bar = createWristBarTilt()
    const out = run(bar, { color: 'yellow', knickDiff: 10, knickSide: -1 }, 60)
    expect(Math.abs(out.at(-1)!.tiltDeg)).toBeCloseTo(15, 1)
  })

  it('höchstens 40°, auch bei großer Abweichung', () => {
    const bar = createWristBarTilt()
    const out = run(bar, { color: 'yellow', knickDiff: 45, knickSide: -1 }, 60)
    expect(out.every((o) => Math.abs(o.tiltDeg) <= 40)).toBe(true)
    expect(Math.abs(out.at(-1)!.tiltDeg)).toBeCloseTo(40, 1)
  })

  it('kippt sanft: kein Sprung von gerade auf voll im ersten Frame', () => {
    const bar = createWristBarTilt()
    const out = run(bar, { color: 'yellow', knickDiff: 20, knickSide: -1 }, 60)
    expect(Math.abs(out[0]!.tiltDeg)).toBeLessThan(10)
  })
})

// Seite +1 = Hand dreht im (ungespiegelten) Kamerabild im Uhrzeigersinn. Auf
// dem gespiegelten Bildschirm dreht sie gegen den Uhrzeigersinn → die Hand
// der senkrechten Leiste kippt nach links. Live abzunehmen: Hals = links.
describe('createWristBarTilt — Richtung', () => {
  it('Seite +1 → Hand kippt nach links', () => {
    const out = run(createWristBarTilt(), { color: 'yellow', knickDiff: 10, knickSide: 1 }, 60)
    expect(out.at(-1)!.tiltDeg).toBeCloseTo(-15, 1)
  })

  it('Seite −1 → Hand kippt nach rechts', () => {
    const out = run(createWristBarTilt(), { color: 'yellow', knickDiff: 10, knickSide: -1 }, 60)
    expect(out.at(-1)!.tiltDeg).toBeCloseTo(15, 1)
  })
})

// Wunsch der Nutzerin (30.09.): Die Hand bleibt ruhig auf einer Seite und
// wackelt nicht nervös hin und her.
describe('createWristBarTilt — ruhige Richtung', () => {
  it('Seite kurz unbekannt (0) während gelb: Hand behält ihre Richtung', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 10, knickSide: 1 }, 30, clock)
    const out = run(bar, { color: 'yellow', knickDiff: 10, knickSide: 0 }, 10, clock)
    expect(out.every((o) => o.tiltDeg < 0)).toBe(true)
  })

  it('Seite flackert Frame für Frame: Hand bleibt auf ihrer Seite', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 10, knickSide: 1 }, 30, clock)
    const out = []
    for (let i = 0; i < 60; i++) {
      const knickSide: KnickSide = i % 2 === 0 ? -1 : 1
      out.push(...run(bar, { color: 'yellow', knickDiff: 10, knickSide }, 1, clock))
    }
    expect(out.every((o) => o.tiltDeg < 0)).toBe(true)
  })

  it('kurz (0,2 s) die andere Seite: Hand bleibt auf ihrer Seite', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 10, knickSide: 1 }, 30, clock)
    const out = run(bar, { color: 'yellow', knickDiff: 10, knickSide: -1 }, 6, clock)
    expect(out.every((o) => o.tiltDeg < 0)).toBe(true)
  })

  it('andere Seite hält an (1 s): Hand wechselt auf die andere Seite', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 10, knickSide: 1 }, 30, clock)
    const out = run(bar, { color: 'yellow', knickDiff: 10, knickSide: -1 }, 30, clock)
    expect(out.at(-1)!.tiltDeg).toBeGreaterThan(0)
  })

  it('beim Seitenwechsel schwenkt die Hand hinüber, statt zu springen', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    const before = run(bar, { color: 'yellow', knickDiff: 10, knickSide: 1 }, 30, clock)
    const after = run(bar, { color: 'yellow', knickDiff: 10, knickSide: -1 }, 30, clock)
    const tilts = [...before, ...after].map((o) => o.tiltDeg)
    const maxStep = Math.max(...tilts.slice(1).map((t, i) => Math.abs(t - tilts[i]!)))
    expect(maxStep).toBeLessThan(8)
  })

  it('beim Gelbwerden zeigt die Hand gleich zur Seite, auf der sie schon 0,5 s lehnt', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'blue', knickDiff: 2, knickSide: 1 }, 30, clock)
    run(bar, { color: 'blue', knickDiff: 8, knickSide: -1 }, 15, clock)
    const out = run(bar, { color: 'yellow', knickDiff: 10, knickSide: -1 }, 5, clock)
    expect(out.every((o) => o.tiltDeg > 0)).toBe(true)
  })
})

describe('createWristBarTilt — Belohnung bei Korrektur', () => {
  /** Anzahl der Leucht-Pulse (Anstiege von 0 auf > 0). */
  const pulses = (glows: number[]) => glows.filter((g, i) => g > 0 && (glows[i - 1] ?? 0) === 0).length

  it('von Anfang an blau: der Anker leuchtet nicht', () => {
    const out = run(createWristBarTilt(), { color: 'blue', knickDiff: 2, knickSide: 1 }, 60)
    expect(out.every((o) => o.anchorGlow === 0)).toBe(true)
  })

  it('gelb → blau: Anker leuchtet genau einmal voll auf und ist nach ≈ 0,8 s wieder ruhig', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    run(bar, { color: 'yellow', knickDiff: 12, knickSide: 1 }, 30, clock)
    const out = run(bar, { color: 'blue', knickDiff: 3, knickSide: 1 }, 90, clock)
    const glows = out.map((o) => o.anchorGlow)
    expect(glows[0]).toBeCloseTo(1, 1)
    expect(pulses(glows)).toBe(1)
    expect(glows[27]).toBe(0) // 0,9 s nach der Korrektur: Ruhe, kein Pulsieren
    expect(glows.slice(27).every((g) => g === 0)).toBe(true)
  })

  it('zwei Korrekturen → zwei Pulse', () => {
    const bar = createWristBarTilt()
    const clock = { t: 0 }
    const glows: number[] = []
    for (let k = 0; k < 2; k++) {
      glows.push(...run(bar, { color: 'yellow', knickDiff: 12, knickSide: 1 }, 30, clock).map((o) => o.anchorGlow))
      glows.push(...run(bar, { color: 'blue', knickDiff: 3, knickSide: 1 }, 45, clock).map((o) => o.anchorGlow))
    }
    expect(pulses(glows)).toBe(2)
  })
})

describe('isKnickTowardNeck (#130)', () => {
  it('Seite +1 = zum Hals (links auf dem gespiegelten Bildschirm, wie die Leiste)', () => {
    expect(isKnickTowardNeck(1)).toBe(true)
  })
  it('Seite -1 = zur Schnecke', () => {
    expect(isKnickTowardNeck(-1)).toBe(false)
  })
  it('unbekannte Seite zählt nicht als Hals (strengere Grenze)', () => {
    expect(isKnickTowardNeck(0)).toBe(false)
  })
})
