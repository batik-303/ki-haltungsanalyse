import { describe, expect, it } from 'vitest'
import { createColorChangeLog } from '../../src/core/diagnostics/color-change'

describe('createColorChangeLog – Farbwechsel blau/gelb/grau fürs Diagnose-Log (#200)', () => {
  it('meldet nichts, solange die Farbe gleich bleibt (Start = blau wie der Anker)', () => {
    const log = createColorChangeLog()
    expect(log.update({ color: 'blue', knick: 3, side: 1, nowMs: 1000 })).toBeUndefined()
    expect(log.update({ color: 'blue', knick: 4, side: 1, nowMs: 1016 })).toBeUndefined()
  })

  // Hals = Seite +1, wie bei calibration-saved (#101/#170).
  it('meldet den Wechsel mit Knick, Seite und der Zeit seit dem letzten Wechsel', () => {
    const log = createColorChangeLog()
    log.update({ color: 'blue', knick: 3, side: 1, nowMs: 1000 })
    expect(log.update({ color: 'yellow', knick: 12.34, side: 1, nowMs: 2500 })).toEqual({
      kind: 'color-change',
      from: 'blue',
      to: 'yellow',
      knick: 12.3,
      side: 'hals',
      msSinceLast: 1500,
    })
    expect(log.update({ color: 'yellow', knick: 14, side: 1, nowMs: 2600 })).toBeUndefined()
    expect(log.update({ color: 'blue', knick: 4, side: -1, nowMs: 3200 })).toEqual({
      kind: 'color-change',
      from: 'yellow',
      to: 'blue',
      knick: 4,
      side: 'schnecke',
      msSinceLast: 700,
    })
  })

  it('meldet Grau ohne Körper im Bild ohne Knick und Seite', () => {
    const log = createColorChangeLog()
    log.update({ color: 'blue', knick: 3, side: 0, nowMs: 0 })
    expect(log.update({ color: 'grey', knick: null, side: null, nowMs: 900 })).toEqual({
      kind: 'color-change',
      from: 'blue',
      to: 'grey',
      knick: null,
      side: null,
      msSinceLast: 900,
    })
  })

  // Neue Kalibrierung: das Grau-Tor startet wieder blau, die Zeit von vorn.
  it('beginnt nach reset wieder bei Blau und zählt die Zeit neu', () => {
    const log = createColorChangeLog()
    log.update({ color: 'blue', knick: 3, side: 0, nowMs: 0 })
    log.update({ color: 'yellow', knick: 15, side: 1, nowMs: 500 })
    log.reset()
    expect(log.update({ color: 'blue', knick: 2, side: 0, nowMs: 9000 })).toBeUndefined()
    expect(log.update({ color: 'yellow', knick: 15, side: 1, nowMs: 9400 })?.msSinceLast).toBe(400)
  })

  // #199: Beim Wechsel nach Grau steht der Grund dabei, sonst nicht.
  it('nennt beim Wechsel nach Grau den Grund (keine Hand, Etikett, Bildrand, Verkürzung, kein Körper)', () => {
    const log = createColorChangeLog()
    log.update({ color: 'blue', knick: 3, side: 1, nowMs: 1000 })
    expect(log.update({ color: 'grey', knick: 21, side: 1, nowMs: 1300, reason: 'handedness' })).toMatchObject({
      to: 'grey',
      reason: 'handedness',
    })
    const back = log.update({ color: 'blue', knick: 4, side: 1, nowMs: 1600, reason: null })
    expect(back).not.toHaveProperty('reason')
  })
})
