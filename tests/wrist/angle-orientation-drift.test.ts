import { describe, it, expect } from 'vitest'
import {
  computeArmLength2D,
  computeCollinearityAngle2D,
  computeCorrectedKnick,
} from '../../src/core/analysis/wrist-analyzer'
import type { Landmark } from '../../src/core/types'

// Abnahme-Test #82 / ADR 0003: Der Knick wird aus dem 2D-Bildwinkel gemessen
// (im Stillstand ruhig, keine geschätzte Tiefe) und um die Verkürzung des
// Unterarms korrigiert. Dreht sich nur der Arm vor der Kamera, darf gute
// Haltung nicht gelb werden. Die reine 2D-Messung wird dabei gelb
// (Charakterisierung, Diagnose #78).

type P = { x: number; y: number; z: number }

function lm(p: P): Landmark {
  return { x: p.x, y: p.y, z: p.z, visibility: 1 }
}

// Rodrigues-Drehung um eine Achse durch den Ursprung.
function rotate(p: P, axis: P, deg: number): P {
  const m = Math.hypot(axis.x, axis.y, axis.z)
  const k = { x: axis.x / m, y: axis.y / m, z: axis.z / m }
  const t = (deg * Math.PI) / 180
  const c = Math.cos(t), s = Math.sin(t)
  const dot = k.x * p.x + k.y * p.y + k.z * p.z
  return {
    x: p.x * c + (k.y * p.z - k.z * p.y) * s + k.x * dot * (1 - c),
    y: p.y * c + (k.z * p.x - k.x * p.z) * s + k.y * dot * (1 - c),
    z: p.z * c + (k.x * p.y - k.y * p.x) * s + k.z * dot * (1 - c),
  }
}

const X = { x: 1, y: 0, z: 0 }
const Y = { x: 0, y: 1, z: 0 }
const Z = { x: 0, y: 0, z: 1 }

interface Rig {
  elbow: P
  wrist: P
  mcp: P // Mittelfinger-Grundgelenk
}

/**
 * Starre Arm+Hand: Unterarm entlang +x in der Bildebene (wie bei der
 * Kalibrierung), Handgelenk im Ursprung. Der Knick dreht die Hand um
 * `flexAxis` (Z = Knick in der Bildebene, Y = Knick in die Tiefe).
 */
function makeRig(flexDeg: number, flexAxis: P = Z): Rig {
  return {
    elbow: { x: -0.25, y: 0, z: 0 },
    wrist: { x: 0, y: 0, z: 0 },
    mcp: rotate({ x: 0.085, y: 0, z: 0 }, flexAxis, flexDeg),
  }
}

function rotateRig(rig: Rig, axis: P, deg: number): Rig {
  return {
    elbow: rotate(rig.elbow, axis, deg),
    wrist: rotate(rig.wrist, axis, deg),
    mcp: rotate(rig.mcp, axis, deg),
  }
}

const CALIB_ARM_LENGTH = 0.25 // Unterarm in der Bildebene bei der Kalibrierung

function angle2DOf(rig: Rig): number {
  return computeCollinearityAngle2D(lm(rig.elbow), lm(rig.wrist), lm(rig.mcp))
}

function knickOf(rig: Rig): number {
  const ratio = computeArmLength2D(lm(rig.elbow), lm(rig.wrist)) / CALIB_ARM_LENGTH
  return computeCorrectedKnick(angle2DOf(rig), ratio)
}

const FLEX_AXES: P[] = [Z, Y, { x: 0, y: 1, z: 1 }] // Bildebene, Tiefe, schräg
const ROTATION_AXES: P[] = [
  Y, // senkrechte Bildachse
  Z, // Blickrichtung
  X, // Unterarm-Längsachse
  { x: 1, y: 1, z: 0.5 },
  { x: 0, y: 1, z: 1 },
  { x: 1, y: 0, z: 1 },
]
const THETAS = Array.from({ length: 17 }, (_, i) => i * 5) // 0…80°
const COLOR_THRESHOLD_DEG = 8 // blau → gelb (createWristRailColor)

function maxOver(measure: (rig: Rig) => number, flex: number): number {
  let worst = 0
  for (const flexAxis of FLEX_AXES) {
    for (const axis of ROTATION_AXES) {
      for (const theta of THETAS) {
        worst = Math.max(worst, measure(rotateRig(makeRig(flex, flexAxis), axis, theta)))
      }
    }
  }
  return worst
}

describe('computeCorrectedKnick — Formel', () => {
  it('ohne Verkürzung (Verhältnis ≥ 1) gleich dem 2D-Winkel', () => {
    expect(computeCorrectedKnick(12, 1)).toBeCloseTo(12, 9)
    expect(computeCorrectedKnick(12, 1.2)).toBeCloseTo(12, 9)
  })

  it('halbe Unterarmlänge, 90° im Bild → acos(0,75) ≈ 41,4°', () => {
    expect(computeCorrectedKnick(90, 0.5)).toBeCloseTo(41.41, 2)
  })

  it('Unterarm zeigt genau in die Kamera → 0 (keine Aussage möglich)', () => {
    expect(computeCorrectedKnick(120, 0)).toBe(0)
  })

  it('senkt den Wert nur, erhöht ihn nie', () => {
    for (const a of [0, 5, 20, 60, 120, 180]) {
      for (const r of [0, 0.2, 0.5, 0.8, 1]) {
        expect(computeCorrectedKnick(a, r)).toBeLessThanOrEqual(a + 1e-9)
      }
    }
  })

  it('kleine Längenschwankung ändert den Wert kaum (Stillstand)', () => {
    // 2 % Längenrauschen am kalibrierten Unterarm verschiebt 10° um < 0,5°.
    expect(Math.abs(computeCorrectedKnick(10, 0.98) - 10)).toBeLessThan(0.5)
  })
})

describe('Knick bei Armdrehung vor der Kamera (#82)', () => {
  it('gute Haltung (5°) wird bei Armdrehung bis 80° nie gelb', () => {
    expect(maxOver(knickOf, 5)).toBeLessThanOrEqual(COLOR_THRESHOLD_DEG)
  })

  it('Charakterisierung: der reine 2D-Winkel wird dabei gelb', () => {
    expect(maxOver(angle2DOf, 5)).toBeGreaterThan(COLOR_THRESHOLD_DEG)
  })

  for (const flex of [20, 40, 55]) {
    it(`erkennt ${flex}° Knick in der Bildebene ohne Armdrehung`, () => {
      expect(knickOf(makeRig(flex))).toBeCloseTo(flex, 6)
    })

    it(`${flex}° Knick in der Bildebene wird durch Armdrehung höchstens 3° überhöht`, () => {
      // Die Annahme „Hand macht die Neigung mit" ist nicht exakt: bei 55° und
      // extremer Schrägdrehung (80°) entstehen ≈ 2,2° Überhöhung.
      for (const axis of ROTATION_AXES) {
        for (const theta of THETAS) {
          expect(knickOf(rotateRig(makeRig(flex), axis, theta))).toBeLessThanOrEqual(flex + 3)
        }
      }
    })
  }

  it('Grenze: Drehung um die Unterarm-Längsachse verkürzt nichts → echter Knick erscheint kleiner', () => {
    // Ohne Tiefe nicht korrigierbar (ADR 0003). Hier nur dokumentiert.
    const rig = rotateRig(makeRig(40), X, 80)
    expect(knickOf(rig)).toBeLessThan(40)
    expect(knickOf(rig)).toBeCloseTo(angle2DOf(rig), 9)
  })
})

describe('computeArmLength2D — Seitenverhältnis', () => {
  it('skaliert x mit aspect, damit die Länge richtungsunabhängig ist', () => {
    const W = 1280, H = 720
    const origin = lm({ x: 0, y: 0, z: 0 })
    const horizontal = computeArmLength2D(origin, lm({ x: 200 / W, y: 0, z: 0 }), W / H)
    const vertical = computeArmLength2D(origin, lm({ x: 0, y: 200 / H, z: 0 }), W / H)
    expect(horizontal).toBeCloseTo(vertical, 9)
  })
})
