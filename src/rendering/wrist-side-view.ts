/**
 * Render simplified peripheral side-view of wrist.
 * Layout: Hand line (top) → Sapphire Anchor (center) → Arm line (bottom).
 * Drawn on LEFT side of canvas → appears on RIGHT of screen (CSS mirror).
 * Placed opposite to the hand silhouette — no occlusion.
 *
 * Uses the same isBlue deadzone as the main overlay (sticky-blue hysteresis).
 * No module-level smoothing — angle is already EMA-smoothed in the hook.
 */
export function drawWristSideView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _tensionScore: number,
  angleDiff: number,
  lastBendForward: boolean,
  now: number,
  wristRepairStatus?: { repaired: boolean },
  wristGlowLevel?: number,
  railSuccessGlow?: number,
  isBlue?: boolean,
) {
  // Use the same deadzone as main overlay (sticky-blue hysteresis) — no fallback
  const inDeadzone = isBlue ?? (angleDiff <= 10)
  // Use angleDiff directly — already EMA-smoothed by the analysis hook
  const effectiveAngle = angleDiff > 5 ? angleDiff : 0

  // Scale to screen height — figure uses ~22% on desktop, ~28% on mobile
  const isMobile = width < 480
  const totalLenRatio = isMobile ? 0.22 : 0.28
  const totalLen = height * totalLenRatio
  const armLen = totalLen * 0.7
  const handLen = totalLen * 0.3

  // LEFT canvas edge → RIGHT screen edge after CSS mirror (away from hand)
  const marginX = isMobile ? Math.max(28, width * 0.08) : 50
  const cx = marginX
  const cy = height / 2
  const wx = cx
  const wy = cy
  const ax = cx
  const ay = cy + armLen

  const glow = wristGlowLevel ?? 0

  // Breathing cycle (slower, subtler)
  const breath = Math.sin(now / 1200) * 0.5 + 0.5

  // ─── Background pill ───
  const pillW = isMobile ? 48 : 58
  const pillTop = wy - handLen - 24
  const pillBottom = ay + 24
  const pillH = pillBottom - pillTop
  const pillGrad = ctx.createLinearGradient(cx, pillTop, cx, pillBottom)
  pillGrad.addColorStop(0, 'rgba(10, 10, 30, 0.35)')
  pillGrad.addColorStop(0.4, 'rgba(10, 10, 30, 0.55)')
  pillGrad.addColorStop(1, 'rgba(10, 10, 30, 0.3)')
  ctx.beginPath()
  ctx.roundRect(cx - pillW / 2, pillTop, pillW, pillH, 18)
  ctx.fillStyle = pillGrad
  ctx.fill()

  // ─── Arm line (vertical, downward) ───
  const armGrad = ctx.createLinearGradient(wx, wy, ax, ay)
  armGrad.addColorStop(0, '#5b9bd5')
  armGrad.addColorStop(1, '#3a6d99')
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(ax, ay)
  ctx.strokeStyle = armGrad
  ctx.lineWidth = 9
  ctx.globalAlpha = 0.7 + breath * 0.1
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1

  // ─── Hand line (angled by deviation) ───
  // Direction: lastBendForward=true → bend to RIGHT on canvas (= LEFT on screen after CSS mirror)
  const dirSign = lastBendForward ? 1 : -1
  const amplifiedAngle = Math.min(45, effectiveAngle * 2.5)
  const angleRad = (amplifiedAngle * Math.PI) / 180
  const hx = wx + Math.sin(angleRad) * dirSign * handLen
  const hy = wy - Math.cos(angleRad) * handLen

  // Color gradient: linear blend blue→yellow over angleDiff 3°–10°
  const colorT = Math.min(1, Math.max(0, (angleDiff - 3) / 7))
  const blueR = 91, blueG = 155, blueB = 213  // #5b9bd5
  const yellR = 245, yellG = 200, yellB = 66   // #F5C842
  const blendR = Math.round(blueR + (yellR - blueR) * colorT)
  const blendG = Math.round(blueG + (yellG - blueG) * colorT)
  const blendB = Math.round(blueB + (yellB - blueB) * colorT)
  const handColor = `rgb(${blendR}, ${blendG}, ${blendB})`

  if (!inDeadzone && effectiveAngle > 0) {
    // Deviation hand line with gradient color
    const intensity = Math.min(1, effectiveAngle / 20)
    ctx.save()
    ctx.setLineDash([8, 5])
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(hx, hy)
    ctx.strokeStyle = handColor
    ctx.lineWidth = 5
    ctx.globalAlpha = 0.7 + intensity * 0.3
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Ghost rail line (where hand should be) — subtle straight line
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx, wy - handLen)
    ctx.strokeStyle = '#8899aa'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.2
    ctx.lineCap = 'round'
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Endpoint dot
    ctx.beginPath()
    ctx.arc(hx, hy, 4 + intensity * 2, 0, Math.PI * 2)
    ctx.fillStyle = handColor
    ctx.globalAlpha = 0.7
    ctx.fill()
    ctx.globalAlpha = 1
  } else {
    // Correct position: blue line straight up (always visible as rail)
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx, wy - handLen)
    ctx.strokeStyle = '#5b9bd5'
    ctx.lineWidth = 5
    ctx.globalAlpha = 0.5 + breath * 0.1
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ─── Sapphire anchor (wrist joint) ───
  const pulseR = 10 + Math.sin(now / 800) * 1.2
  // Outer ambient glow
  const ambientGrad = ctx.createRadialGradient(wx, wy, pulseR * 0.5, wx, wy, pulseR * 2.5)
  ambientGrad.addColorStop(0, 'rgba(33, 150, 243, 0.15)')
  ambientGrad.addColorStop(1, 'rgba(33, 150, 243, 0)')
  ctx.beginPath()
  ctx.arc(wx, wy, pulseR * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = ambientGrad
  ctx.fill()
  // Core dot
  const coreGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, pulseR)
  coreGrad.addColorStop(0, '#90CAF9')
  coreGrad.addColorStop(0.4, '#42A5F5')
  coreGrad.addColorStop(0.8, '#1E88E5')
  coreGrad.addColorStop(1, '#1565C0')
  ctx.beginPath()
  ctx.arc(wx, wy, pulseR, 0, Math.PI * 2)
  ctx.fillStyle = coreGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(227, 242, 253, 0.4)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Enhanced anchor glow when returning
  if (glow > 0) {
    ctx.beginPath()
    ctx.arc(wx, wy, pulseR + 8 * glow, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(91, 155, 213, ${0.35 * glow})`
    ctx.fill()
  }

  // Blue flash on correction (matches main anchor)
  const blueGlow = railSuccessGlow ?? 0
  const flashGlow = Math.max(blueGlow, glow)
  if (flashGlow > 0 && inDeadzone) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(wx, wy, pulseR + 15 * flashGlow, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(91, 155, 213, ${0.45 * flashGlow})`
    ctx.shadowColor = '#7ec8f0'
    ctx.shadowBlur = 35 * flashGlow
    ctx.fill()
    ctx.restore()
  }

  // ─── Arm endpoint dot ───
  ctx.beginPath()
  ctx.arc(ax, ay, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = '#5b9bd566'
  ctx.fill()
}

// ─────────────────────────────────────────────────────────────
// MOBILE WRIST BAR
// Horizontal indicator drawn above the bottom HUD on portrait phones.
// Arm segment (left) + Wrist anchor (center) + Hand segment (right, angled on deviation).
// No separate smoothing — uses the already-EMA-smoothed angleDiff from the hook.
// ─────────────────────────────────────────────────────────────

/**
 * Render a horizontal wrist indicator for mobile portrait screens.
 * Draws above the React bottom bar (bottomOffset = HUD height in canvas pixels).
 * Layout: ──── arm ──── ⚓ ──── hand (tilts on deviation) ────
 */
export function drawWristMobileBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDiff: number,
  lastBendForward: boolean,
  now: number,
  isBlue?: boolean,
  wristGlowLevel?: number,
  bottomOffset = 72,  // px from bottom — matches React phone HUD height
) {
  const inDeadzone = isBlue ?? (angleDiff <= 10)
  const effectiveAngle = angleDiff > 5 ? angleDiff : 0

  // Position: centered horizontally, above bottom HUD
  const cx = width / 2
  const cy = height - bottomOffset - 36   // 36px above HUD top edge
  const barW = width * 0.55              // total bar width
  const armLen = barW * 0.42            // arm segment to the left
  const handLen = barW * 0.42           // hand segment to the right

  // ─── Background pill ───
  const pillH = 52
  const pillGrad = ctx.createLinearGradient(cx - barW / 2 - 16, cy, cx + barW / 2 + 16, cy)
  pillGrad.addColorStop(0, 'rgba(10, 10, 30, 0.0)')
  pillGrad.addColorStop(0.15, 'rgba(10, 10, 30, 0.55)')
  pillGrad.addColorStop(0.85, 'rgba(10, 10, 30, 0.55)')
  pillGrad.addColorStop(1, 'rgba(10, 10, 30, 0.0)')
  ctx.beginPath()
  ctx.roundRect(cx - barW / 2 - 16, cy - pillH / 2, barW + 32, pillH, 26)
  ctx.fillStyle = pillGrad
  ctx.fill()

  // ─── Arm segment (horizontal, to the left of anchor) ───
  const armStartX = cx - armLen
  const armGrad = ctx.createLinearGradient(armStartX, cy, cx, cy)
  armGrad.addColorStop(0, '#3a6d9900')
  armGrad.addColorStop(0.3, '#3a6d99')
  armGrad.addColorStop(1, '#5b9bd5')
  ctx.beginPath()
  ctx.moveTo(armStartX, cy)
  ctx.lineTo(cx, cy)
  ctx.strokeStyle = armGrad
  ctx.lineWidth = 8
  ctx.globalAlpha = 0.7
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1

  // ─── Hand segment ───
  // Deviates upward/downward from horizontal based on angleDiff.
  // lastBendForward=true → hand tilts DOWN on canvas (= natural wrist drop direction)
  const dirSign = lastBendForward ? 1 : -1
  const amplifiedAngle = Math.min(50, effectiveAngle * 2.5)
  const angleRad = (amplifiedAngle * Math.PI) / 180
  const handEndX = cx + Math.cos(angleRad) * handLen
  const handEndY = cy + Math.sin(angleRad) * dirSign * handLen

  // Color: blend blue → yellow over 3°–10°
  const colorT = Math.min(1, Math.max(0, (angleDiff - 3) / 7))
  const blueR = 91, blueG = 155, blueB = 213
  const yellR = 245, yellG = 200, yellB = 66
  const handColor = `rgb(${Math.round(blueR + (yellR - blueR) * colorT)}, ${Math.round(blueG + (yellG - blueG) * colorT)}, ${Math.round(blueB + (yellB - blueB) * colorT)})`

  if (!inDeadzone && effectiveAngle > 0) {
    // Ghost rail (straight reference)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + handLen, cy)
    ctx.strokeStyle = '#8899aa'
    ctx.lineWidth = 2.5
    ctx.globalAlpha = 0.2
    ctx.lineCap = 'round'
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Deviation hand line (angled)
    const intensity = Math.min(1, effectiveAngle / 20)
    ctx.save()
    ctx.setLineDash([9, 5])
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(handEndX, handEndY)
    ctx.strokeStyle = handColor
    ctx.lineWidth = 6 + intensity * 3
    ctx.globalAlpha = 0.75 + intensity * 0.2
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Endpoint dot
    ctx.beginPath()
    ctx.arc(handEndX, handEndY, 5 + intensity * 2, 0, Math.PI * 2)
    ctx.fillStyle = handColor
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
  } else {
    // Correct: solid blue hand segment (straight right)
    const glow = wristGlowLevel ?? 0
    if (glow > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + handLen, cy)
      ctx.strokeStyle = '#5b9bd5'
      ctx.shadowColor = '#5b9bd5'
      ctx.shadowBlur = 16 + 24 * glow
      ctx.lineWidth = 8 + 10 * glow
      ctx.globalAlpha = 0.25 + 0.3 * glow
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + handLen, cy)
    ctx.strokeStyle = '#5b9bd5'
    ctx.lineWidth = 8
    ctx.globalAlpha = 0.55
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ─── Anchor dot at wrist joint (center) ───
  const pulseR = 9 + Math.sin(now / 800) * 1
  const ambGrad = ctx.createRadialGradient(cx, cy, pulseR * 0.5, cx, cy, pulseR * 2.5)
  ambGrad.addColorStop(0, 'rgba(33, 150, 243, 0.18)')
  ambGrad.addColorStop(1, 'rgba(33, 150, 243, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, pulseR * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = ambGrad
  ctx.fill()

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR)
  coreGrad.addColorStop(0, '#90CAF9')
  coreGrad.addColorStop(0.4, '#42A5F5')
  coreGrad.addColorStop(0.8, '#1E88E5')
  coreGrad.addColorStop(1, '#1565C0')
  ctx.beginPath()
  ctx.arc(cx, cy, pulseR, 0, Math.PI * 2)
  ctx.fillStyle = coreGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(227, 242, 253, 0.4)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Glow ring on correction reward
  const glow = wristGlowLevel ?? 0
  if (glow > 0 && inDeadzone) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, pulseR + 15 * glow, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(91, 155, 213, ${0.4 * glow})`
    ctx.shadowColor = '#7ec8f0'
    ctx.shadowBlur = 30 * glow
    ctx.fill()
    ctx.restore()
  }
}
