import { describe, expect, it } from 'vitest'
import {
  computeDistanceGlowShadow,
  computeDistanceGlowTone,
  DISTANCE_GLOW_COLORS,
  DISTANCE_GLOW_INNER_ALPHA,
  DISTANCE_GLOW_OUTER_ALPHA,
} from '../../src/core/calibration/distance-glow'

/**
 * #115 (Teil von #71, #104 Entscheidungen 7 + 8): Das Randglühen folgt der
 * Farb-Regel der App — Gelb = Abstand passt noch nicht (hinsehen), Blau =
 * Abstand passt. Grün fällt weg, Rot gibt es nie. Das Glühen ist etwa doppelt
 * so deutlich wie vorher (T4 #60: ≈ 27 % / 18 % Deckkraft).
 */
describe('computeDistanceGlowTone', () => {
  it('leuchtet gelb, solange der Abstand noch nicht passt', () => {
    expect(computeDistanceGlowTone(false)).toBe('yellow')
  })

  it('leuchtet blau, sobald der Abstand passt', () => {
    expect(computeDistanceGlowTone(true)).toBe('blue')
  })

  it('nutzt nur Gelb und Blau — kein Grün, kein Rot', () => {
    const tones = [computeDistanceGlowTone(true), computeDistanceGlowTone(false)]
    expect(new Set(tones)).toEqual(new Set(['yellow', 'blue']))
  })
})

describe('DISTANCE_GLOW_COLORS', () => {
  it('nimmt dieselben Farben wie der Anker (Blau #2196F3, Gelb #F5C842)', () => {
    expect(DISTANCE_GLOW_COLORS.blue).toBe('#2196F3')
    expect(DISTANCE_GLOW_COLORS.yellow).toBe('#F5C842')
  })
})

describe('Stärke des Randglühens', () => {
  const OLD_OUTER = 0x44 / 255
  const OLD_INNER = 0x2e / 255

  it('ist etwa doppelt so deutlich wie vorher', () => {
    expect(DISTANCE_GLOW_OUTER_ALPHA / OLD_OUTER).toBeGreaterThanOrEqual(1.8)
    expect(DISTANCE_GLOW_OUTER_ALPHA / OLD_OUTER).toBeLessThanOrEqual(2.2)
    expect(DISTANCE_GLOW_INNER_ALPHA / OLD_INNER).toBeGreaterThanOrEqual(1.8)
    expect(DISTANCE_GLOW_INNER_ALPHA / OLD_INNER).toBeLessThanOrEqual(2.2)
  })

  it('baut den Schatten in der Glühfarbe mit diesen Deckkräften', () => {
    const shadow = computeDistanceGlowShadow('yellow')
    const outerHex = Math.round(DISTANCE_GLOW_OUTER_ALPHA * 255).toString(16).padStart(2, '0')
    const innerHex = Math.round(DISTANCE_GLOW_INNER_ALPHA * 255).toString(16).padStart(2, '0')
    expect(shadow).toContain(`#F5C842${outerHex}`)
    expect(shadow).toContain(`#F5C842${innerHex}`)
    expect(computeDistanceGlowShadow('blue')).toContain('#2196F3')
  })
})

describe('Pulsieren beim Speichern (#118)', () => {
  it('ist beim Puls kräftiger und breiter als der ruhige Grundschein', () => {
    const calm = computeDistanceGlowShadow('blue')
    const pulse = computeDistanceGlowShadow('blue', { pulse: true })
    expect(pulse).not.toBe(calm)
    expect(pulse).toContain('#2196F3')
    const alphas = (s: string) => [...s.matchAll(/#2196F3([0-9a-f]{2})/g)].map((m) => parseInt(m[1]!, 16))
    const [calmOuter, calmInner] = alphas(calm)
    const [pulseOuter, pulseInner] = alphas(pulse)
    expect(pulseOuter!).toBeGreaterThan(calmOuter!)
    expect(pulseInner!).toBeGreaterThan(calmInner!)
  })
})
