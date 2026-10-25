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
