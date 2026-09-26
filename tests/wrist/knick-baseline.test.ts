import { describe, it, expect } from 'vitest'
import {
  computeForearmDirection,
  computeHandKnick,
  computeKnickAngle,
  computePalmNormal,
  computePlaneNormal,
  computePoseKnick,
} from '../../src/core/analysis/wrist-analyzer'
import { createMasterPrint } from '../../src/core/calibration/master-print'
import type { Landmark } from '../../src/core/types'

// Baseline für den Knick in derselben Größe wie die Laufzeit-Messung (#82).

function lm(x: number, y: number, z: number): Landmark {
  return { x, y, z, visibility: 1 }
}

function filled(n: number): Landmark[] {
  return Array.from({ length: n }, () => lm(0.5, 0.5, 0))
}

// Bildkoordinaten (Pose): Ellbogen 13, Handgelenk 15, Kleinfinger 17, Zeigefinger 19.
const pose = filled(33)
pose[13] = lm(0.3, 0.6, -0.1)
pose[15] = lm(0.45, 0.45, -0.2)
pose[17] = lm(0.5, 0.43, -0.25)
pose[19] = lm(0.52, 0.4, -0.18)

// Weltkoordinaten (Meter, Hüftmitte = Ursprung) — bewusst andere Richtung als
// das Bild, damit erkennbar ist, welche Quelle gelesen wurde.
const world = filled(33)
world[13] = lm(0.1, -0.2, -0.3)
world[15] = lm(0.2, -0.35, -0.45)
world[17] = lm(0.24, -0.38, -0.5)
world[19] = lm(0.25, -0.4, -0.44)

// Hand (Bild, z-Nullpunkt = Handgelenk).
const hand = filled(21)
hand[0] = lm(0.46, 0.46, 0)
hand[5] = lm(0.52, 0.4, -0.03)
hand[9] = lm(0.53, 0.42, -0.02)
hand[17] = lm(0.5, 0.45, 0.02)

const aspect = 16 / 9

describe('computeHandKnick', () => {
  it('Unterarm aus Pose-worldLandmarks, Handebene aus Handpunkten', () => {
    const expected = computeKnickAngle(
      computeForearmDirection(world[13]!, world[15]!),
      computePalmNormal(hand, aspect),
    )
    expect(computeHandKnick(pose, world, hand, aspect)).toBeCloseTo(expected, 9)
  })

  it('ohne worldLandmarks: Unterarm aus Pose-Bildkoordinaten mit Seitenverhältnis', () => {
    const expected = computeKnickAngle(
      computeForearmDirection(pose[13]!, pose[15]!, aspect),
      computePalmNormal(hand, aspect),
    )
    expect(computeHandKnick(pose, undefined, hand, aspect)).toBeCloseTo(expected, 9)
  })
})

describe('computePoseKnick (Fallback ohne Hand)', () => {
  it('alles aus Pose-worldLandmarks', () => {
    const expected = computeKnickAngle(
      computeForearmDirection(world[13]!, world[15]!),
      computePlaneNormal(world[15]!, world[19]!, world[17]!),
    )
    expect(computePoseKnick(pose, world, aspect)).toBeCloseTo(expected, 9)
  })

  it('ohne worldLandmarks: Pose-Bildkoordinaten mit Seitenverhältnis', () => {
    const expected = computeKnickAngle(
      computeForearmDirection(pose[13]!, pose[15]!, aspect),
      computePlaneNormal(pose[15]!, pose[19]!, pose[17]!, aspect),
    )
    expect(computePoseKnick(pose, undefined, aspect)).toBeCloseTo(expected, 9)
  })
})

describe('createMasterPrint — Knick-Baseline', () => {
  it('speichert calibKnick und calibKnickFallback mit den Laufzeit-Funktionen', () => {
    const mp = createMasterPrint('wrist', pose, { handLandmarks: hand, aspect, worldLandmarks: world })
    if (mp?.mode !== 'wrist') throw new Error('erwartet WristMasterPrint')
    expect(mp.calibKnick).toBeCloseTo(computeHandKnick(pose, world, hand, aspect), 9)
    expect(mp.calibKnickFallback).toBeCloseTo(computePoseKnick(pose, world, aspect), 9)
  })

  it('löst die 2D-Baselines ab', () => {
    const mp = createMasterPrint('wrist', pose, { handLandmarks: hand, aspect, worldLandmarks: world })
    expect(mp).not.toHaveProperty('calib2DAngle')
    expect(mp).not.toHaveProperty('calib2DAngleFallback')
  })
})
