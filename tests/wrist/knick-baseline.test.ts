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
  it('Unterarm und Handebene beide aus Bildkoordinaten (gleiche z-Konvention)', () => {
    const expected = computeKnickAngle(
      computeForearmDirection(pose[13]!, pose[15]!, aspect),
      computePalmNormal(hand, aspect),
    )
    expect(computeHandKnick(pose, hand, aspect)).toBeCloseTo(expected, 9)
  })

  it('bleibt bei Armdrehung stabil trotz verschiedener z-Nullpunkte von Pose und Hand', () => {
    // Starre Arm+Hand (40° Flexion) in Pixeln, gedreht um die Unterarm-Längsachse,
    // dann wie MediaPipe normiert: x/W, y/H, z/W; Pose-z um die Hüftmitte,
    // Hand-z um das Handgelenk verschoben.
    const W = 1280, H = 720
    const rad = (d: number) => (d * Math.PI) / 180
    const flex = rad(40)
    const rigPx = (theta: number) => {
      const c = Math.cos(rad(theta)), s = Math.sin(rad(theta))
      const rot = (x: number, y: number, z: number) => ({ x, y: y * c - z * s, z: y * s + z * c })
      const flexed = (x: number, y: number) => rot(x * Math.cos(flex), y, -x * Math.sin(flex))
      return {
        elbow: rot(-300, 0, 0),
        wrist: rot(0, 0, 0),
        hand: { 0: rot(0, 0, 0), 5: flexed(96, -30), 9: flexed(100, 0), 17: flexed(84, 30) } as Record<number, { x: number; y: number; z: number }>,
      }
    }
    const measure = (theta: number) => {
      const r = rigPx(theta)
      const toImg = (p: { x: number; y: number; z: number }, zOff: number) =>
        lm((p.x + 640) / W, (p.y + 360) / H, p.z / W + zOff)
      const poseImg = filled(33)
      poseImg[13] = toImg(r.elbow, -0.4)
      poseImg[15] = toImg(r.wrist, -0.4)
      const handImg = filled(21)
      for (const i of [0, 5, 9, 17]) handImg[i] = toImg(r.hand[i]!, -r.wrist.z / W)
      return computeHandKnick(poseImg, handImg, W / H)
    }
    const ref = measure(0)
    for (let theta = 0; theta <= 90; theta += 5) {
      expect(Math.abs(measure(theta) - ref)).toBeLessThanOrEqual(10)
    }
    expect(Math.abs(ref)).toBeCloseTo(40, 6)
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
    expect(mp.calibKnick).toBeCloseTo(computeHandKnick(pose, hand, aspect), 9)
    expect(mp.calibKnickFallback).toBeCloseTo(computePoseKnick(pose, world, aspect), 9)
  })

  it('löst die 2D-Baselines ab', () => {
    const mp = createMasterPrint('wrist', pose, { handLandmarks: hand, aspect, worldLandmarks: world })
    expect(mp).not.toHaveProperty('calib2DAngle')
    expect(mp).not.toHaveProperty('calib2DAngleFallback')
  })
})
