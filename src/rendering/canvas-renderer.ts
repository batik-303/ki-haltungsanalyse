import type { Landmark } from '../core/types'
import { usePoseStore } from '../store/pose-store'
import { drawSilhouette } from './silhouette'
import { drawSapphireAnchor } from './sapphire-anchor'
import { drawFreedomSpace } from './freedom-space'
import { drawWristLines } from './wrist-lines'
import { drawGoldenBand } from './golden-band'
import { drawReturnGlow } from './return-glow'
import { drawTargetZone } from './target-zone'
import { getTensionColor } from './colors'

/**
 * Main render dispatch. Called every frame from the detection loop.
 * Reads store via getState() — no React subscription, no re-renders.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  landmarks: Landmark[] | null,
  _dt: number,
) {
  const state = usePoseStore.getState()

  if (!landmarks) return

  // Always draw body silhouette
  drawSilhouette(ctx, landmarks, width, height)

  const { focusMode, masterPrint, isCalibrating, tensionScore, returnGlowTimer, distanceOk } = state

  // ── Pre-calibration: target zone + preview anchor ──
  if (!masterPrint && !isCalibrating) {
    drawTargetZone(ctx, width, height, distanceOk)
  }

  // ── SHOULDER MODE ──
  if (focusMode === 'shoulder') {
    const leftShoulder = landmarks[11]!
    const leftEar = landmarks[7]!
    const sx = leftShoulder.x * width
    const sy = leftShoulder.y * height
    const ex = leftEar.x * width
    const ey = leftEar.y * height

    if (masterPrint && !isCalibrating) {
      const color = getTensionColor(tensionScore)

      // Freedom space
      drawFreedomSpace(ctx, sx, sy, ex, ey, tensionScore, now)

      // Sapphire anchor on shoulder
      const coreR = 10 + Math.sin(now / 600) * 1
      drawSapphireAnchor(ctx, sx, sy, coreR, now)

      // Small dot at ear
      ctx.beginPath()
      ctx.arc(ex, ey, 5, 0, Math.PI * 2)
      ctx.fillStyle = tensionScore < 15 ? '#64B5F6' : color
      ctx.globalAlpha = 0.6
      ctx.fill()
      ctx.globalAlpha = 1

      // Return glow
      drawReturnGlow(ctx, sx, sy, coreR, returnGlowTimer, false)

      // Low confidence warning
      const conf = leftShoulder.visibility ?? 0
      const earConf = leftEar.visibility ?? 0
      if (conf < 0.5 || earConf < 0.5) {
        ctx.font = '12px sans-serif'
        ctx.fillStyle = '#FF9800'
        ctx.globalAlpha = 0.8
        ctx.textAlign = 'center'
        ctx.fillText('⚠ Teilweise verdeckt', sx, sy - 30)
        ctx.globalAlpha = 1
      }
    } else if (!isCalibrating) {
      // Preview: pulsing anchor + faint space
      const pulseR = 14 + Math.sin(now / 400) * 2
      drawSapphireAnchor(ctx, sx, sy, pulseR, now)
      const previewCX = (sx + ex) / 2
      ctx.beginPath()
      ctx.roundRect(previewCX - 25, ey + 5, 50, sy - ey - 10, 8)
      ctx.fillStyle = '#2196F3'
      ctx.globalAlpha = 0.08
      ctx.fill()
      ctx.strokeStyle = '#2196F3'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.15
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // ── WRIST MODE ──
  else if (focusMode === 'wrist') {
    const elbow = landmarks[13]!
    const wrist = landmarks[15]!
    const index = landmarks[19]!
    const ex = elbow.x * width, ey = elbow.y * height
    const wx = wrist.x * width, wy = wrist.y * height
    const ix = index.x * width, iy = index.y * height

    if (masterPrint && !isCalibrating) {
      drawWristLines(
        ctx, ex, ey, wx, wy, ix, iy,
        tensionScore,
        state.lastBendForward,
        state.rawDeviation * 30, // Convert back to degrees
      )

      const coreR = 11 + Math.sin(now / 600) * 1
      drawSapphireAnchor(ctx, wx, wy, coreR, now)
      drawReturnGlow(ctx, wx, wy, coreR, returnGlowTimer, false)
    } else if (!isCalibrating) {
      // Preview
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(wx, wy)
      ctx.lineTo(ix, iy)
      ctx.strokeStyle = '#2e86c1'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.4
      ctx.stroke()
      ctx.globalAlpha = 1

      const pulseR = 12 + Math.sin(now / 400) * 2
      drawSapphireAnchor(ctx, wx, wy, pulseR, now)
    }
  }

  // ── VIOLIN MODE ──
  else if (focusMode === 'violin') {
    const wrist = landmarks[15]!
    const wx = wrist.x * width, wy = wrist.y * height

    if (masterPrint && masterPrint.mode === 'violin' && !isCalibrating) {
      const anchorX = wx
      const anchorY = masterPrint.calibWristY * height

      drawGoldenBand(ctx, anchorX, anchorY, wx, wy, tensionScore, now)

      const coreR = 12 + Math.sin(now / 600) * 1
      drawSapphireAnchor(ctx, anchorX, anchorY, coreR, now)

      // Small dot at actual wrist
      ctx.beginPath()
      ctx.arc(wx, wy, 5, 0, Math.PI * 2)
      ctx.fillStyle = tensionScore < 10 ? '#2196F344' : '#DAA52088'
      ctx.fill()

      drawReturnGlow(ctx, anchorX, anchorY, coreR, returnGlowTimer, true)
    } else if (!isCalibrating) {
      const pulseR = 12 + Math.sin(now / 400) * 2
      drawSapphireAnchor(ctx, wx, wy, pulseR, now)

      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(wx - 60, wy)
      ctx.lineTo(wx + 60, wy)
      ctx.strokeStyle = '#2196F3'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.setLineDash([])
    }
  }
}
