import { describe, it, expect } from 'vitest'
import { createViolinAnalyzer } from '../../src/core/analysis/violin-analyzer'

describe('Violin-Ankerpunkt Stabilität', () => {
  it('bleibt bei konstantem Input stabil', () => {
    const analyzer = createViolinAnalyzer(60)
    const masterPrint = { calibWristY: 0.5 } as any
    // 100 Frames mit exakt gleichem Wert
    for (let i = 0; i < 100; i++) {
      const result = analyzer.analyze(0.5, masterPrint)
      expect(result.effectiveDrift).toBeCloseTo(0, 6)
      expect(result.tensionTarget).toBe(0)
    }
  })

  it('reagiert nicht auf numerisches Rauschen', () => {
    const analyzer = createViolinAnalyzer(60)
    const masterPrint = { calibWristY: 0.5 } as any
    // 100 Frames mit minimalem Rauschen
    for (let i = 0; i < 100; i++) {
      const noise = (Math.random() - 0.5) * 1e-6
      const result = analyzer.analyze(0.5 + noise, masterPrint)
      expect(Math.abs(result.effectiveDrift)).toBeLessThan(1e-5)
      expect(result.tensionTarget).toBe(0)
    }
  })
})
