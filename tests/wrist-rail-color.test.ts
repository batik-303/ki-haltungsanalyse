import { describe, it, expect } from 'vitest'
import { createWristRailColor } from '../src/core/analysis/wrist-analyzer'

// Helper: call railColor N times with same value
function callN(fn: (v: number, g?: number) => boolean, value: number, n: number, grace = 0): boolean {
  let result = true
  for (let i = 0; i < n; i++) result = fn(value, grace)
  return result
}

describe('createWristRailColor', () => {
  it('starts in blue state', () => {
    const railColor = createWristRailColor()
    expect(railColor(0)).toBe(true)
  })

  it('stays blue below blue-to-yellow threshold regardless of frame count', () => {
    const railColor = createWristRailColor(8, 5)
    expect(callN(railColor, 7.9, 20)).toBe(true)
  })

  it('brief spike (5 frames above threshold) stays blue', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    // 5 frames above threshold — not enough for 8-frame requirement
    for (let i = 0; i < 5; i++) railColor(10)
    // drop back below
    expect(railColor(3)).toBe(true)
  })

  it('sustained deviation (8 frames) transitions to yellow', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    // 7 frames still blue
    for (let i = 0; i < 7; i++) {
      expect(railColor(10)).toBe(true)
    }
    // 8th frame triggers yellow
    expect(railColor(10)).toBe(false)
  })

  it('quick return (4 frames below threshold) transitions back to blue', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    // Trigger yellow
    callN(railColor, 10, 8)
    expect(railColor(10)).toBe(false) // confirmed yellow
    // 3 frames below — still yellow
    for (let i = 0; i < 3; i++) {
      expect(railColor(3)).toBe(false)
    }
    // 4th frame triggers blue
    expect(railColor(3)).toBe(true)
  })

  it('interrupted return resets counter', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    callN(railColor, 10, 8) // trigger yellow
    // 3 frames below, then 1 above → resets counter
    railColor(3)
    railColor(3)
    railColor(3)
    railColor(10) // interrupt
    // Now need full 4 frames again
    for (let i = 0; i < 3; i++) {
      expect(railColor(3)).toBe(false) // still yellow
    }
    expect(railColor(3)).toBe(true) // 4th → blue
  })

  it('stays yellow in hysteresis band (between yellowToBlue and blueToYellow)', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    callN(railColor, 10, 8) // trigger yellow
    // Values in hysteresis band (6°) — above yellowToBlue (5°), counter never increments
    expect(callN(railColor, 6, 20)).toBe(false) // stays yellow
  })

  it('prevents flicker at boundary with repeated crossings', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    // Oscillate around 7° — counter resets every other frame, never reaches 8
    const results: boolean[] = []
    for (let i = 0; i < 20; i++) {
      results.push(railColor(i % 2 === 0 ? 9 : 7))
    }
    expect(results.every(r => r === true)).toBe(true)
  })

  it('grace buffer raises the blue-to-yellow threshold', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    // 9° normally above 8, but with 2° grace → threshold is 10°
    expect(callN(railColor, 9, 20, 2)).toBe(true) // stays blue
    // Above 10° for 8 frames triggers yellow
    expect(callN(railColor, 10.1, 8, 2)).toBe(false)
  })

  it('full cycle: blue → yellow → blue', () => {
    const railColor = createWristRailColor(8, 5, 8, 4)
    expect(callN(railColor, 0, 5)).toBe(true)   // blue
    expect(callN(railColor, 10, 8)).toBe(false)  // yellow after 8 frames
    expect(callN(railColor, 6, 10)).toBe(false)  // hysteresis band → stays yellow
    expect(callN(railColor, 3, 4)).toBe(true)    // below 5° for 4 frames → blue
  })
})
