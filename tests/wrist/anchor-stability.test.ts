import { describe, it, expect } from 'vitest'
import { analyzeWrist } from '../../src/core/analysis/wrist-analyzer'
import type { Landmark, WristMasterPrint, SensitivityPreset } from '../../src/core/types'

// Dummy SensitivityPreset (real values from config if needed)
const sensitivity: SensitivityPreset = {
  startThresh: 5,
  fullThresh: 15,
  tensionRate: 1,
  decayRate: 1,
  wristStart: 5,
  wristFull: 15,
}

describe('Wrist-Ankerpunkt Stabilität', () => {
  const elbow: Landmark = { x: 0, y: 0, z: 0, visibility: 1 }
  const wrist: Landmark = { x: 1, y: 0, z: 0, visibility: 1 }
  const mcp: Landmark = { x: 1.2, y: 0, z: 0, visibility: 1 }

  // flexAngle matches the actual collinear angle (~0°) so angleDiff ≈ 0
  const masterPrint: WristMasterPrint = {
    mode: 'wrist',
    flexAngle: 0,
    flexBendDir: 1,
    calibArmLength2D: 1,
    calib2DAngle: 0,
  }

  it('bleibt bei konstantem Input stabil', () => {
    const first = analyzeWrist(elbow, wrist, mcp, masterPrint, sensitivity)
    for (let i = 0; i < 100; i++) {
      const result = analyzeWrist(elbow, wrist, mcp, masterPrint, sensitivity)
      expect(result.angleDiff).toBeCloseTo(first.angleDiff, 6)
      expect(result.tensionTarget).toBe(0)
    }
  })

  it('reagiert nicht auf numerisches Rauschen', () => {
    const baseline = analyzeWrist(elbow, wrist, mcp, masterPrint, sensitivity)
    for (let i = 0; i < 100; i++) {
      const noise = (Math.random() - 0.5) * 1e-6
      const noisyMcp = { ...mcp, x: mcp.x + noise }
      const result = analyzeWrist(elbow, wrist, noisyMcp, masterPrint, sensitivity)
      expect(Math.abs(result.angleDiff - baseline.angleDiff)).toBeLessThan(0.01)
      expect(result.tensionTarget).toBe(0)
    }
  })
})
