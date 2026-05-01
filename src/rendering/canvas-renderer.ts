import type { Landmark } from '../core/types'
import { usePoseStore } from '../store/pose-store'
import { drawSilhouette } from './silhouette'
import { drawSapphireAnchor } from './sapphire-anchor'
import { drawWristLines } from './wrist-lines'
import { drawWristSideView } from './wrist-side-view'
import { drawGoldenBand } from './golden-band'
import { drawReturnGlow } from './return-glow'
import { drawTargetZone } from './target-zone'

// Module-level glow state for wrist feedback (persists across frames)
let wristGlowLevel = 0
let wristGlowDecay = 0
let lastWristRepaired = false

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

  const { focusMode, masterPrint, isCalibrating, tensionScore, returnGlowTimer, distanceOk, viewMode, driftDirection, flowStreak, lastBendForward, rawDeviation } = state
  const isFlow = viewMode === 'flow'

  // ── Flow mode: black background ──
  if (isFlow) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  }

  // Silhouette only in analyse mode
  if (!isFlow && landmarks) {
    drawSilhouette(ctx, landmarks, width, height)
  }

  // ── Pre-calibration: target zone + preview anchor (analyse only) ──
  if (!masterPrint && !isCalibrating && !isFlow) {
    drawTargetZone(ctx, width, height, distanceOk)
  }

  // ── SHOULDER MODE ──
  if (focusMode === 'shoulder') {
    const leftShoulder = landmarks[11]
    const leftEar = landmarks[7]
    if (!leftShoulder || !leftEar) return
    const sx = leftShoulder.x * width
    const sy = leftShoulder.y * height
    const ex = leftEar.x * width
    const ey = leftEar.y * height

    if (masterPrint && !isCalibrating) {
      if (isFlow) {
        // Flow: anchor on right canvas edge = left screen edge (CSS mirror)
        const flowX = width - 50
        const coreR = 14 + Math.sin(now / 600) * 1
        drawSapphireAnchor(ctx, flowX, height / 2, coreR, now, flowStreak)
        drawReturnGlow(ctx, flowX, height / 2, coreR, returnGlowTimer, true)
      } else {
        // Analyse: anchor at shoulder + ear-shoulder connector
        const pulseR = 14 + Math.sin(now / 400) * 2
        drawSapphireAnchor(ctx, sx, sy, pulseR, now)
        drawReturnGlow(ctx, sx, sy, pulseR, returnGlowTimer, true)

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
    } else if (!isCalibrating && !isFlow) {
      // Pre-calibration preview
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
    const elbow = landmarks[13]
    const wrist = landmarks[15]
    const index = landmarks[19]
    if (!elbow || !wrist || !index) return
    const ex = elbow.x * width, ey = elbow.y * height
    const wx = wrist.x * width, wy = wrist.y * height
    const ix = index.x * width, iy = index.y * height

    if (masterPrint && !isCalibrating) {
      // Use filtered coordinates for smooth rendering (fallback to raw)
      const fc = state.filteredWristCoords
      const fex = fc?.ex ?? ex, fey = fc?.ey ?? ey
      const fwx = fc?.wx ?? wx, fwy = fc?.wy ?? wy
      const fix = fc?.ix ?? ix, fiy = fc?.iy ?? iy

      // Reparatur-Glow-Flash-Logik: Flash-Boost bei Statuswechsel auf "repariert", Decay in 350ms
      if (!lastWristRepaired && state.wristRepairStatus?.repaired) {
        wristGlowLevel = 1.0
        wristGlowDecay = performance.now()
      }
      // Decay
      if (wristGlowLevel > 0) {
        const elapsed = performance.now() - wristGlowDecay
        wristGlowLevel = Math.max(0, 1 - elapsed / 350)
      }
      lastWristRepaired = state.wristRepairStatus?.repaired ?? false

      if (!isFlow) {
        const repairStatus = {
          repaired: true,
          inDeadzone: true,
          timeInZone: 0,
          ...(state.wristRepairStatus ?? {})
        }
        drawWristLines(
          ctx, fex, fey, fwx, fwy, fix, fiy,
          tensionScore,
          lastBendForward,
          rawDeviation * 30,
          repairStatus,
          wristGlowLevel,
          masterPrint?.mode === 'wrist' ? masterPrint.wristAngle : undefined,
        )

        // ── Side-View synchronisiert ──
        drawWristSideView(
          ctx, width, height,
          tensionScore,
          rawDeviation * 30,
          lastBendForward,
          now,
          repairStatus,
          wristGlowLevel
        )
      }

      // Anchor + glow in both modes (positioned at wrist in analyse, centered in flow)
      if (isFlow) {
        const flowX = width - 50
        const coreR = 13 + Math.sin(now / 600) * 1
        drawSapphireAnchor(ctx, flowX, height / 2, coreR, now, flowStreak)
        drawReturnGlow(ctx, flowX, height / 2, coreR, returnGlowTimer, false)
      } else {
        const coreR = 11 + Math.sin(now / 600) * 1
        drawSapphireAnchor(ctx, fwx, fwy, coreR, now)
        drawReturnGlow(ctx, fwx, fwy, coreR, returnGlowTimer, false)
      }

      // Foreshortening confidence warning (below side-view — right of canvas = left of screen)
      const foreConf = state.wristForeshorteningConfidence
      if (foreConf < 0.9) {
        const warnY = height / 2 + height * 0.18
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = foreConf < 0.5 ? '#FF9800' : '#ffffff'
        ctx.globalAlpha = 0.4 + (1 - foreConf) * 0.4
        ctx.fillText(foreConf < 0.5 ? '⚠ Kamera seitlich' : '◉', width - 50, warnY)
        ctx.globalAlpha = 1
      }
    } else if (!isCalibrating && !isFlow) {
      // Preview (analyse only)
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
      const calibY = masterPrint.calibWristY * height
      const coreR = 14 + Math.sin(now / 600) * 1.5
      const inDeadzone = tensionScore <= 10

      // Sapphire anchor moves with wrist (sits on the hand)
      drawSapphireAnchor(ctx, wx, wy, coreR, now, inDeadzone ? flowStreak + 2 : 0)
      drawReturnGlow(ctx, wx, wy, coreR, returnGlowTimer, true)

      // Yellow band from wrist to correct Y height (same X, calibrated Y)
      if (!inDeadzone) {
        drawGoldenBand(ctx, wx, wy, wx, calibY, tensionScore, now, driftDirection)
      }
    } else if (!isCalibrating && !isFlow) {
      // Pre-calibration preview
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

  // ── Mode indicator (bottom-left) ──
  if (masterPrint && !isCalibrating) {
    const label = isFlow ? 'Flow' : 'Analyse'
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.35
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(label, 12, height - 12)
    ctx.globalAlpha = 1
    ctx.textBaseline = 'alphabetic'
  }
}
