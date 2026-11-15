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
// darum die Hand am Körper-Handgelenk (Pose 15), das Etikett zählt nur dazu.
describe('pickLeftHandDetection mit Arm (#199)', () => {
  // Unterarm waagrecht von x 0.3 bis 0.5 (Länge 0.2), Handgelenk bei (0.5, 0.5).
  const arm = { elbow: { x: 0.3, y: 0.5 }, wrist: { x: 0.5, y: 0.5 }, aspect: 1 }

  it('nimmt die Hand am Handgelenk, nicht die Bogenhand mit gleichem Etikett', () => {
    const d = pickLeftHandDetection(result([
      { name: 'Left', score: 0.95, x: 0.9 }, // Bogenhand, weit weg
      { name: 'Left', score: 0.8, x: 0.52 },  // Griffhand am Handgelenk
    ]), arm)
    expect(d?.landmarks[0]?.x).toBe(0.52)
    expect(d?.handednessScore).toBe(0.8)
  })

  it('liefert keine Hand, wenn keine nah genug am Handgelenk liegt (→ Grau)', () => {
    expect(pickLeftHandDetection(result([{ name: 'Left', score: 0.95, x: 0.9 }]), arm)).toBeNull()
  })

  it('nimmt eine als „Right“ eingeordnete Hand am Handgelenk, aber mit kleiner Sicherheit', () => {
    const d = pickLeftHandDetection(result([{ name: 'Right', score: 0.9, x: 0.51 }]), arm)
    expect(d?.landmarks[0]?.x).toBe(0.51)
    expect(d?.handednessScore).toBeCloseTo(0.1)
  })
})
