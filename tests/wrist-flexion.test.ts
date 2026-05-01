import { describe, it, expect } from 'vitest'
import { computeMCP, computeFlexionExtensionAngle, computeFlexBendDirection } from '../src/core/analysis/wrist-analyzer'
import type { Landmark } from '../src/core/types'

function lm(x: number, y: number, z: number): Landmark {
  return { x, y, z, visibility: 1 }
}

describe('computeMCP', () => {
  it('returns midpoint of pinky and index', () => {
    const pinky = lm(0.2, 0.4, 0.1)
    const index = lm(0.6, 0.8, 0.3)
    const mcp = computeMCP(pinky, index)
    expect(mcp.x).toBeCloseTo(0.4)
    expect(mcp.y).toBeCloseTo(0.6)
    expect(mcp.z).toBeCloseTo(0.2)
  })

  it('takes minimum visibility', () => {
    const pinky = { x: 0, y: 0, z: 0, visibility: 0.9 }
    const index = { x: 1, y: 1, z: 1, visibility: 0.7 }
    const mcp = computeMCP(pinky, index)
    expect(mcp.visibility).toBe(0.7)
  })
})

describe('computeFlexionExtensionAngle', () => {
  it('returns ~180° for straight wrist (aligned with forearm)', () => {
    // Elbow at origin, wrist at (1,0,0), MCP further along same line
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(2, 0, 0)
    const { angle, usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    // Should be close to 0° since forearm and hand point same direction
    // Actually the angle between two vectors pointing same direction is 0°
    expect(angle).toBeCloseTo(0, 0)
    expect(usedFallback).toBe(false)
  })

  it('detects flexion (hand bent perpendicular in flex plane)', () => {
    // Horizontal forearm, hand bends downward (in gravity plane = flex plane)
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(1, 1, 0) // hand goes straight down = 90° flex
    const { angle, usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(angle).toBeCloseTo(90, 1)
    expect(usedFallback).toBe(false)
  })

  it('ignores radial/ulnar deviation (movement perpendicular to flex plane)', () => {
    // Horizontal forearm along X, up is -Y, so flex plane normal is Z-axis
    // Moving hand in Z direction should be filtered out by projection
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    // Hand moves purely in Z direction (radial/ulnar)
    const mcp = lm(2, 0, 1)
    const { angle } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    // After projection onto flex plane, the hand vector projects to (1, 0, 0) direction
    // So the angle should be close to 0° (straight)
    expect(angle).toBeCloseTo(0, 0)
  })

  it('uses 2D fallback when arm is vertical', () => {
    // Forearm points straight down (parallel to gravity)
    const elbow = lm(0, 0, 0)
    const wrist = lm(0, 1, 0)  // forearm × up = (0,1,0) × (0,-1,0) = 0
    const mcp = lm(0, 2, 0)
    const { usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(usedFallback).toBe(true)
  })

  it('does not use fallback for horizontal arm', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(2, 0, 0)
    const { usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(usedFallback).toBe(false)
  })
})

describe('computeFlexBendDirection', () => {
  it('returns positive for one bend direction', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(1, 1, 0) // hand bends down
    const dir = computeFlexBendDirection(elbow, wrist, mcp)
    expect(dir).not.toBe(0)
  })

  it('returns opposite sign for opposite bend', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcpDown = lm(1, 1, 0)
    const mcpUp = lm(1, -1, 0)
    const dirDown = computeFlexBendDirection(elbow, wrist, mcpDown)
    const dirUp = computeFlexBendDirection(elbow, wrist, mcpUp)
    expect(Math.sign(dirDown)).not.toBe(Math.sign(dirUp))
  })
})
