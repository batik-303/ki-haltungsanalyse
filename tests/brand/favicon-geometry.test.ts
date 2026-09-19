import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeAnchorMarkGeometry } from '../../src/core/brand/anchor-geometry'

// Das Favicon ist aus technischen Gründen eine statische SVG-Datei (kein React),
// muss aber der reinen Geometrie-Funktion folgen. Dieser Test verankert die Datei
// gegen computeAnchorMarkGeometry(32) und verhindert stilles Auseinanderdriften.
// Marke #48: gerader Steg (<line>) + leuchtender Ankerpunkt (<circle>).

const faviconPath = fileURLToPath(new URL('../../public/anchor-mark.svg', import.meta.url))
const svg = readFileSync(faviconPath, 'utf8')

describe('public/anchor-mark.svg (Favicon)', () => {
  const compact = computeAnchorMarkGeometry(32)

  it('nutzt denselben geraden Steg wie die kompakte Geometrie', () => {
    expect(svg).toContain(`x1="${compact.steg.x1}"`)
    expect(svg).toContain(`y1="${compact.steg.y1}"`)
    expect(svg).toContain(`x2="${compact.steg.x2}"`)
    expect(svg).toContain(`y2="${compact.steg.y2}"`)
  })

  it('nutzt dieselbe Steg-Dicke wie die kompakte Geometrie', () => {
    expect(svg).toContain(`stroke-width="${compact.stegStrokeWidth}"`)
  })

  it('setzt den Ankerpunkt wie die kompakte Geometrie', () => {
    expect(svg).toContain(`cx="${compact.dot.cx}"`)
    expect(svg).toContain(`cy="${compact.dot.cy}"`)
    expect(svg).toContain(`r="${compact.dot.r}"`)
  })

  it('nutzt denselben Glow-Blur wie die kompakte Geometrie', () => {
    expect(svg).toContain(`stdDeviation="${compact.glowStdDeviation}"`)
  })

  it('lässt das Glanzlicht bei Favicon-Größe weg', () => {
    expect(compact.showHighlight).toBe(false)
    // Nur zwei <circle> (Halo + Ankerpunkt), kein Glanzlicht-Kreis.
    const circleCount = (svg.match(/<circle/g) ?? []).length
    expect(circleCount).toBe(2)
  })
})
