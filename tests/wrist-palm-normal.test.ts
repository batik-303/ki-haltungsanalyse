import { describe, it, expect } from 'vitest'
import {
  computePalmNormal,
  computePalmBendSign,
  computeForearmLength3D,
  updateBendLock,
} from '../src/core/analysis/wrist-analyzer'
import type { Landmark } from '../src/core/types'

function lm(x: number, y: number, z: number): Landmark {
  return { x, y, z, visibility: 1 }
}

// Build a 21-landmark hand with the indices needed for palm-normal +
// bend-sign tests; other slots are filler.
function makeHand(
  wrist: Landmark,
  indexMCP: Landmark,
  pinkyMCP: Landmark,
  middleMCP: Landmark = lm((indexMCP.x + pinkyMCP.x) / 2, (indexMCP.y + pinkyMCP.y) / 2, (indexMCP.z + pinkyMCP.z) / 2),
): Landmark[] {
  const filler = lm(0, 0, 0)
  const hand = new Array(21).fill(filler) as Landmark[]
  hand[0] = wrist
  hand[5] = indexMCP
  hand[9] = middleMCP
  hand[17] = pinkyMCP
  return hand
}

// Rodrigues rotation around an arbitrary axis (used for invariance tests).
function rotate(p: { x: number; y: number; z: number }, axis: { x: number; y: number; z: number }, theta: number) {
  const m = Math.hypot(axis.x, axis.y, axis.z)
  const k = { x: axis.x / m, y: axis.y / m, z: axis.z / m }
  const c = Math.cos(theta), s = Math.sin(theta)
  const dot = k.x * p.x + k.y * p.y + k.z * p.z
  return {
    x: p.x * c + (k.y * p.z - k.z * p.y) * s + k.x * dot * (1 - c),
    y: p.y * c + (k.z * p.x - k.x * p.z) * s + k.y * dot * (1 - c),
    z: p.z * c + (k.x * p.y - k.y * p.x) * s + k.z * dot * (1 - c),
  }
}

describe('computePalmNormal', () => {
  it('returns a vector perpendicular to (wrist→indexMCP) and (wrist→pinkyMCP)', () => {
    const wrist = lm(0, 0, 0)
    const indexMCP = lm(1, 0, 0)
    const pinkyMCP = lm(0, 1, 0)
    const hand = makeHand(wrist, indexMCP, pinkyMCP)
    const n = computePalmNormal(hand)
    // a=(1,0,0), b=(0,1,0). a×b = (0,0,1).
    expect(n.x).toBeCloseTo(0)
    expect(n.y).toBeCloseTo(0)
    expect(n.z).toBeCloseTo(1)
  })

  it('reverses direction when indexMCP and pinkyMCP swap', () => {
    const wrist = lm(0, 0, 0)
    const indexMCP = lm(1, 0, 0)
    const pinkyMCP = lm(0, 1, 0)
    const n1 = computePalmNormal(makeHand(wrist, indexMCP, pinkyMCP))
    const n2 = computePalmNormal(makeHand(wrist, pinkyMCP, indexMCP))
    expect(Math.sign(n1.z)).not.toBe(Math.sign(n2.z))
  })

  it('is non-degenerate for a realistic palm geometry', () => {
    // Forearm along +x; index on +y side, pinky on -y side, palm with slight
    // +z thickness so the cross product produces a real normal.
    const wrist = lm(0.3, 0, 0)
    const indexMCP = lm(0.35, 0.03, 0.01)
    const pinkyMCP = lm(0.35, -0.03, 0.01)
    const n = computePalmNormal(makeHand(wrist, indexMCP, pinkyMCP))
    const mag = Math.hypot(n.x, n.y, n.z)
    expect(mag).toBeGreaterThan(1e-6)
  })
})

describe('computePalmBendSign — orientation invariance', () => {
  // Realistic flexed scene: forearm along +x, palm tilted forward slightly.
  const buildFlexedScene = () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(0.3, 0, 0)
    // Straight-hand palm landmarks (index on +y, pinky on -y, with +z palm
    // thickness so palm normal is non-degenerate).
    const indexBase = { x: 0.05, y: 0.03, z: 0.01 }
    const pinkyBase = { x: 0.05, y: -0.03, z: 0.01 }
    // Flex by rotating palm around the +y axis (the axis perpendicular to
    // forearm and palm normal). This produces a real anatomical flexion.
    const tilt = Math.PI / 6 // 30°
    const indexFlex = rotate(indexBase, { x: 0, y: 1, z: 0 }, tilt)
    const pinkyFlex = rotate(pinkyBase, { x: 0, y: 1, z: 0 }, tilt)
    return {
      elbow,
      handLandmarks: makeHand(
        wrist,
        lm(wrist.x + indexFlex.x, wrist.y + indexFlex.y, wrist.z + indexFlex.z),
        lm(wrist.x + pinkyFlex.x, wrist.y + pinkyFlex.y, wrist.z + pinkyFlex.z),
      ),
    }
  }

  function rotateScene(
    scene: { elbow: Landmark; handLandmarks: Landmark[] },
    axis: { x: number; y: number; z: number },
    theta: number,
  ) {
    function rot(l: Landmark): Landmark {
      const r = rotate({ x: l.x, y: l.y, z: l.z }, axis, theta)
      return { x: r.x, y: r.y, z: r.z, visibility: l.visibility }
    }
    return { elbow: rot(scene.elbow), handLandmarks: scene.handLandmarks.map(rot) }
  }

  it('preserves sign under arbitrary rigid 3D rotation', () => {
    const base = buildFlexedScene()
    const baseSign = computePalmBendSign(base.elbow, base.handLandmarks)
    expect(Math.abs(baseSign)).toBeGreaterThan(1e-7)

    const rotations: Array<[{ x: number; y: number; z: number }, number]> = [
      [{ x: 0, y: 0, z: 1 }, Math.PI / 4],
      [{ x: 0, y: 1, z: 0 }, Math.PI / 3],
      [{ x: 1, y: 0, z: 0 }, Math.PI / 6],
      [{ x: 1, y: 1, z: 1 }, 0.7],
      [{ x: -1, y: 2, z: 0.5 }, 1.2],
    ]
    for (const [axis, theta] of rotations) {
      const rotated = rotateScene(base, axis, theta)
      const sign = computePalmBendSign(rotated.elbow, rotated.handLandmarks)
      expect(Math.sign(sign)).toBe(Math.sign(baseSign))
    }
  })

  it('flips sign when the bend reverses (palmar tilt → dorsal tilt)', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(0.3, 0, 0)
    const indexBase = { x: 0.05, y: 0.03, z: 0.01 }
    const pinkyBase = { x: 0.05, y: -0.03, z: 0.01 }

    // Strong tilts so the rotation overrides the small +z palm thickness.
    const tilt = Math.PI / 3 // 60°
    const indexFlex = rotate(indexBase, { x: 0, y: 1, z: 0 }, +tilt)
    const pinkyFlex = rotate(pinkyBase, { x: 0, y: 1, z: 0 }, +tilt)
    const indexExt = rotate(indexBase, { x: 0, y: 1, z: 0 }, -tilt)
    const pinkyExt = rotate(pinkyBase, { x: 0, y: 1, z: 0 }, -tilt)

    const flexed = makeHand(
      wrist,
      lm(wrist.x + indexFlex.x, wrist.y + indexFlex.y, wrist.z + indexFlex.z),
      lm(wrist.x + pinkyFlex.x, wrist.y + pinkyFlex.y, wrist.z + pinkyFlex.z),
    )
    const extended = makeHand(
      wrist,
      lm(wrist.x + indexExt.x, wrist.y + indexExt.y, wrist.z + indexExt.z),
      lm(wrist.x + pinkyExt.x, wrist.y + pinkyExt.y, wrist.z + pinkyExt.z),
    )

    const flexedSign = computePalmBendSign(elbow, flexed)
    const extendedSign = computePalmBendSign(elbow, extended)
    expect(Math.sign(flexedSign)).not.toBe(Math.sign(extendedSign))
  })
})

describe('updateBendLock — arm-proportional margin', () => {
  // Two arm sizes: short and long. With the old constant floor, the longer
  // arm needed proportionally more delta to switch locks. New margin scales
  // with forearm length so the same RELATIVE delta switches in both cases.
  it('switches symmetrically for proportional bend deltas across arm sizes', () => {
    const refBendDir = 0
    const angleDiff = 10 // > 8° threshold

    const shortArm = 0.1
    const longArm = 0.3

    // Use exactly 1.5× the margin for each arm — should always switch.
    const deltaShort = 0.00025 * shortArm * 1.5
    const deltaLong = 0.00025 * longArm * 1.5

    expect(updateBendLock(angleDiff, -deltaShort, refBendDir, true, shortArm)).toBe(false)
    expect(updateBendLock(angleDiff, -deltaLong, refBendDir, true, longArm)).toBe(false)
    expect(updateBendLock(angleDiff, deltaShort, refBendDir, false, shortArm)).toBe(true)
    expect(updateBendLock(angleDiff, deltaLong, refBendDir, false, longArm)).toBe(true)
  })

  it('respects hysteresis: small delta below margin does not switch', () => {
    const angleDiff = 10
    const forearm = 0.2
    const tinyDelta = 1e-6
    expect(updateBendLock(angleDiff, tinyDelta, 0, false, forearm)).toBe(false)
    expect(updateBendLock(angleDiff, -tinyDelta, 0, true, forearm)).toBe(true)
  })

  it('does not switch below 8° threshold regardless of bend magnitude', () => {
    expect(updateBendLock(5, 1.0, 0, false, 0.2)).toBe(false)
    expect(updateBendLock(7.9, 1.0, 0, false, 0.2)).toBe(false)
  })
})

describe('computeForearmLength3D', () => {
  it('returns Euclidean distance in 3D', () => {
    const elbow = lm(0, 0, 0)
    const wrist = lm(3, 4, 12)
    expect(computeForearmLength3D(elbow, wrist)).toBeCloseTo(13)
  })
})
