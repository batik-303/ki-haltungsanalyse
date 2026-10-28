import { describe, it, expect } from 'vitest'
import { computeSessionFrame } from '../src/core/layout/session-frame'

// Spiegel-Ansicht im Rahmen (#114, Entscheidungen aus #104): Zwischen Kopfzeile
// und Knopf-Zeile steht das ganze Kamerabild, kein Zoom (object-contain). Der
// Rahmen ist genau das sichtbare Bild — Video, Canvas, Randglühen und Kärtchen
// sitzen darin.

describe('computeSessionFrame', () => {
  it('Laptop: Querformat-Video füllt die Höhe, mittig mit Rand links/rechts', () => {
    const f = computeSessionFrame({ videoWidth: 640, videoHeight: 480, areaWidth: 1440, areaHeight: 700 })
    expect(f.height).toBeCloseTo(700, 5)
    expect(f.width).toBeCloseTo(700 * (640 / 480), 5)
    expect(f.top).toBeCloseTo(0, 5)
    expect(f.left).toBeCloseTo((1440 - f.width) / 2, 5)
  })

  it('Handy hochkant: Querformat-Video füllt die Breite, senkrecht mittig', () => {
    const f = computeSessionFrame({ videoWidth: 640, videoHeight: 480, areaWidth: 390, areaHeight: 640 })
    expect(f.width).toBeCloseTo(390, 5)
    expect(f.height).toBeCloseTo(390 * (480 / 640), 5)
    expect(f.left).toBeCloseTo(0, 5)
    expect(f.top).toBeCloseTo((640 - f.height) / 2, 5)
  })

  it('Tablet hochkant mit Hochformat-Video: Seitenverhältnis bleibt, nichts abgeschnitten', () => {
    const f = computeSessionFrame({ videoWidth: 480, videoHeight: 640, areaWidth: 820, areaHeight: 1000 })
    expect(f.width / f.height).toBeCloseTo(480 / 640, 5)
    expect(f.width).toBeLessThanOrEqual(820 + 1e-6)
    expect(f.height).toBeLessThanOrEqual(1000 + 1e-6)
    expect(f.left).toBeGreaterThanOrEqual(0)
    expect(f.top).toBeGreaterThanOrEqual(0)
  })

  it('Videogröße noch unbekannt: Rahmen füllt den ganzen Bereich', () => {
    expect(computeSessionFrame({ videoWidth: 0, videoHeight: 0, areaWidth: 800, areaHeight: 600 }))
      .toEqual({ left: 0, top: 0, width: 800, height: 600 })
  })

  it('Bereich ohne Größe: leerer Rahmen statt NaN', () => {
    expect(computeSessionFrame({ videoWidth: 640, videoHeight: 480, areaWidth: 0, areaHeight: 0 }))
      .toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })
})
