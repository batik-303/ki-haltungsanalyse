import { describe, expect, it } from 'vitest'
import {
  createSaveSequence,
  computeSaveSequenceView,
  SAVE_READ_MS,
  SAVE_STILL_MS,
  SAVE_SETTLE_TIMEOUT_MS,
  SAVE_PAUSE_GRACE_MS,
  SAVE_RESUME_MS,
  type SaveSequenceInput,
} from '../../src/core/calibration/save-sequence'

/**
 * Ticket #118 (Entscheidungen aus #116): Speichern ruhig einleiten.
 *
 * Nach „speichern“/Tippen nicht sofort 3 – 2 – 1, sondern:
 *   reading  (Lesezeit ≈ 2 s, nichts passiert)
 *   settling (warten, bis das Handgelenk ≈ 1 s ruhig ist; Sicherheitsnetz ≈ 5 s)
 *   counting (3 – 2 – 1, nur hier wird der Knick gesammelt)
 *   → capture (genau einmal), danach done.
 * Passt der Abstand unterwegs nicht mehr → paused (gelb + Richtung), passt er
 * wieder → weiter mit „Halte still“ (settling), kein Neustart.
 */

const STILL: SaveSequenceInput = {
  dtMs: 100,
  distanceStatus: 'good',
  wrist: { x: 0.5, y: 0.5 },
  aspect: 16 / 9,
  shoulderWidth: 0.25,
}

/** Lässt die Folge `ms` lang mit festem Eingang laufen (100-ms-Schritte). */
function run(seq: ReturnType<typeof createSaveSequence>, ms: number, input: Partial<SaveSequenceInput> = {}) {
  let out = seq.state()
  for (let t = 0; t < ms; t += 100) out = seq.update({ ...STILL, ...input })
  return out
}

/** Handgelenk wandert bei jedem Bild ein großes Stück (nie ruhig). */
function runMoving(seq: ReturnType<typeof createSaveSequence>, ms: number) {
  let out = seq.state()
  for (let t = 0, i = 0; t < ms; t += 100, i++) {
    out = seq.update({ ...STILL, wrist: { x: 0.3 + (i % 2) * 0.2, y: 0.5 } })
  }
  return out
}

describe('createSaveSequence', () => {
  it('beginnt mit der Lesezeit — kein Zählen, kein Sammeln', () => {
    const seq = createSaveSequence()
    const s = seq.state()
    expect(s.step).toBe('reading')
    expect(s.count).toBeNull()
    expect(s.sampling).toBe(false)
    expect(s.capture).toBe(false)
  })

  it('bleibt während der Lesezeit in reading, auch wenn das Handgelenk ruhig ist', () => {
    const seq = createSaveSequence()
    const s = run(seq, SAVE_READ_MS - 100)
    expect(s.step).toBe('reading')
  })

  it('zählt nach der Lesezeit sofort, wenn das Handgelenk schon ruhig ist', () => {
    const seq = createSaveSequence()
    const s = run(seq, SAVE_READ_MS)
    expect(s.step).toBe('counting')
    expect(s.count).toBe(3)
    expect(s.sampling).toBe(true)
  })

  it('wartet nach der Lesezeit, bis das Handgelenk ruhig ist', () => {
    const seq = createSaveSequence()
    runMoving(seq, SAVE_READ_MS)
    expect(seq.state().step).toBe('settling')
    // Jetzt ruhig: erst nach SAVE_STILL_MS geht es los.
    expect(run(seq, SAVE_STILL_MS - 100).step).toBe('settling')
    expect(run(seq, 100).step).toBe('counting')
  })

  it('zählt nach dem Sicherheitsnetz trotzdem, wenn nie Ruhe kommt', () => {
    const seq = createSaveSequence()
    runMoving(seq, SAVE_READ_MS)
    expect(runMoving(seq, SAVE_SETTLE_TIMEOUT_MS - 100).step).toBe('settling')
    expect(runMoving(seq, 100).step).toBe('counting')
  })

  it('kleines Zittern (unter der Ruhe-Schwelle) gilt als ruhig', () => {
    const seq = createSaveSequence()
    let s = seq.state()
    for (let t = 0, i = 0; t < SAVE_READ_MS; t += 100, i++) {
      s = seq.update({ ...STILL, wrist: { x: 0.5 + (i % 2) * 0.005, y: 0.5 } })
    }
    expect(s.step).toBe('counting')
  })

  it('fehlendes Handgelenk gilt nicht als ruhig', () => {
    const seq = createSaveSequence()
    const s = run(seq, SAVE_READ_MS + SAVE_STILL_MS, { wrist: null })
    expect(s.step).toBe('settling')
  })

  it('zählt 3 – 2 – 1 und löst genau einmal die Erfassung aus', () => {
    const seq = createSaveSequence()
    run(seq, SAVE_READ_MS)
    expect(run(seq, 900).count).toBe(3)
    expect(run(seq, 100).count).toBe(2)
    expect(run(seq, 1000).count).toBe(1)
    const last = run(seq, 900)
    expect(last.capture).toBe(false)
    const cap = seq.update(STILL)
    expect(cap.capture).toBe(true)
    expect(cap.step).toBe('done')
    const after = seq.update(STILL)
    expect(after.capture).toBe(false)
    expect(after.step).toBe('done')
    expect(after.sampling).toBe(false)
  })

  describe('Abstand passt nicht mehr → ruhig pausieren', () => {
    it('kurzes Wackeln an der Grenze pausiert nicht (Toleranz)', () => {
      const seq = createSaveSequence()
      run(seq, SAVE_READ_MS)
      const s = run(seq, SAVE_PAUSE_GRACE_MS - 100, { distanceStatus: 'too-far' })
      expect(s.step).toBe('counting')
    })

    it('pausiert nach der Toleranz mit der Richtung und hört auf zu sammeln', () => {
      const seq = createSaveSequence()
      run(seq, SAVE_READ_MS)
      const s = run(seq, SAVE_PAUSE_GRACE_MS, { distanceStatus: 'too-close' })
      expect(s.step).toBe('paused')
      expect(s.pauseStatus).toBe('too-close')
      expect(s.count).toBeNull()
      expect(s.sampling).toBe(false)
    })

    it('pausiert auch ohne Körper im Bild', () => {
      const seq = createSaveSequence()
      const s = run(seq, SAVE_PAUSE_GRACE_MS, { distanceStatus: 'no-body', wrist: null })
      expect(s.step).toBe('paused')
      expect(s.pauseStatus).toBe('no-body')
    })

    it('geht erst weiter, wenn der Abstand eine Weile wieder passt — dann mit „Halte still“', () => {
      const seq = createSaveSequence()
      run(seq, SAVE_READ_MS)
      run(seq, SAVE_PAUSE_GRACE_MS, { distanceStatus: 'too-far' })
      expect(run(seq, SAVE_RESUME_MS - 100).step).toBe('paused')
      expect(run(seq, 100).step).toBe('settling')
    })

    it('zählt nach der Pause von vorn (3), ohne die Lesezeit zu wiederholen', () => {
      const seq = createSaveSequence()
      run(seq, SAVE_READ_MS + 1500)
      run(seq, SAVE_PAUSE_GRACE_MS, { distanceStatus: 'too-far' })
      run(seq, SAVE_RESUME_MS)
      const s = run(seq, SAVE_STILL_MS)
      expect(s.step).toBe('counting')
      expect(s.count).toBe(3)
    })

    it('kurz passender Abstand in der Pause behält die letzte Richtung', () => {
      const seq = createSaveSequence()
      run(seq, SAVE_PAUSE_GRACE_MS, { distanceStatus: 'too-far' })
      const s = run(seq, 100)
      expect(s.step).toBe('paused')
      expect(s.pauseStatus).toBe('too-far')
    })
  })

  it('reset() beginnt wieder mit der Lesezeit', () => {
    const seq = createSaveSequence()
    run(seq, SAVE_READ_MS + 500)
    seq.reset()
    expect(seq.state().step).toBe('reading')
  })
})

describe('computeSaveSequenceView', () => {
  it('Lesezeit und Warten: „Halte still – gleich wird gespeichert“, blau, keine Zahl', () => {
    for (const step of ['reading', 'settling'] as const) {
      const v = computeSaveSequenceView({ step, count: null, pauseStatus: null })
      expect(v.message).toBe('Halte still')
      expect(v.detail).toBe('gleich wird gespeichert')
      expect(v.tone).toBe('blue')
      expect(v.glyph).toBeNull()
    }
  })

  it('Zählen: „… wird gespeichert …“ im Kärtchen, nur die Zahl in der Mitte', () => {
    const v = computeSaveSequenceView({ step: 'counting', count: 2, pauseStatus: null })
    expect(v.message).toBe('Halte still')
    expect(v.detail).toBe('wird gespeichert …')
    expect(v.tone).toBe('blue')
    expect(v.glyph).toBe('2')
  })

  it('Pause: gelb mit Richtungshinweis, keine Zahl', () => {
    expect(computeSaveSequenceView({ step: 'paused', count: null, pauseStatus: 'too-far' })).toEqual({
      message: 'Komm ruhig etwas näher zur Kamera',
      detail: '',
      tone: 'yellow',
      glyph: null,
    })
    expect(computeSaveSequenceView({ step: 'paused', count: null, pauseStatus: 'too-close' }).message).toBe(
      'Geh ein kleines Stück zurück',
    )
  })
})
