import { describe, it, expect } from 'vitest'
import {
  mediapipeWasmPath,
  POSE_MODEL_PATH,
  HAND_MODEL_PATH,
} from '../src/core/config/mediapipe-assets'

// Alle KI-Dateien kommen von der eigenen Domain (DSGVO, #175).
describe('MediaPipe-Asset-Pfade', () => {
  it('WASM-Pfad enthält die Paket-Version', () => {
    expect(mediapipeWasmPath('0.10.35')).toBe('/mediapipe/wasm/0.10.35')
  })

  it('Pose-Modell liegt versioniert auf der eigenen Domain', () => {
    expect(POSE_MODEL_PATH).toBe(
      '/models/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    )
  })

  it('Hand-Modell liegt versioniert auf der eigenen Domain', () => {
    expect(HAND_MODEL_PATH).toBe(
      '/models/hand_landmarker/float16/1/hand_landmarker.task',
    )
  })

  it('kein Pfad zeigt auf eine fremde Domain', () => {
    for (const p of [mediapipeWasmPath('1.0.0'), POSE_MODEL_PATH, HAND_MODEL_PATH]) {
      expect(p.startsWith('/')).toBe(true)
      expect(p).not.toMatch(/^\/\/|https?:/)
    }
  })
})
