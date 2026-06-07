import { describe, it, expect } from 'vitest'
import { selectAnalysisPath } from '../src/core/analysis/analysis-path'
import type { Landmark } from '../src/core/types'

function lm(x: number, y: number, z = 0): Landmark {
  return { x, y, z, visibility: 1 }
}

const validHand = Array.from({ length: 21 }, () => lm(0, 0))

describe('selectAnalysisPath', () => {
  it('returns "hand" when hand landmarks are present', () => {
    expect(selectAnalysisPath(validHand)).toBe('hand')
  })

  it('returns "pose-fallback" when hand landmarks are null', () => {
    expect(selectAnalysisPath(null)).toBe('pose-fallback')
  })

  it('returns "pose-fallback" when hand landmarks are undefined', () => {
    expect(selectAnalysisPath(undefined)).toBe('pose-fallback')
  })

  it('returns "pose-fallback" when hand landmarks is an empty array', () => {
    expect(selectAnalysisPath([])).toBe('pose-fallback')
  })

  it('treats any non-empty array as "hand" — handedness filtering lives upstream', () => {
    // pickLeftHand returns null when no Left-categorized hand is found, so by
    // the time we reach selectAnalysisPath, a non-null array always means
    // a usable Left hand was selected. This test pins that contract.
    expect(selectAnalysisPath([lm(0.5, 0.5)])).toBe('hand')
  })
})
