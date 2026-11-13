import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionTracker } from '../../src/core/session/session-tracker'
import type { Layer } from '../../src/core/types'

/**
 * #168: Charakterisierungs-Tests für den Sitzungs-Zähler.
 * Die Uhr (`performance.now`) wird im Test gesteuert; `dt` kommt in Sekunden.
 */
let nowMs = 0
beforeEach(() => {
  nowMs = 0
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs)
})
afterEach(() => {
  vi.restoreAllMocks()
})

type Tracker = ReturnType<typeof createSessionTracker>

/** Spielt `n` Bilder mit gleicher Spannung ab und lässt die Uhr mitlaufen. */
function play(tracker: Tracker, n: number, tension: number, layer: Layer = 'flow', dt = 0.1, repaired = false) {
  let last = tracker.recordFrame(tension, layer, dt, repaired)
  nowMs += dt * 1000
  for (let i = 1; i < n; i++) {
    last = tracker.recordFrame(tension, layer, dt, repaired)
    nowMs += dt * 1000
  }
  return last
}

describe('createSessionTracker – Start und Stopp', () => {
  it('liefert beim Stopp ohne Start null', () => {
    expect(createSessionTracker('wrist').stop()).toBeNull()
  })

  it('liefert null bei weniger als 30 Bildern', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 29, 0)
    expect(t.stop()).toBeNull()
  })

  it('zählt Ebenen und Anteile über die Sitzung', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 30, 0, 'flow')
    play(t, 10, 30, 'bewusst')
    const stats = t.stop()!
    expect(stats.totalFrames).toBe(40)
    expect(stats.zones).toEqual({ flow: 30, bewusst: 10, achtung: 0, limit: 0 })
    expect(stats.zonePercentages.flow).toBeCloseTo(75, 10)
    expect(stats.zonePercentages.bewusst).toBeCloseTo(25, 10)
  })

  it('misst die Dauer über performance.now und teilt sie in Minuten und Sekunden', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 30, 0)
    nowMs = 125_400
    const stats = t.stop()!
    expect(stats.durationMs).toBe(125_400)
    expect(stats.durationMinutes).toBe(2)
    expect(stats.durationSeconds).toBe(5)
  })

  it('zählt vor dem Start keine Bilder', () => {
    const t = createSessionTracker('wrist')
    play(t, 50, 0)
    t.start()
    play(t, 30, 0)
    expect(t.stop()!.totalFrames).toBe(30)
  })

  it('setzt beim neuen Start die Zähler zurück', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 40, 90, 'limit')
    t.stop()
    t.start()
    play(t, 30, 0, 'flow')
    expect(t.stop()!.zones).toEqual({ flow: 30, bewusst: 0, achtung: 0, limit: 0 })
  })
})

describe('createSessionTracker – Zeitleiste', () => {
  it('nimmt etwa einmal pro Sekunde eine gerundete Probe', () => {
    const t = createSessionTracker('wrist')
    t.start()
    // 0,25 s je Bild: nach 4 Bildern ist 1 s voll
    play(t, 4, 12.6, 'flow', 0.25)
    play(t, 4, 40.2, 'bewusst', 0.25)
    play(t, 22, 0, 'flow', 0.25)
    const { tensionTimeline } = t.stop()!
    expect(tensionTimeline[0]).toEqual({ t: 1, tension: 13, layer: 'flow' })
    expect(tensionTimeline[1]).toEqual({ t: 2, tension: 40, layer: 'bewusst' })
    expect(tensionTimeline).toHaveLength(7) // 30 × 0,25 s = 7,5 s
  })
})

describe('createSessionTracker – Rückkehr-Glühen', () => {
  it('glüht 1,5 s nach Rückkehr, wenn die Spannung vorher ≥ 0,3 s erhöht war', () => {
    const t = createSessionTracker('wrist')
    play(t, 3, 25) // 3 × 0,1 s über 20
    const r = t.recordFrame(0, 'flow', 0.1)
    expect(r.glowTimer).toBeCloseTo(1.4, 10) // 1,5 − dt desselben Bildes
  })

  it('glüht nicht nach kurzer Erhöhung (< 0,3 s)', () => {
    const t = createSessionTracker('wrist')
    play(t, 2, 25)
    expect(t.recordFrame(0, 'flow', 0.1).glowTimer).toBe(0)
  })

  it('glüht erst, wenn die Spannung unter die Belohnungs-Grenze fällt', () => {
    const t = createSessionTracker('wrist')
    play(t, 3, 25)
    expect(t.recordFrame(10, 'flow', 0.1).glowTimer).toBe(0) // wrist: Grenze 8
    expect(t.recordFrame(7, 'flow', 0.1).glowTimer).toBeCloseTo(1.4, 10)
  })

  it('nutzt je Modus eigene Grenzen (Geige: erhöht über 15)', () => {
    const violin = createSessionTracker('violin')
    const wrist = createSessionTracker('wrist')
    play(violin, 3, 18)
    play(wrist, 3, 18)
    expect(violin.recordFrame(0, 'flow', 0.1).glowTimer).toBeGreaterThan(0)
    expect(wrist.recordFrame(0, 'flow', 0.1).glowTimer).toBe(0)
  })

  it('lässt das Glühen mit der Zeit bis 0 abklingen', () => {
    const t = createSessionTracker('wrist')
    play(t, 3, 25)
    t.recordFrame(0, 'flow', 0.1)
    expect(play(t, 20, 0).glowTimer).toBe(0)
  })
})

describe('createSessionTracker – Flow-Serie', () => {
  it('zählt Zeit unter Spannung 5 als Serie', () => {
    const t = createSessionTracker('wrist')
    const r = play(t, 10, 0)
    expect(r.streakSeconds).toBeCloseTo(1, 10)
    expect(r.maxStreak).toBeCloseTo(1, 10)
  })

  it('hält die Serie während 500 ms Schonfrist und bricht danach ab', () => {
    const t = createSessionTracker('wrist')
    play(t, 10, 0)
    expect(play(t, 5, 30).streakSeconds).toBeCloseTo(1, 10) // genau 500 ms: hält
    const r = t.recordFrame(30, 'bewusst', 0.1) // 600 ms: Abbruch
    expect(r.streakSeconds).toBe(0)
    expect(r.maxStreak).toBeCloseTo(1, 10)
  })

  it('setzt die Schonfrist zurück, sobald wieder Flow ist', () => {
    const t = createSessionTracker('wrist')
    play(t, 10, 0)
    play(t, 4, 30)
    play(t, 1, 0)
    expect(play(t, 5, 30).streakSeconds).toBeCloseTo(1.1, 10)
  })

  it('meldet die längste Serie in der Statistik', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 20, 0)
    play(t, 10, 30, 'bewusst')
    play(t, 5, 0)
    expect(t.stop()!.maxFlowStreak).toBeCloseTo(2, 10)
  })
})

describe('createSessionTracker – Ankerpunkte und Meilensteine', () => {
  it('gibt 1 Ankerpunkt je 5 s im reparierten Zustand', () => {
    const t = createSessionTracker('wrist')
    t.start()
    play(t, 32, 0, 'flow', 0.5, true) // 16 s
    const stats = t.stop()!
    expect(stats.anchorPoints).toBe(3)
    expect(stats.repairedTime).toBe(16)
  })

  it('zählt Halte-Meilensteine und merkt sich die höchste Stufe', () => {
    const t = createSessionTracker('wrist')
    t.start()
    t.recordFrame(0, 'flow', 0.1, false, true, 2)
    t.recordFrame(0, 'flow', 0.1, false, true, 1)
    t.recordFrame(0, 'flow', 0.1, false, false, 9)
    play(t, 30, 0)
    const stats = t.stop()!
    expect(stats.holdMilestones).toBe(2)
    expect(stats.bestMilestoneLevel).toBe(2)
  })
})
