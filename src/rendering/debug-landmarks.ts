import type { Landmark } from '../core/types'
import { usePoseStore } from '../store/pose-store'

// Full MediaPipe Pose Landmarker skeleton (33 landmarks).
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
]

const HIGHLIGHT_BY_MODE: Record<string, Set<number>> = {
  wrist: new Set([13, 15, 17, 19, 21]),
  shoulder: new Set([7, 11]),
  violin: new Set([15]),
}

// Canvas is CSS-mirrored (scaleX(-1)). Text drawn directly is mirrored too.
// This helper draws text anchored at (canvasX, canvasY) such that it reads
// normally after the CSS mirror, extending to the RIGHT of the anchor on screen.
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

export function drawDebugLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  const focusMode = usePoseStore.getState().focusMode
  const highlight = HIGHLIGHT_BY_MODE[focusMode] ?? new Set<number>()

  ctx.save()

  // 1) Full skeleton wireframe
  ctx.strokeStyle = '#5b9bd5'
  ctx.lineWidth = 1
  for (const [a, b] of POSE_CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    const va = la.visibility ?? 1
    const vb = lb.visibility ?? 1
    if (va < 0.3 || vb < 0.3) continue
    ctx.globalAlpha = Math.min(va, vb) * 0.45
    ctx.beginPath()
    ctx.moveTo(la.x * width, la.y * height)
    ctx.lineTo(lb.x * width, lb.y * height)
    ctx.stroke()
  }

  // 2) Landmark dots + index labels
  ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < landmarks.length; i++) {
    const l = landmarks[i]!
    const x = l.x * width
    const y = l.y * height
    const vis = l.visibility ?? 1
    const isHighlight = highlight.has(i)
    const radius = isHighlight ? 5 : 3

    // Visibility encodes color: low → orange/red, high → white.
    const tint = vis < 0.5 ? '#ff7043' : '#ffffff'
    ctx.fillStyle = tint
    ctx.globalAlpha = Math.max(0.45, vis)
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    if (isHighlight) {
      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Index label, anchored just left of the dot in canvas space → reads to the
    // right of the dot on screen after CSS mirror.
    ctx.fillStyle = isHighlight ? '#00e5ff' : '#ffffff'
    ctx.globalAlpha = isHighlight ? 1 : 0.75
    drawMirroredText(ctx, String(i), x - (radius + 2), y)
  }

  // 3) DEBUG badge — canvas top-right corner = screen top-left after mirror.
  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#00e5ff'
  ctx.font = 'bold 11px ui-monospace, "SF Mono", Menlo, monospace'
  ctx.textBaseline = 'top'
  drawMirroredText(ctx, 'DEBUG · press D to toggle', width - 10, 12)

  ctx.restore()
}
