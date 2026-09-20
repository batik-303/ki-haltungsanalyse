import { describe, expect, it } from 'vitest'
import { computeDistanceGlowTone } from '../../src/core/calibration/distance-glow'

/**
 * T4 #60 (Karte #56, Variante A „Randglühen" aus T1 #57): Die grüne
 * „✓ Abstand OK"-Pille weicht einem ruhigen Bildrand-Leuchten. Reine Ton-Wahl,
 * Grundsatz „kein Rot": Sapphire führt, solange der Abstand nicht passt, Grün
 * bestätigt leise „passt".
 */
describe('computeDistanceGlowTone', () => {
  it('führt mit Sapphire, solange der Abstand nicht passt', () => {
    expect(computeDistanceGlowTone(false)).toBe('sapphire')
  })

  it('bestätigt mit Grün, sobald der Abstand passt', () => {
    expect(computeDistanceGlowTone(true)).toBe('success')
  })

  it('nutzt nie einen Fehler-/Rot-Ton', () => {
    const tones = [computeDistanceGlowTone(true), computeDistanceGlowTone(false)]
    expect(new Set(tones)).toEqual(new Set(['sapphire', 'success']))
  })
})
