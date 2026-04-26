import type { SensitivityLevel, SensitivityPreset } from '../types'

export const SENSITIVITY_PRESETS: Record<SensitivityLevel, SensitivityPreset> = {
  // Profi (locker): breiter Toleranzbereich
  low: {
    startThresh: 0.06,
    fullThresh: 0.25,
    tensionRate: 1.0,
    decayRate: 3.0,
    wristStart: 8,
    wristFull: 30,
  },
  // Standard: 3%-20% = viel gelbe Zone
  med: {
    startThresh: 0.03,
    fullThresh: 0.20,
    tensionRate: 1.5,
    decayRate: 2.5,
    wristStart: 5,
    wristFull: 25,
  },
  // Anfänger (streng): engerer Bereich
  high: {
    startThresh: 0.015,
    fullThresh: 0.14,
    tensionRate: 2.2,
    decayRate: 2.0,
    wristStart: 3,
    wristFull: 18,
  },
}
