import { describe, expect, it } from 'vitest'
import {
  computeEarShoulderDistance,
  computeShoulderDeviation,
  computeShoulderTensionTarget,
} from '../../src/core/analysis/shoulder-analyzer'
import type { Landmark, SensitivityPreset, ShoulderMasterPrint } from '../../src/core/types'

/**
 * #168: Charakterisierungs-Tests für den Schulter-Modus.
 * Abstand Ohr ↔ Schulter (2D); Schulter zieht hoch = Abstand kleiner = positive Abweichung.
 */
const point = (x: number, y: number): Landmark => ({ x, y, z: 0, visibility: 1 })

const preset = (startThresh: number, fullThresh: number): SensitivityPreset => ({
  startThresh,
  fullThresh,
  tensionRate: 0,
  decayRate: 0,
  wristStart: 0,
  wristFull: 0,
})

describe('computeEarShoulderDistance', () => {
  it('misst den 2D-Abstand (z wird ignoriert)', () => {
    const ear = { ...point(0, 0), z: 9 }
    expect(computeEarShoulderDistance(ear, point(0.3, 0.4))).toBeCloseTo(0.5, 10)
  })
})

describe('computeShoulderDeviation', () => {
  const mp: ShoulderMasterPrint = { mode: 'shoulder', earShoulderDist: 0.2 }

  it('ist 0 bei gleichem Abstand wie gespeichert', () => {
    expect(computeShoulderDeviation(point(0.5, 0.3), point(0.5, 0.5), mp)).toBeCloseTo(0, 10)
  })

  it('ist positiv, wenn die Schulter näher zum Ohr kommt (Anteil vom gespeicherten Abstand)', () => {
    expect(computeShoulderDeviation(point(0.5, 0.3), point(0.5, 0.45), mp)).toBeCloseTo(0.25, 10)
  })

  it('ist negativ, wenn der Abstand größer wird', () => {
    expect(computeShoulderDeviation(point(0.5, 0.3), point(0.5, 0.6), mp)).toBeCloseTo(-0.5, 10)
  })
})

describe('computeShoulderTensionTarget', () => {
  it('ist 0 bis einschließlich Start-Schwelle', () => {
    expect(computeShoulderTensionTarget(-0.1, preset(0.1, 0.3))).toBe(0)
    expect(computeShoulderTensionTarget(0.1, preset(0.1, 0.3))).toBe(0)
  })

  it('steigt linear zwischen Start- und Voll-Schwelle', () => {
    expect(computeShoulderTensionTarget(0.2, preset(0.1, 0.3))).toBeCloseTo(50, 10)
  })

  it('ist höchstens 100', () => {
    expect(computeShoulderTensionTarget(0.3, preset(0.1, 0.3))).toBeCloseTo(100, 10)
    expect(computeShoulderTensionTarget(5, preset(0.1, 0.3))).toBe(100)
  })

  it('ist 0, wenn die Voll-Schwelle nicht über der Start-Schwelle liegt', () => {
    expect(computeShoulderTensionTarget(0.5, preset(0.3, 0.3))).toBe(0)
    expect(computeShoulderTensionTarget(0.5, preset(0.3, 0.2))).toBe(0)
  })
})
