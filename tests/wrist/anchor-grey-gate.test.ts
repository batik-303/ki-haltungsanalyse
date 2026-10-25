import { describe, it, expect } from 'vitest'
import { createAnchorGreyGate } from '../../src/core/analysis/anchor-visibility'
import type { AnchorColor } from '../../src/core/types'

// Grau-Tor (#92): Grau hat Vorrang vor blau/gelb, mit Zeit-Hysterese aus #74
// (grau erst nach 250 ms, zurück nach 150 ms neu messen).

const FRAME_MS = 1000 / 30

function run(
  gate: ReturnType<typeof createAnchorGreyGate>,
  step: { visible: boolean; isBlue: boolean },
  frames: number,
  clock: { t: number },
): AnchorColor[] {
  const out: AnchorColor[] = []
  for (let i = 0; i < frames; i++) {
    out.push(gate.update({ visible: step.visible, nowMs: clock.t, measureIsBlue: () => step.isBlue }))
    clock.t += FRAME_MS
  }
  return out
}

describe('createAnchorGreyGate', () => {
  it('kurzer Sichtverlust (< 250 ms): letzte Farbe bleibt stehen, danach grau', () => {
    const gate = createAnchorGreyGate()
    const clock = { t: 0 }
    run(gate, { visible: true, isBlue: false }, 10, clock)
    const hidden = run(gate, { visible: false, isBlue: true }, 12, clock)
    expect(hidden.slice(0, 7).every((c) => c === 'yellow')).toBe(true)
    expect(hidden.at(-1)).toBe('grey')
  })

  it('ohne sichere Sicht wird nicht gemessen', () => {
    const gate = createAnchorGreyGate()
    let calls = 0
    for (let i = 0; i < 20; i++) {
      gate.update({ visible: false, nowMs: i * FRAME_MS, measureIsBlue: () => { calls++; return true } })
    }
    expect(calls).toBe(0)
  })

  it('wieder sichtbar nach grau: 150 ms neu messen (grau bleibt), dann die gemessene Farbe', () => {
    const gate = createAnchorGreyGate()
    const clock = { t: 0 }
    run(gate, { visible: false, isBlue: true }, 12, clock)
    const back = run(gate, { visible: true, isBlue: true }, 8, clock)
    expect(back.slice(0, 4).every((c) => c === 'grey')).toBe(true)
    expect(back.at(-1)).toBe('blue')
  })

  it('während des Neu-Messens wird schon gemessen (Blau/Gelb-Zustand sieht neue Werte)', () => {
    const gate = createAnchorGreyGate()
    const clock = { t: 0 }
    run(gate, { visible: false, isBlue: true }, 12, clock)
    let calls = 0
    gate.update({ visible: true, nowMs: clock.t, measureIsBlue: () => { calls++; return false } })
    expect(calls).toBe(1)
  })

  it('hide (kein Körper im Bild) wirkt wie ein Frame ohne sichere Sicht', () => {
    const gate = createAnchorGreyGate()
    const clock = { t: 0 }
    run(gate, { visible: true, isBlue: false }, 10, clock)
    const out: AnchorColor[] = []
    for (let i = 0; i < 12; i++) {
      out.push(gate.hide(clock.t))
      clock.t += FRAME_MS
    }
    expect(out[0]).toBe('yellow')
    expect(out.at(-1)).toBe('grey')
  })
})
