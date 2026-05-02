import { describe, it, expect } from 'vitest'
import {
  computeCollinearityAngle2D,
  computeZBoost,
  smoothDirection2D,
  createWristRailTimer,
  computeBendDirection2D,
} from '../src/core/analysis/wrist-analyzer'
import type { Landmark } from '../src/core/types'

function lm(x: number, y: number, z = 0): Landmark {
  return { x, y, z, visibility: 1 }
}

// ── computeCollinearityAngle2D ──

describe('computeCollinearityAngle2D', () => {
  it('returns ~0° for perfectly straight (collinear) points', () => {
    const angle = computeCollinearityAngle2D(lm(0, 0), lm(1, 0), lm(2, 0))
    expect(angle).toBeCloseTo(0, 0)
  })

  it('returns ~90° for a right-angle bend', () => {
    const angle = computeCollinearityAngle2D(lm(0, 0), lm(1, 0), lm(1, 1))
    expect(angle).toBeCloseTo(90, 0)
  })

  it('returns ~180° for opposite direction (hand folds back)', () => {
    const angle = computeCollinearityAngle2D(lm(0, 0), lm(1, 0), lm(0, 0))
    // MCP == Elbow means hand vector is exactly opposite to arm vector
    expect(angle).toBeCloseTo(180, 0)
  })

  it('returns 0° when arm or hand segment has zero length', () => {
    expect(computeCollinearityAngle2D(lm(1, 1), lm(1, 1), lm(2, 2))).toBe(0)
    expect(computeCollinearityAngle2D(lm(0, 0), lm(1, 1), lm(1, 1))).toBe(0)
  })

  it('detects lateral bend (radial/ulnar)', () => {
    // Arm horizontal, hand bends upward at 45°
    const angle = computeCollinearityAngle2D(lm(0, 0), lm(1, 0), lm(2, -1))
    expect(angle).toBeCloseTo(45, 0)
  })

  it('ignores z-axis differences', () => {
    // Same x,y as straight, different z values
    const angle = computeCollinearityAngle2D(lm(0, 0, 0), lm(1, 0, 0.5), lm(2, 0, 1))
    expect(angle).toBeCloseTo(0, 0)
  })
})

// ── computeBendDirection2D ──

describe('computeBendDirection2D', () => {
  it('returns opposite signs for opposite bends', () => {
    const dirUp = computeBendDirection2D(lm(0, 0), lm(1, 0), lm(2, -1))
    const dirDown = computeBendDirection2D(lm(0, 0), lm(1, 0), lm(2, 1))
    expect(Math.sign(dirUp)).not.toBe(Math.sign(dirDown))
  })

  it('returns ~0 for straight line', () => {
    const dir = computeBendDirection2D(lm(0, 0), lm(1, 0), lm(2, 0))
    expect(Math.abs(dir)).toBeCloseTo(0, 5)
  })
})

// ── computeZBoost ──

describe('computeZBoost', () => {
  it('does not boost when 2D angle >= 3°', () => {
    expect(computeZBoost(5, 0.1, 0, 0.02, 8)).toBe(5)
    expect(computeZBoost(3, 0.1, 0, 0.02, 8)).toBe(3)
  })

  it('boosts when 2D < 3° and z-delta exceeds threshold', () => {
    expect(computeZBoost(1, 0.05, 0, 0.02, 8)).toBe(8)
  })

  it('does not boost when z-delta is below threshold', () => {
    expect(computeZBoost(1, 0.01, 0, 0.02, 8)).toBe(1)
  })

  it('returns max of 2D and boost (not always boost)', () => {
    // 2D is 2.5, boost would be 8 → 8
    expect(computeZBoost(2.5, 0.05, 0, 0.02, 8)).toBe(8)
    // 2D is 0, z below threshold → 0
    expect(computeZBoost(0, 0.01, 0, 0.02, 8)).toBe(0)
  })
})

// ── smoothDirection2D ──

describe('smoothDirection2D', () => {
  it('returns normalized vector', () => {
    const { x, y } = smoothDirection2D(1, 0, 0, 1, 0.5)
    const mag = Math.sqrt(x * x + y * y)
    expect(mag).toBeCloseTo(1, 5)
  })

  it('converges to target direction within 10 frames', () => {
    let dx = 1, dy = 0
    const targetX = 0, targetY = 1
    for (let i = 0; i < 10; i++) {
      const result = smoothDirection2D(dx, dy, targetX, targetY, 0.15)
      dx = result.x
      dy = result.y
    }
    // After 10 frames, should be close to (0, 1)
    expect(dy).toBeGreaterThan(0.7)
  })

  it('stays stable under jitter when alpha is low', () => {
    let dx = 1, dy = 0
    // Alternate tiny jitter around (1, 0)
    for (let i = 0; i < 20; i++) {
      const jitterX = 1 + (i % 2 === 0 ? 0.05 : -0.05)
      const jitterY = i % 2 === 0 ? 0.03 : -0.03
      const result = smoothDirection2D(dx, dy, jitterX, jitterY, 0.15)
      dx = result.x
      dy = result.y
    }
    // Should stay very close to (1, 0)
    expect(dx).toBeGreaterThan(0.95)
    expect(Math.abs(dy)).toBeLessThan(0.1)
  })
})

// ── createWristRailTimer ──

describe('createWristRailTimer', () => {
  it('rises at +dt when straight', () => {
    const timer = createWristRailTimer(5, 3)
    const r = timer(true, 1, 1000)
    expect(r.timerValue).toBeCloseTo(1)
    expect(r.success).toBe(false)
  })

  it('decays at -3×dt when bent', () => {
    const timer = createWristRailTimer(5, 3)
    timer(true, 3, 3000) // rise to 3
    const r = timer(false, 1, 4000) // decay 3×1 = 3
    expect(r.timerValue).toBeCloseTo(0)
  })

  it('clamps to 0 (never negative)', () => {
    const timer = createWristRailTimer(5, 3)
    const r = timer(false, 2, 2000)
    expect(r.timerValue).toBe(0)
  })

  it('fires success at 5s and resets', () => {
    const timer = createWristRailTimer(5, 3)
    timer(true, 4.5, 4500)
    const r = timer(true, 0.6, 5100) // pushes past 5
    expect(r.success).toBe(true)
    expect(r.timerValue).toBe(0) // reset
    expect(r.successGlow).toBeCloseTo(1)
  })

  it('glow decays over 600ms after success', () => {
    const timer = createWristRailTimer(5, 3)
    timer(true, 4.5, 4500)
    timer(true, 0.6, 5100) // success at 5100ms
    const r = timer(true, 0.3, 5400) // 300ms later
    expect(r.successGlow).toBeCloseTo(0.5, 1)
    const r2 = timer(true, 0.3, 5700) // 600ms later
    expect(r2.successGlow).toBeCloseTo(0, 1)
  })

  it('brief deviation is recoverable', () => {
    const timer = createWristRailTimer(5, 3)
    timer(true, 4, 4000) // 4s built up
    timer(false, 0.2, 4200) // brief 0.2s bend → lose 0.6s
    const r = timer(true, 0, 4200) // check value
    expect(r.timerValue).toBeCloseTo(3.4, 1) // 4 - 0.6
    expect(r.success).toBe(false)
  })

  it('can fire multiple times in one session', () => {
    const timer = createWristRailTimer(5, 3)
    const r1 = timer(true, 5, 5000) // first success
    expect(r1.success).toBe(true)
    expect(r1.timerValue).toBe(0)
    // Build up again
    const r2 = timer(true, 5, 10000) // second success
    expect(r2.success).toBe(true)
    expect(r2.timerValue).toBe(0)
  })
})
