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

/**
 * Render the actual analysis vectors used by the wrist analyzer:
 *   - Cyan line: forearm    (pose-elbow → hand-wrist)
 *   - Lime line: hand vec   (hand-wrist → hand-middle-MCP)
 *   - White arrow: palm-normal projection (hand-wrist outward)
 *   - Arc between forearm and hand with numeric degree value
 *   - ±sign symbol marking current bend-sign sense
 * Caller passes the same effective angle the analyzer is using so the displayed
 * value matches what drives the rail color and HUD. `palmNormal` and
 * `bendSign` are optional; pass them to enable the palm/sign overlays.
 */
export function drawDebugWristVectors(
  ctx: CanvasRenderingContext2D,
  poseElbow: Landmark,
  handWrist: Landmark,
  handMiddleMCP: Landmark,
  width: number,
  height: number,
  angleDeg: number,
  palmNormal?: { x: number; y: number; z: number } | null,
  bendSign?: number,
) {
  const elbowX = poseElbow.x * width
  const elbowY = poseElbow.y * height
  const wristX = handWrist.x * width
  const wristY = handWrist.y * height
  const mcpX = handMiddleMCP.x * width
  const mcpY = handMiddleMCP.y * height

  ctx.save()

  // Forearm vector (cyan)
  ctx.strokeStyle = '#00e5ff'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(elbowX, elbowY)
  ctx.lineTo(wristX, wristY)
  ctx.stroke()

  // Hand vector (lime)
  ctx.strokeStyle = '#a3ff5b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(wristX, wristY)
  ctx.lineTo(mcpX, mcpY)
  ctx.stroke()

  // Angle arc at the wrist: from forearm-out direction to hand-out direction.
  const aF = Math.atan2(wristY - elbowY, wristX - elbowX)
  const aH = Math.atan2(mcpY - wristY, mcpX - wristX)
  const radius = Math.min(28, Math.hypot(mcpX - wristX, mcpY - wristY) * 0.9)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(wristX, wristY, radius, aF, aH)
  ctx.stroke()

  // Degree value (mirror-compensated text)
  ctx.font = 'bold 12px ui-monospace, "SF Mono", Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.95
  drawMirroredText(ctx, `${angleDeg.toFixed(1)}°`, wristX - (radius + 6), wristY - radius - 6)

  // Palm-normal arrow (white) — projects 3D normal to 2D screen space.
  if (palmNormal) {
    const nMag = Math.hypot(palmNormal.x, palmNormal.y)
    if (nMag > 1e-6) {
      // Normalize and scale to ~25px on screen. Map normalized-space x,y to
      // canvas pixels via width/height multiplication.
      const PALM_ARROW_PX = 25
      const sx = (palmNormal.x / nMag) * PALM_ARROW_PX
      const sy = (palmNormal.y / nMag) * PALM_ARROW_PX
      const tipX = wristX + sx
      const tipY = wristY + sy
      ctx.strokeStyle = '#ffffff'
      ctx.fillStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(wristX, wristY)
      ctx.lineTo(tipX, tipY)
      ctx.stroke()
      // Arrowhead
      const headAngle = Math.atan2(sy, sx)
      const headLen = 5
      ctx.beginPath()
      ctx.moveTo(tipX, tipY)
      ctx.lineTo(tipX - headLen * Math.cos(headAngle - 0.4), tipY - headLen * Math.sin(headAngle - 0.4))
      ctx.lineTo(tipX - headLen * Math.cos(headAngle + 0.4), tipY - headLen * Math.sin(headAngle + 0.4))
      ctx.closePath()
      ctx.fill()
    }
  }

  // ±sign symbol next to angle text — encodes the current bend-sign sense.
  if (bendSign !== undefined && Number.isFinite(bendSign)) {
    ctx.font = 'bold 14px ui-monospace, "SF Mono", Menlo, monospace'
    ctx.fillStyle = bendSign >= 0 ? '#a3ff5b' : '#ff9b6b'
    ctx.globalAlpha = 1
    drawMirroredText(ctx, bendSign >= 0 ? '+' : '−', wristX - (radius + 32), wristY - radius - 6)
  }

  ctx.restore()
}
