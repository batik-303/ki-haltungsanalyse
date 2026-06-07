import type { Landmark } from '../core/types'

// MediaPipe hand-skeleton connections (21 landmarks).
// Standard hand topology: palm + 5 fingers (thumb, index, middle, ring, pinky).
const HAND_CONNECTIONS: [number, number][] = [
  // Palm
  [0, 1], [0, 5], [0, 17], [5, 9], [9, 13], [13, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index finger
  [5, 6], [6, 7], [7, 8],
  // Middle finger
  [9, 10], [10, 11], [11, 12],
  // Ring finger
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
]

// Canvas is CSS-mirrored — text drawn directly is mirrored too.
// Helper to anchor text such that it reads normally after the CSS mirror.
function drawMirroredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasX: number,
  canvasY: number,
) {
  ctx.save()
  ctx.translate(canvasX, canvasY)
  ctx.scale(-1, 1)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

/**
 * Render 21 HandLandmarker landmarks as magenta dots with numeric index labels
 * and standard hand-skeleton connections. Pure visualization — no logic side
 * effects. Caller decides whether to invoke (only when debugLandmarks is on).
 */
export function drawDebugHandLandmarks(
  ctx: CanvasRenderingContext2D,
  handLandmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.save()

  // 1) Hand-skeleton wireframe
  ctx.strokeStyle = '#ff00ff'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.55
  for (const [a, b] of HAND_CONNECTIONS) {
    const la = handLandmarks[a]
    const lb = handLandmarks[b]
    if (!la || !lb) continue
    ctx.beginPath()
    ctx.moveTo(la.x * width, la.y * height)
    ctx.lineTo(lb.x * width, lb.y * height)
    ctx.stroke()
  }

  // 2) Landmark dots + index labels
  ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < handLandmarks.length; i++) {
    const l = handLandmarks[i]!
    const x = l.x * width
    const y = l.y * height
    const radius = 4

    ctx.fillStyle = '#ff00ff'
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    // Index label, anchored just left of the dot in canvas space → reads to the
    // right of the dot on screen after CSS mirror.
    ctx.fillStyle = '#ff80ff'
    ctx.globalAlpha = 0.9
    drawMirroredText(ctx, String(i), x - (radius + 2), y)
  }

  ctx.restore()
}
