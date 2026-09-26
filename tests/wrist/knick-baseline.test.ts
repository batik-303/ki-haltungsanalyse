import { describe, it, expect } from 'vitest'
import {
  computeArmLength2D,
  computeCollinearityAngle2D,
  computeMCP,
} from '../../src/core/analysis/wrist-analyzer'
import { createMasterPrint } from '../../src/core/calibration/master-print'
import type { Landmark } from '../../src/core/types'

// Baseline für den Knick in derselben Größe wie die Laufzeit-Messung (#82,
// ADR 0003). Bei der Kalibrierung ist das Längenverhältnis 1, der korrigierte
// Knick also gleich dem 2D-Winkel.

function lm(x: number, y: number, z: number): Landmark {
  return { x, y, z, visibility: 1 }
}

function filled(n: number): Landmark[] {
  return Array.from({ length: n }, () => lm(0.5, 0.5, 0))
}

const pose = filled(33)
pose[13] = lm(0.3, 0.6, -0.1)
pose[15] = lm(0.45, 0.45, -0.2)
pose[17] = lm(0.5, 0.43, -0.25)
pose[19] = lm(0.52, 0.4, -0.18)

const world = filled(33)
world[13] = lm(0.1, -0.2, -0.3)
world[15] = lm(0.2, -0.35, -0.45)
world[17] = lm(0.24, -0.38, -0.5)
world[19] = lm(0.25, -0.4, -0.44)

const hand = filled(21)
hand[0] = lm(0.46, 0.46, 0)
hand[5] = lm(0.52, 0.4, -0.03)
hand[9] = lm(0.53, 0.42, -0.02)
hand[17] = lm(0.5, 0.45, 0.02)

const aspect = 16 / 9

describe('createMasterPrint — Knick-Baseline', () => {
  const mp = createMasterPrint('wrist', pose, { handLandmarks: hand, aspect, worldLandmarks: world })
  if (mp?.mode !== 'wrist') throw new Error('erwartet WristMasterPrint')

  it('calibKnick = 2D-Winkel Pose-Ellbogen → Hand-Handgelenk → Hand-Mittelfinger (mit aspect)', () => {
    expect(mp.calibKnick).toBeCloseTo(computeCollinearityAngle2D(pose[13]!, hand[0]!, hand[9]!, aspect), 9)
  })

  it('calibKnickFallback = 2D-Winkel aus Pose-worldLandmarks', () => {
    expect(mp.calibKnickFallback).toBeCloseTo(
      computeCollinearityAngle2D(world[13]!, world[15]!, computeMCP(world[17]!, world[19]!)),
      9,
    )
  })

  it('calibArmLength2D mit Seitenverhältnis (gleiche Größe wie das Laufzeit-Verhältnis)', () => {
    expect(mp.calibArmLength2D).toBeCloseTo(computeArmLength2D(pose[13]!, pose[15]!, aspect), 9)
  })

  it('keine alten 2D-Felder mehr', () => {
    expect(mp).not.toHaveProperty('calib2DAngle')
    expect(mp).not.toHaveProperty('calib2DAngleFallback')
  })
})
