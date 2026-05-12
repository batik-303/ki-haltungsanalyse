// Smooth visual angle for side-view (asymmetric IIR: slow rise, fast fall)
let visualAngle = 0

/**
 * Render simplified peripheral side-view of wrist.
 * Layout: Hand line (top) → Sapphire Anchor (center) → Arm line (bottom).
 * Drawn on RIGHT side of canvas → appears on LEFT of screen (CSS mirror).
 *
 * Shows same elements as main overlay: anchor, hand line, yellow on deviation.
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
  const inDeadzone = isBlue ?? (angleDiff <= 10)

  // Asymmetric smoothing: slow rise (dampens jitter), fast fall (rewards return)
  const targetAngle = angleDiff > 5 ? angleDiff : 0
  const lerpRate = targetAngle > visualAngle ? 0.12 : 0.35
  visualAngle += (targetAngle - visualAngle) * lerpRate
  if (visualAngle < 0.3) visualAngle = 0

  // Scale to screen height — total figure ~30% of canvas
  const totalLen = height * 0.3
  const armLen = totalLen * 0.75
  const handLen = totalLen * 0.25

  // Right canvas edge → left screen edge after CSS mirror
  const cx = width - 50
  const cy = height / 2
  const wx = cx
  const wy = cy
  const ax = cx
  const ay = cy + armLen

  const glow = wristGlowLevel ?? 0

  // Breathing cycle
  const breath = Math.sin(now / 1200) * 0.5 + 0.5

  // ─── Background pill ───
  const pillW = 58
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
  // Direction: lastBendForward=true → bend to LEFT on canvas (= RIGHT on screen after CSS mirror)
  // This matches the user's visual: hand bending inward shows line going same direction
  const dirSign = lastBendForward ? -1 : 1
  const amplifiedAngle = Math.min(45, visualAngle * 2.5)
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

  if (!inDeadzone && visualAngle > 0) {
    // Deviation hand line with gradient color
    const intensity = Math.min(1, visualAngle / 20)
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

  // ─── Synchronized glow on return ───
  if (glow > 0 && inDeadzone) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx, wy - handLen)
    ctx.strokeStyle = '#5b9bd5'
    ctx.shadowColor = '#5b9bd5'
    ctx.shadowBlur = 16 + 20 * glow
    ctx.lineWidth = 5 + 8 * glow
    ctx.globalAlpha = 0.2 + 0.3 * glow
    ctx.stroke()
    ctx.restore()
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
    ctx.arc(wx, wy, pulseR + 4 * glow, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(33, 150, 243, ${0.2 * glow})`
    ctx.fill()
  }

  // Golden flash on milestone/repair success
  const goldGlow = railSuccessGlow ?? 0
  if (goldGlow > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(wx, wy, pulseR + 20 * goldGlow, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 215, 0, ${0.35 * goldGlow})`
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 25 * goldGlow
    ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.arc(wx, wy, pulseR + 3, 0, Math.PI * 2)
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 2 * goldGlow
    ctx.globalAlpha = 0.5 * goldGlow
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ─── Arm endpoint dot ───
  ctx.beginPath()
  ctx.arc(ax, ay, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = '#5b9bd566'
  ctx.fill()
}
