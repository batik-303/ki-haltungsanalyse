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
    expect(computeZBoost(5, 0.1, 0, 0.02, 4)).toBe(5)
    expect(computeZBoost(3, 0.1, 0, 0.02, 4)).toBe(3)
  })

  it('does not boost when z-delta is below threshold', () => {
    expect(computeZBoost(1, 0.01, 0, 0.02, 4)).toBe(1)
    expect(computeZBoost(0, 0.02, 0, 0.02, 4)).toBe(0) // exactly at threshold = no boost
  })

  it('applies partial boost at midpoint of ramp', () => {
    // zDelta = 0.04 (midpoint: threshold=0.02, 3×threshold=0.06)
    // ramp = (0.04 - 0.02) / (0.02 * 2) = 0.5 → zContribution = 4 * 0.5 = 2
    expect(computeZBoost(0, 0.04, 0, 0.02, 4)).toBeCloseTo(2, 1)
  })

  it('applies full boost above 3×threshold', () => {
    // zDelta = 0.08 > 3×threshold=0.06 → ramp clamped to 1 → full boostDeg
    expect(computeZBoost(1, 0.08, 0, 0.02, 4)).toBe(4)
  })

  it('ramps linearly between threshold and 3×threshold', () => {
    // zDelta = 0.03 → ramp = (0.03-0.02)/(0.04) = 0.25 → 4*0.25 = 1
    expect(computeZBoost(0, 0.03, 0, 0.02, 4)).toBeCloseTo(1, 1)
    // zDelta = 0.05 → ramp = (0.05-0.02)/(0.04) = 0.75 → 4*0.75 = 3
    expect(computeZBoost(0, 0.05, 0, 0.02, 4)).toBeCloseTo(3, 1)
  })

  it('returns max of 2D and z-contribution', () => {
    // 2D is 2.5, zContribution at full ramp = 4 → max(2.5, 4) = 4
    expect(computeZBoost(2.5, 0.08, 0, 0.02, 4)).toBe(4)
    // 2D is 0, z below threshold → 0
    expect(computeZBoost(0, 0.01, 0, 0.02, 4)).toBe(0)
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
    const timer = createWristRailTimer([3, 5, 10, 15])
    const r = timer(true, 1, 1000)
    expect(r.timerValue).toBeCloseTo(1)
    expect(r.success).toBe(false)
    expect(r.milestoneLevel).toBe(0)
    expect(r.currentTarget).toBe(3)
  })

  it('freezes (not decays) when bent', () => {
    const timer = createWristRailTimer([5])
    timer(true, 3, 3000) // rise to 3
    const r = timer(false, 1, 4000) // freeze — stays at 3
    expect(r.timerValue).toBeCloseTo(3)
  })

  it('timer stays at 0 when never straight', () => {
    const timer = createWristRailTimer([3])
    const r = timer(false, 2, 2000)
    expect(r.timerValue).toBe(0)
  })

  it('fires success at first milestone (3s) and resets', () => {
    const timer = createWristRailTimer([3, 5, 10, 15])
    timer(true, 2.5, 2500)
    const r = timer(true, 0.6, 3100) // pushes past 3
    expect(r.success).toBe(true)
    expect(r.timerValue).toBe(0) // reset
    expect(r.successGlow).toBeCloseTo(1)
    expect(r.milestoneLevel).toBe(1) // advanced
    // currentTarget was the target that triggered success (3), next call will show 5
  })

  it('progresses through ladder: 3 → 5 → 10 → 15', () => {
    const timer = createWristRailTimer([3, 5, 10, 15])

    // Milestone 1: 3s
    const r1 = timer(true, 3, 3000)
    expect(r1.success).toBe(true)
    expect(r1.milestoneLevel).toBe(1)

    // Milestone 2: 5s
    const r2 = timer(true, 5, 8000)
    expect(r2.success).toBe(true)
    expect(r2.milestoneLevel).toBe(2)

    // Milestone 3: 10s
    const r3 = timer(true, 10, 18000)
    expect(r3.success).toBe(true)
    expect(r3.milestoneLevel).toBe(3)

    // Milestone 4: 15s
    const r4 = timer(true, 15, 33000)
    expect(r4.success).toBe(true)
    expect(r4.milestoneLevel).toBe(4)
  })

  it('repeats last ladder value in steady state', () => {
    const timer = createWristRailTimer([3, 5])

    // Exhaust ladder
    timer(true, 3, 3000) // milestone 1
    timer(true, 5, 8000) // milestone 2

    // Steady state: should require 5s (last value)
    const r = timer(true, 5, 13000)
    expect(r.success).toBe(true)
    expect(r.milestoneLevel).toBe(3)
    expect(r.currentTarget).toBe(5)
  })

  it('glow decays over 600ms after success', () => {
    const timer = createWristRailTimer([3])
    timer(true, 3, 3000) // success at 3000ms
    const r = timer(true, 0.3, 3300) // 300ms later
    expect(r.successGlow).toBeCloseTo(0.5, 1)
    const r2 = timer(true, 0.3, 3600) // 600ms later
    expect(r2.successGlow).toBeCloseTo(0, 1)
  })

  it('freeze preserves progress across deviation', () => {
    const timer = createWristRailTimer([5])
    timer(true, 4, 4000) // 4s built up
    timer(false, 2, 6000) // 2s deviation — freezes at 4
    const r = timer(true, 0, 6000) // check value
    expect(r.timerValue).toBeCloseTo(4)
    expect(r.success).toBe(false)
  })

  it('completes after freeze + resume', () => {
    const timer = createWristRailTimer([5])
    timer(true, 3, 3000) // 3s
    timer(false, 5, 8000) // freeze at 3
    const r = timer(true, 2, 10000) // resume +2 = 5 → success
    expect(r.success).toBe(true)
    expect(r.timerValue).toBe(0)
  })

  it('milestone level tracks correctly across multiple successes', () => {
    const timer = createWristRailTimer([3, 5, 10, 15])
    timer(true, 3, 3000)
    expect(timer(true, 0, 3000).milestoneLevel).toBe(1)
    timer(true, 5, 8000)
    expect(timer(true, 0, 8000).milestoneLevel).toBe(2)
  })
})
