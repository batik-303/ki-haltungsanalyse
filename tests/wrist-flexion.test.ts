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

describe('computeFlexionExtensionAngle (2D image-space)', () => {
  it('returns ~0° for straight wrist (collinear)', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(2, 0, 0)
    const { angle, usedFallback } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(angle).toBeCloseTo(0, 0)
    expect(usedFallback).toBe(false)
  })

  it('returns ~90° for a right-angle bend', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(1, 1, 0)
    const { angle } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(angle).toBeCloseTo(90, 1)
  })

  it('ignores z differences (pure 2D)', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(1, 0, 0)
    const mcp = lm(2, 0, 1)
    const { angle } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(angle).toBeCloseTo(0, 0)
  })

  it('returns 0° for zero-length segments', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(0, 0, 0)
    const mcp = lm(1, 0, 0)
    const { angle } = computeFlexionExtensionAngle(elbow, wrist, mcp)
    expect(angle).toBe(0)
  })

  // Orientation-invariance: same physical bend at different forearm
  // orientations must yield matching angles under aspect correction.
  it('is orientation-invariant: 45° bend in vertical, horizontal, diagonal arms agree', () => {
    const aspect = 16 / 9
    const armLen = 0.3
    const handLen = 0.1
    const bend = Math.PI / 4 // physical 45° in screen-pixel space

    function bendAt(armAngle: number): number {
      const elbow = lm(0.5, 0.5, 0)
      // Forearm vector in pixel-equivalent space: (cos, sin) * armLen.
      // Convert back to normalized: divide x by aspect.
      const fx_px = Math.cos(armAngle) * armLen
      const fy_px = Math.sin(armAngle) * armLen
      const wrist = lm(0.5 + fx_px / aspect, 0.5 + fy_px, 0)
      // Hand vector: forearm direction rotated by `bend`.
      const handAngle = armAngle + bend
      const hx_px = Math.cos(handAngle) * handLen
      const hy_px = Math.sin(handAngle) * handLen
      const mcp = lm(wrist.x + hx_px / aspect, wrist.y + hy_px, 0)
      return computeFlexionExtensionAngle(elbow, wrist, mcp, aspect).angle
    }

    const vertical = bendAt(Math.PI / 2)
    const horizontal = bendAt(0)
    const diagonal = bendAt(Math.PI / 4)

    expect(Math.abs(vertical - 45)).toBeLessThan(0.5)
    expect(Math.abs(horizontal - 45)).toBeLessThan(0.5)
    expect(Math.abs(diagonal - 45)).toBeLessThan(0.5)
  })

  // Bend symmetry: same |angle| for up vs down bend; sign lives in BendDirection.
  it('produces equal magnitudes for symmetric up-bend vs down-bend', () => {
    const aspect = 16 / 9
    const elbow = lm(0.2, 0.5, 0)
    const wrist = lm(0.5, 0.5, 0)
    const handLen = 0.1
    const bend = Math.PI / 6 // 30°

    // Up-bend: hand vector rotated +bend from forearm-out direction.
    const upMCP = lm(wrist.x + (Math.cos(bend) * handLen) / aspect, wrist.y - Math.sin(bend) * handLen, 0)
    // Down-bend: same magnitude, opposite rotation.
    const downMCP = lm(wrist.x + (Math.cos(bend) * handLen) / aspect, wrist.y + Math.sin(bend) * handLen, 0)

    const up = computeFlexionExtensionAngle(elbow, wrist, upMCP, aspect).angle
    const down = computeFlexionExtensionAngle(elbow, wrist, downMCP, aspect).angle
    expect(Math.abs(up - down)).toBeLessThan(0.5)
  })
})

describe('computeFlexBendDirection', () => {
  it('returns nonzero magnitude for one bend direction', () => {
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
