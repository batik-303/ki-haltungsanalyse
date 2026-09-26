import { describe, it, expect } from 'vitest'
import {
  computeCollinearityAngle2D,
  computeForearmDirection,
  computeKnickAngle,
  computePalmNormal,
} from '../../src/core/analysis/wrist-analyzer'
import type { Landmark, Vec3 } from '../../src/core/types'

// Abnahme-Test #82 / ADR 0002: Der Knick darf sich nicht ändern, wenn nur der
// Arm vor der Kamera gedreht wird (Lagenwechsel). Die alte 2D-Messung
// `computeCollinearityAngle2D` driftet dabei (Charakterisierung, Diagnose #78).

function lm(p: Vec3): Landmark {
  return { x: p.x, y: p.y, z: p.z, visibility: 1 }
}

// Rodrigues-Drehung um eine Achse durch den Ursprung.
function rotate(p: Vec3, axis: Vec3, deg: number): Vec3 {
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
  elbow: Vec3
  wrist: Vec3
  hand: Vec3[] // 21 Handpunkte, relevant: 0, 5, 9, 17
}

/**
 * Starre Arm+Hand-Konstruktion: Unterarm entlang +x, Handgelenk im Ursprung,
 * neutrale Handebene = x-y-Ebene. Flexion dreht die Hand um die y-Achse
 * (quer zum Unterarm, in der Handebene), seitliches Abknicken um die
 * Handflächen-Normale.
 */
function makeRig(flexDeg: number, deviationDeg = 0): Rig {
  const neutral: Record<number, Vec3> = {
    0: { x: 0, y: 0, z: 0 },
    5: { x: 0.08, y: -0.025, z: 0 },
    9: { x: 0.085, y: 0, z: 0 },
    17: { x: 0.07, y: 0.025, z: 0 },
  }
  const hand: Vec3[] = []
  for (let i = 0; i < 21; i++) {
    const p = neutral[i] ?? { x: 0.05, y: 0, z: 0 }
    hand.push(rotate(rotate(p, Z, deviationDeg), Y, flexDeg))
  }
  return { elbow: { x: -0.25, y: 0, z: 0 }, wrist: { x: 0, y: 0, z: 0 }, hand }
}

function rotateRig(rig: Rig, axis: Vec3, deg: number): Rig {
  return {
    elbow: rotate(rig.elbow, axis, deg),
    wrist: rotate(rig.wrist, axis, deg),
    hand: rig.hand.map((p) => rotate(p, axis, deg)),
  }
}

// Unterarm und Handebene kommen aus zwei Systemen mit verschiedenen
// z-Nullpunkten (Pose: Hüftmitte, Hand: Handgelenk). Das bilden die
// Offsets nach — die neue Messung darf davon nicht abhängen.
function knickOf(rig: Rig, poseZOffset = 0, handZOffset = 0): number {
  const shiftZ = (p: Vec3, dz: number) => lm({ x: p.x, y: p.y, z: p.z + dz })
  return computeKnickAngle(
    computeForearmDirection(shiftZ(rig.elbow, poseZOffset), shiftZ(rig.wrist, poseZOffset)),
    computePalmNormal(rig.hand.map((p) => shiftZ(p, handZOffset))),
  )
}

function angle2DOf(rig: Rig): number {
  return computeCollinearityAngle2D(lm(rig.elbow), lm(rig.hand[0]!), lm(rig.hand[9]!))
}

const FLEXIONS = [20, 40, 55]
const AXES: Array<[string, Vec3]> = [
  ['Unterarm-Längsachse (Umwendung)', X],
  ['senkrechte Bildachse', Y],
  ['Diagonale aus der Bildebene', { x: 1, y: 1, z: 0.5 }],
]
const THETAS = Array.from({ length: 19 }, (_, i) => i * 5) // 0…90°

function maxDrift(measure: (rig: Rig) => number, flex: number, axis: Vec3): number {
  const base = makeRig(flex)
  const ref = measure(rotateRig(base, axis, 0))
  return Math.max(...THETAS.map((theta) => Math.abs(measure(rotateRig(base, axis, theta)) - ref)))
}

describe('computeKnickAngle — rotationsinvariant (#82)', () => {
  for (const flex of FLEXIONS) {
    it(`misst ${flex}° Flexion in Ruhelage`, () => {
      expect(Math.abs(knickOf(makeRig(flex)))).toBeCloseTo(flex, 6)
    })

    for (const [name, axis] of AXES) {
      it(`${flex}° Flexion, Drehung um ${name}: maxDrift <= 10°`, () => {
        expect(maxDrift((r) => knickOf(r), flex, axis)).toBeLessThanOrEqual(10)
      })
    }
  }

  it('Streckung hat das umgekehrte Vorzeichen wie Beugung', () => {
    expect(Math.sign(knickOf(makeRig(30)))).toBe(-Math.sign(knickOf(makeRig(-30))))
  })

  it('ignoriert seitliches Abknicken (radial/ulnar)', () => {
    expect(knickOf(makeRig(0, 20))).toBeCloseTo(0, 6)
    expect(knickOf(makeRig(30, 20))).toBeCloseTo(knickOf(makeRig(30)), 6)
  })

  it('hängt nicht von den verschiedenen z-Nullpunkten von Pose und Hand ab', () => {
    const rig = rotateRig(makeRig(40), X, 60)
    expect(knickOf(rig, 0.4, -0.3)).toBeCloseTo(knickOf(rig), 6)
  })

  it('korrigiert das Seitenverhältnis normierter Bildkoordinaten', () => {
    // Bildkoordinaten: x durch Breite, y durch Höhe, z im Maßstab von x.
    const W = 1280, H = 720, aspect = W / H
    const rig = rotateRig(makeRig(40), { x: 1, y: 1, z: 0 }, 35)
    const norm = (p: Vec3) => lm({ x: p.x / W, y: p.y / H, z: p.z / W })
    const knick = computeKnickAngle(
      computeForearmDirection(norm(rig.elbow), norm(rig.wrist), aspect),
      computePalmNormal(rig.hand.map(norm), aspect),
    )
    expect(knick).toBeCloseTo(knickOf(rig), 6)
  })

  it('liefert 0 bei entarteten Eingaben statt NaN', () => {
    const p = lm({ x: 0, y: 0, z: 0 })
    const hand = new Array(21).fill(p) as Landmark[]
    expect(computeKnickAngle(computeForearmDirection(p, p), computePalmNormal(hand))).toBe(0)
  })
})

describe('computeCollinearityAngle2D — Charakterisierung der alten Messung', () => {
  it('driftet bei reiner Armdrehung weit über 10° (Ursache Dauergelb #78)', () => {
    for (const flex of FLEXIONS) {
      expect(maxDrift(angle2DOf, flex, X)).toBeGreaterThan(10)
    }
  })
})
