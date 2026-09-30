import { describe, it, expect } from 'vitest'
import { computeAnchorVisibility } from '../../src/core/analysis/anchor-visibility'
import type { Landmark } from '../../src/core/types'

// Grau-Bedingung aus #74: alle vier müssen erfüllt sein, sonst sieht die
// Kamera das Handgelenk nicht sicher genug.

function hand(wristX = 0.5, wristY = 0.5): Landmark[] {
  const filler: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
  const h = Array.from({ length: 21 }, () => filler)
  h[0] = { x: wristX, y: wristY, z: 0, visibility: 1 }
  return h
}

const OK = { hand: hand(), handednessScore: 0.9, foreshorteningConfidence: 1 }

describe('computeAnchorVisibility', () => {
  it('sichtbar, wenn linke Hand sicher erkannt, Handgelenk im Bild und Unterarm nicht stark verkürzt', () => {
    expect(computeAnchorVisibility(OK)).toBe(true)
  })

  it('nicht sichtbar ohne linke Hand', () => {
    expect(computeAnchorVisibility({ ...OK, hand: null })).toBe(false)
  })

  it('nicht sichtbar bei unsicherer Links/Rechts-Einordnung (< 0,6)', () => {
    expect(computeAnchorVisibility({ ...OK, handednessScore: 0.59 })).toBe(false)
    expect(computeAnchorVisibility({ ...OK, handednessScore: 0.6 })).toBe(true)
  })

  it('nicht sichtbar, wenn Handgelenk-Punkt 0 außerhalb des Bildes liegt', () => {
    expect(computeAnchorVisibility({ ...OK, hand: hand(1.02, 0.5) })).toBe(false)
    expect(computeAnchorVisibility({ ...OK, hand: hand(0.5, -0.01) })).toBe(false)
  })

  it('nicht sichtbar bei stark verkürztem Unterarm (Konfidenz < 0,5)', () => {
    expect(computeAnchorVisibility({ ...OK, foreshorteningConfidence: 0.49 })).toBe(false)
    expect(computeAnchorVisibility({ ...OK, foreshorteningConfidence: 0.5 })).toBe(true)
  })
})
