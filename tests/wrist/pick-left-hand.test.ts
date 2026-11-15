import { describe, it, expect } from 'vitest'
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { pickLeftHandDetection } from '../../src/core/analysis/hand-landmarker'

function result(hands: { name: string; score: number; x: number }[]): HandLandmarkerResult {
  return {
    landmarks: hands.map((h) => [{ x: h.x, y: 0.5, z: 0 }]),
    worldLandmarks: [],
    handedness: hands.map((h) => [{ categoryName: h.name, score: h.score, index: 0, displayName: '' }]),
    handednesses: [],
  }
}

describe('pickLeftHandDetection', () => {
  it('liefert die linke Hand samt Sicherheit der Links/Rechts-Einordnung', () => {
    const d = pickLeftHandDetection(result([
      { name: 'Right', score: 0.99, x: 0.2 },
      { name: 'Left', score: 0.72, x: 0.7 },
    ]))
    expect(d?.landmarks[0]?.x).toBe(0.7)
    expect(d?.handednessScore).toBe(0.72)
  })

  it('liefert null ohne linke Hand', () => {
    expect(pickLeftHandDetection(result([{ name: 'Right', score: 0.9, x: 0.2 }]))).toBeNull()
  })
})

// #199: Die Bogenhand bekommt manchmal auch das Etikett „Left“. Gewählt wird
// darum die Hand am Körper-Handgelenk (Pose 15), das Etikett zählt dazu.
// Abstände in Unterarm-Längen, echte Werte aus dem Gerätetest (15.11.):
// Griffhand 0,04 – 1,9, Bogenhand 2,2 – 6 („Right“).
describe('pickLeftHandDetection mit Arm (#199)', () => {
  // Unterarm waagrecht von x 0.3 bis 0.5 (Länge 0.2), Handgelenk bei (0.5, 0.5).
  const arm = { elbow: { x: 0.3, y: 0.5 }, wrist: { x: 0.5, y: 0.5 }, aspect: 1 }
  /** Hand im Abstand `d` (Unterarm-Längen) rechts vom Handgelenk. */
  const at = (name: string, d: number, score = 0.9) => ({ name, score, x: 0.5 + d * 0.2 })

  it('nimmt bei zwei Händen die nähere, auch wenn die Bogenhand „Left“ heißt', () => {
    const d = pickLeftHandDetection(result([at('Left', 3.0, 0.95), at('Left', 0.57, 0.8)]), arm)
    expect(d?.landmarks[0]?.x).toBeCloseTo(at('Left', 0.57).x)
    expect(d?.handednessScore).toBe(0.8)
  })

  it('nimmt bei Bogenhand „Right“ + Griffhand „Left“ die Griffhand (Gerätetest)', () => {
    expect(pickLeftHandDetection(result([at('Right', 3.07), at('Left', 0.57)]), arm)?.landmarks[0]?.x)
      .toBeCloseTo(at('Left', 0.57).x)
    expect(pickLeftHandDetection(result([at('Left', 0.9), at('Right', 5.95)]), arm)?.landmarks[0]?.x)
      .toBeCloseTo(at('Left', 0.9).x)
  })

  it('nimmt eine einzelne „Left“-Hand auch bei größerem Abstand (nie mehr Grau als vorher)', () => {
    for (const dist of [0.04, 0.53, 1.12, 1.9]) {
      expect(pickLeftHandDetection(result([at('Left', dist)]), arm)).not.toBeNull()
    }
  })

  it('verwirft eine einzelne „Right“-Hand weit weg (Bogenhand)', () => {
    for (const dist of [2.18, 2.45, 5.12]) {
      expect(pickLeftHandDetection(result([at('Right', dist)]), arm)).toBeNull()
    }
  })

  it('nimmt ohne messbaren Abstand (Unterarm 0 lang) wie bisher die „Left“-Hand', () => {
    const flat = { elbow: { x: 0.5, y: 0.5 }, wrist: { x: 0.5, y: 0.5 }, aspect: 1 }
    expect(pickLeftHandDetection(result([at('Left', 0.3)]), flat)).not.toBeNull()
  })

  it('nimmt eine als „Right“ eingeordnete Hand am Handgelenk, aber mit kleiner Sicherheit', () => {
    const d = pickLeftHandDetection(result([at('Right', 0.05)]), arm)
    expect(d?.landmarks[0]?.x).toBeCloseTo(at('Right', 0.05).x)
    expect(d?.handednessScore).toBeCloseTo(0.1)
  })
})
