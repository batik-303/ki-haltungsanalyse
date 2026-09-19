import { describe, it, expect } from 'vitest'
import {
  computeAnchorMarkGeometry,
  ANCHOR_MARK_VIEWBOX,
} from '../../src/core/brand/anchor-geometry'

// Reine Geometrie-Logik der Blue-Anchor-Marke (Variante „Aufwärts", #48).
// Der „Weg" (Hals) ist jetzt ein gerader, senkrechter Steg + leuchtender
// Ankerpunkt (Notenkopf), nicht mehr das elastische Gummiband (#37/#41).
// Bei Favicon-Größen (≤32px) wird der Steg dicker und der Glow-Blur kleiner —
// diese größenabhängige Umschaltung ist die testbare reine Logik.

describe('computeAnchorMarkGeometry', () => {
  it('liefert einen geraden, senkrechten und zentrierten Steg', () => {
    const g = computeAnchorMarkGeometry(96)
    // Senkrecht: gleiche x-Koordinate oben wie unten.
    expect(g.steg.x1).toBe(g.steg.x2)
    // Zentriert in der Marke (viewBox-Breite 120).
    expect(g.steg.x1).toBe(60)
    // Läuft von oben nach unten in Richtung Ankerpunkt.
    expect(g.steg.y1).toBeLessThan(g.steg.y2)
  })

  it('setzt den Ankerpunkt zentriert unter den Steg', () => {
    const g = computeAnchorMarkGeometry(96)
    expect(g.dot.cx).toBe(g.steg.x1)
    expect(g.dot.r).toBeGreaterThan(0)
    // Der Punkt sitzt unterhalb des Steg-Fußes …
    expect(g.dot.cy).toBeGreaterThan(g.steg.y2)
    // … und der Steg reicht bis in den Punkt hinein (kein Spalt).
    expect(g.steg.y2).toBeGreaterThanOrEqual(g.dot.cy - g.dot.r)
  })

  it('zeigt das Glanzlicht ab 48px, verbirgt es bei Favicon-Größen', () => {
    expect(computeAnchorMarkGeometry(96).showHighlight).toBe(true)
    expect(computeAnchorMarkGeometry(48).showHighlight).toBe(true)
    expect(computeAnchorMarkGeometry(32).showHighlight).toBe(false)
    expect(computeAnchorMarkGeometry(16).showHighlight).toBe(false)
  })

  it('macht den Steg bei Favicon-Größen dicker als bei voller Größe', () => {
    const compact = computeAnchorMarkGeometry(32)
    const full = computeAnchorMarkGeometry(96)
    expect(compact.stegStrokeWidth).toBeGreaterThan(full.stegStrokeWidth)
  })

  it('reduziert den Glow-Blur bei Favicon-Größen', () => {
    const compact = computeAnchorMarkGeometry(32)
    const full = computeAnchorMarkGeometry(96)
    expect(compact.glowStdDeviation).toBeLessThan(full.glowStdDeviation)
  })

  it('behandelt genau 32px als kompakt und 33px als volle Größe (Grenzfall)', () => {
    const full = computeAnchorMarkGeometry(96)
    expect(computeAnchorMarkGeometry(32).stegStrokeWidth).toBeGreaterThan(
      full.stegStrokeWidth,
    )
    expect(computeAnchorMarkGeometry(33).stegStrokeWidth).toBe(full.stegStrokeWidth)
  })

  it('exportiert einen festen viewBox für scharfe Skalierung', () => {
    expect(ANCHOR_MARK_VIEWBOX).toBe('0 0 120 150')
  })
})
