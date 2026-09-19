import { describe, it, expect } from 'vitest'
import {
  computeAnchorMarkGeometry,
  ANCHOR_MARK_VIEWBOX,
} from '../../src/core/brand/anchor-geometry'

// Reine Geometrie-Logik der Blue-Anchor-Marke (Variante „Gummiband", #37/#39).
// Der leuchtende Ankerpunkt + der elastische „Weg" (Hals) sind als SVG in einem
// festen viewBox definiert; bei Favicon-Größen (≤32px) wird die Krümmung dezenter
// und der Hals dicker. Diese Umschaltung ist die testbare reine Logik.

describe('computeAnchorMarkGeometry', () => {
  it('nutzt bei voller Größe den Referenz-Gummiband-Pfad aus #37', () => {
    const g = computeAnchorMarkGeometry(96)
    expect(g.neckPath).toBe('M60 104 C 52 78 68 56 60 22')
    expect(g.neckStrokeWidth).toBeCloseTo(6.5)
  })

  it('zeigt das Glanzlicht ab 48px, verbirgt es bei Favicon-Größen', () => {
    expect(computeAnchorMarkGeometry(96).showHighlight).toBe(true)
    expect(computeAnchorMarkGeometry(48).showHighlight).toBe(true)
    expect(computeAnchorMarkGeometry(32).showHighlight).toBe(false)
    expect(computeAnchorMarkGeometry(16).showHighlight).toBe(false)
  })

  it('macht den Hals bei Favicon-Größen dicker als bei voller Größe', () => {
    const compact = computeAnchorMarkGeometry(32)
    const full = computeAnchorMarkGeometry(96)
    expect(compact.neckStrokeWidth).toBeGreaterThan(full.neckStrokeWidth)
  })

  it('nimmt bei Favicon-Größen die Krümmung dezent zurück (anderer Pfad)', () => {
    const compact = computeAnchorMarkGeometry(24)
    const full = computeAnchorMarkGeometry(96)
    expect(compact.neckPath).not.toBe(full.neckPath)
    // Beide Pfade starten am selben Fußpunkt des Ankerpunkts.
    expect(compact.neckPath.startsWith('M60 104')).toBe(true)
  })

  it('reduziert den Glow-Blur bei Favicon-Größen', () => {
    const compact = computeAnchorMarkGeometry(32)
    const full = computeAnchorMarkGeometry(96)
    expect(compact.glowStdDeviation).toBeLessThan(full.glowStdDeviation)
  })

  it('behandelt genau 32px als kompakt und 33px als volle Größe (Grenzfall)', () => {
    expect(computeAnchorMarkGeometry(32).neckStrokeWidth).toBeGreaterThan(6.5)
    expect(computeAnchorMarkGeometry(33).neckStrokeWidth).toBeCloseTo(6.5)
  })

  it('exportiert einen festen viewBox für scharfe Skalierung', () => {
    expect(ANCHOR_MARK_VIEWBOX).toBe('0 0 120 150')
  })
})
