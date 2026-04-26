import type { Landmark } from '../core/types'

// Landmark connection pairs for body outline
const CONNECTIONS: [number, number][] = [
  [11, 12], // shoulder-shoulder
  [11, 13], // left shoulder-elbow
  [13, 15], // left elbow-wrist
  [12, 14], // right shoulder-elbow
  [14, 16], // right elbow-wrist
  [11, 23], // left shoulder-hip
  [12, 24], // right shoulder-hip
  [23, 24], // hip-hip
]

/**
 * Draw a faint body silhouette connecting key landmarks.
 */
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = '#5b9bd5'
  ctx.lineWidth = 1.5

  for (const [a, b] of CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (la && lb) {
      ctx.beginPath()
      ctx.moveTo(la.x * width, la.y * height)
      ctx.lineTo(lb.x * width, lb.y * height)
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
}
