import { describe, it, expect } from 'vitest'

// ── Coordinate Transformation Helpers ──
//
// These pure functions mirror the coordinate scaling used throughout
// `canvas-renderer.ts`. Landmarks arrive from MediaPipe in normalized
// [0,1] space and are mapped to canvas pixel space via:
//   px = landmark.x * canvasWidth
//   py = landmark.y * canvasHeight

/** Scale a normalized x-coordinate to canvas pixel space. */
export function scaleX(normalizedX: number, canvasWidth: number): number {
  return normalizedX * canvasWidth
}

/** Scale a normalized y-coordinate to canvas pixel space. */
export function scaleY(normalizedY: number, canvasHeight: number): number {
  return normalizedY * canvasHeight
}

/** Transform a normalized landmark to pixel coordinates. */
export function scaleLandmark(
  landmark: { x: number; y: number; z: number; visibility: number },
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; visibility: number } {
  return {
    x: scaleX(landmark.x, canvasWidth),
    y: scaleY(landmark.y, canvasHeight),
    visibility: landmark.visibility,
  }
}

// ── Tests ──

describe('scaleX', () => {
  it('maps 0 to 0', () => {
    expect(scaleX(0, 800)).toBe(0)
    expect(scaleX(0, 1920)).toBe(0)
  })

  it('maps 1 to full canvas width', () => {
    expect(scaleX(1, 800)).toBe(800)
    expect(scaleX(1, 1024)).toBe(1024)
  })

  it('maps 0.5 to half canvas width', () => {
    expect(scaleX(0.5, 800)).toBe(400)
    expect(scaleX(0.5, 1920)).toBe(960)
  })

  it('handles portrait canvas', () => {
    expect(scaleX(0.25, 375)).toBe(93.75)
  })
})

describe('scaleY', () => {
  it('maps 0 to 0', () => {
    expect(scaleY(0, 600)).toBe(0)
    expect(scaleY(0, 1080)).toBe(0)
  })

  it('maps 1 to full canvas height', () => {
    expect(scaleY(1, 600)).toBe(600)
    expect(scaleY(1, 1080)).toBe(1080)
  })

  it('maps 0.5 to half canvas height', () => {
    expect(scaleY(0.5, 600)).toBe(300)
    expect(scaleY(0.5, 1080)).toBe(540)
  })

  it('handles landscape canvas', () => {
    expect(scaleY(0.75, 720)).toBe(540)
  })
})

describe('scaleLandmark', () => {
  it('scales both x and y while preserving visibility', () => {
    const lm = { x: 0.4, y: 0.6, z: 0.5, visibility: 0.95 }
    const result = scaleLandmark(lm, 800, 600)
    expect(result.x).toBe(320)
    expect(result.y).toBe(360)
    expect(result.visibility).toBe(0.95)
  })

  it('handles edge coordinates', () => {
    const lm = { x: 0, y: 1, z: 0, visibility: 1 }
    const result = scaleLandmark(lm, 1024, 768)
    expect(result.x).toBe(0)
    expect(result.y).toBe(768)
  })

  it('uses different scaleX/scaleY for non-square canvases', () => {
    const lm = { x: 0.5, y: 0.5, z: 0, visibility: 1 }
    // Portrait canvas: 375×812
    const portrait = scaleLandmark(lm, 375, 812)
    expect(portrait.x).toBe(187.5)
    expect(portrait.y).toBe(406)
  })

  it('works with landscape canvas (iPad)', () => {
    const lm = { x: 0.3, y: 0.7, z: 0, visibility: 0.8 }
    const result = scaleLandmark(lm, 1366, 1024)
    expect(result.x).toBeCloseTo(409.8)
    expect(result.y).toBeCloseTo(716.8)
  })

  it('matches the canvas-renderer coordinate convention', () => {
    // The canvas-renderer uses: sx = leftShoulder.x * width, sy = leftShoulder.y * height
    // This test verifies the pattern is consistent for shoulder landmarks (landmark index 11)
    const leftShoulder = { x: 0.35, y: 0.2, z: -0.1, visibility: 0.99 }
    const canvasW = 1280
    const canvasH = 720

    const scaled = scaleLandmark(leftShoulder, canvasW, canvasH)
    // Verify the convention: x * width, y * height
    expect(scaled.x).toBe(leftShoulder.x * canvasW)
    expect(scaled.y).toBe(leftShoulder.y * canvasH)
  })
})