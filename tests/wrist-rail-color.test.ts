import { describe, it, expect } from 'vitest'
import { createWristRailColor } from '../src/core/analysis/wrist-analyzer'

describe('createWristRailColor', () => {
  it('starts in blue state', () => {
    const railColor = createWristRailColor()
    expect(railColor(0)).toBe(true)
  })

  it('stays blue below blue-to-yellow threshold', () => {
    const railColor = createWristRailColor(8, 5)
    expect(railColor(7.9)).toBe(true)
    expect(railColor(5)).toBe(true)
    expect(railColor(0)).toBe(true)
  })

  it('stays blue at exact threshold, transitions above', () => {
    const railColor = createWristRailColor(8, 5)
    expect(railColor(8)).toBe(true)  // exactly 8° stays blue (strict >)
    expect(railColor(8.1)).toBe(false) // above 8° → yellow
  })

  it('stays yellow in hysteresis band (between yellowToBlue and blueToYellow)', () => {
    const railColor = createWristRailColor(8, 5)
    // Trigger yellow
    railColor(10)
    // Drop into hysteresis band
    expect(railColor(6)).toBe(false) // still yellow
    expect(railColor(5.5)).toBe(false) // still yellow
    expect(railColor(5)).toBe(false) // exactly at threshold = still yellow
  })

  it('transitions back to blue below yellow-to-blue threshold', () => {
    const railColor = createWristRailColor(8, 5)
    railColor(10) // trigger yellow
    expect(railColor(4.9)).toBe(true) // below 5 → back to blue
  })

  it('prevents flicker at boundary with repeated crossings', () => {
    const railColor = createWristRailColor(8, 5)
    // Oscillate around 7° — should stay blue throughout
    const results: boolean[] = []
    for (let i = 0; i < 10; i++) {
      results.push(railColor(6.5 + (i % 2 === 0 ? 0.5 : -0.5)))
    }
    expect(results.every(r => r === true)).toBe(true)
  })

  it('prevents flicker once yellow with values in hysteresis band', () => {
    const railColor = createWristRailColor(8, 5)
    railColor(9) // trigger yellow
    // Oscillate between 5.5 and 7.5 — should stay yellow throughout
    const results: boolean[] = []
    for (let i = 0; i < 10; i++) {
      results.push(railColor(5.5 + (i % 2 === 0 ? 1 : 0)))
    }
    expect(results.every(r => r === false)).toBe(true)
  })

  it('grace buffer raises the blue-to-yellow threshold', () => {
    const railColor = createWristRailColor(8, 5)
    // 8° would normally trigger yellow, but with 2° grace → threshold is 10°
    expect(railColor(9, 2)).toBe(true) // still blue
    expect(railColor(10, 2)).toBe(true) // exactly 10° stays blue (strict >)
    expect(railColor(10.1, 2)).toBe(false) // above 10° → yellow
  })

  it('grace buffer does not affect yellow-to-blue threshold', () => {
    const railColor = createWristRailColor(8, 5)
    railColor(12, 2) // trigger yellow with grace
    // Yellow-to-blue threshold stays at 5° regardless of grace
    expect(railColor(4.9, 2)).toBe(true) // below 5 → blue
  })

  it('full cycle: blue → yellow → blue', () => {
    const railColor = createWristRailColor(8, 5)
    expect(railColor(0)).toBe(true)   // blue
    expect(railColor(5)).toBe(true)   // still blue
    expect(railColor(8.1)).toBe(false) // yellow (above 8°)
    expect(railColor(6)).toBe(false)  // still yellow (hysteresis)
    expect(railColor(4)).toBe(true)   // blue again
    expect(railColor(7)).toBe(true)   // stays blue (below 8)
  })
})
