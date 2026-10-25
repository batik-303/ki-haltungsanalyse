import { describe, it, expect } from 'vitest'
import { computeAnchorRadius, computeContainPx, computeRailAnchorRadius } from '../../src/core/analysis/anchor-size'

// Ankergröße in Bildschirm-Pixeln (#106): Das Canvas hat Videogröße (640 × 480)
// und wird in der Analyse per object-contain eingepasst. Am Handy schrumpft das
// Bild, am Laptop wächst es — der Anker soll trotzdem überall gleich groß sein.

describe('computeContainPx — Canvas-Pixel pro CSS-Pixel bei object-contain', () => {
  it('Handy hochkant (390 × 844): Bild schrumpft auf Bildschirmbreite', () => {
    // 640 Canvas-Pixel auf 390 CSS-Pixel → 640 / 390 ≈ 1,641
    const px = computeContainPx({ canvasWidth: 640, canvasHeight: 480, viewWidth: 390, viewHeight: 844 })
    expect(px).toBeCloseTo(1.641, 3)
  })

  it('Laptop (1440 × 800): Bild wächst bis zur Höhe', () => {
    // 480 Canvas-Pixel auf 800 CSS-Pixel → 0,6
    const px = computeContainPx({ canvasWidth: 640, canvasHeight: 480, viewWidth: 1440, viewHeight: 800 })
    expect(px).toBeCloseTo(0.6, 6)
  })

  it('ohne bekannte Bildschirmgröße (0 × 0): 1 Canvas-Pixel pro CSS-Pixel', () => {
    const px = computeContainPx({ canvasWidth: 640, canvasHeight: 480, viewWidth: 0, viewHeight: 0 })
    expect(px).toBe(1)
  })
})

describe('computeAnchorRadius — Anker auf dem Körper, 18 CSS-Pixel auf allen Geräten', () => {
  const PHONE_PX = 640 / 390
  const LAPTOP_PX = 0.6

  it('Handy und Laptop: gleicher Radius in CSS-Pixeln (18)', () => {
    // now = 0 → Puls in der Mitte
    expect(computeAnchorRadius(PHONE_PX, 0) / PHONE_PX).toBeCloseTo(18, 6)
    expect(computeAnchorRadius(LAPTOP_PX, 0) / LAPTOP_PX).toBeCloseTo(18, 6)
  })

  it('Handy: Radius in Canvas-Pixeln etwa dreimal so groß wie bisher (11)', () => {
    expect(computeAnchorRadius(PHONE_PX, 0)).toBeCloseTo(29.54, 2)
  })

  it('pulsiert leicht: höchstens ±1,5 CSS-Pixel', () => {
    const peak = (600 * Math.PI) / 2 // sin = 1
    expect(computeAnchorRadius(1, peak)).toBeCloseTo(19.5, 6)
    expect(computeAnchorRadius(1, -peak)).toBeCloseTo(16.5, 6)
  })
})

describe('computeRailAnchorRadius — Saphir-Anker in der peripheren Leiste (#102)', () => {
  it('Analyse-Leiste (Arm 16 CSS-Pixel): Radius 24,4 CSS-Pixel wie bisher', () => {
    expect(computeRailAnchorRadius(16, 1, 0)).toBeCloseTo(24.4, 6)
  })

  it('Handy: Armbreite in Canvas-Pixeln → Radius bleibt 24,4 CSS-Pixel', () => {
    const px = 640 / 390
    expect(computeRailAnchorRadius(16 * px, px, 0) / px).toBeCloseTo(24.4, 6)
  })

  it('wächst mit der Linienstärke (große Flow-Leiste)', () => {
    expect(computeRailAnchorRadius(32, 1, 0)).toBeCloseTo(46.8, 6)
  })

  it('beim einmaligen Aufleuchten etwas größer (+4 CSS-Pixel)', () => {
    expect(computeRailAnchorRadius(16, 1, 1)).toBeCloseTo(28.4, 6)
  })
})
