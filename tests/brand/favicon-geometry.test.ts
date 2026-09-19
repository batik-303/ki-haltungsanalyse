import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeAnchorMarkGeometry } from '../../src/core/brand/anchor-geometry'

// Das Favicon ist aus technischen Gründen eine statische SVG-Datei (kein React),
// muss aber der reinen Geometrie-Funktion folgen. Dieser Test verankert die Datei
// gegen computeAnchorMarkGeometry(32) und verhindert stilles Auseinanderdriften.

const faviconPath = fileURLToPath(new URL('../../public/anchor-mark.svg', import.meta.url))
const svg = readFileSync(faviconPath, 'utf8')

describe('public/anchor-mark.svg (Favicon)', () => {
  const compact = computeAnchorMarkGeometry(32)

  it('nutzt denselben Weg-Pfad wie die kompakte Geometrie', () => {
    expect(svg).toContain(`d="${compact.neckPath}"`)
  })

  it('nutzt dieselbe Halsdicke wie die kompakte Geometrie', () => {
    expect(svg).toContain(`stroke-width="${compact.neckStrokeWidth}"`)
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
