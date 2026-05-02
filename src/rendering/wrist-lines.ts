/**
 * Render wrist rail ("Schiene"): always-visible forearm extension + hand segment.
 * On deviation, hand segment turns yellow/dashed and a perpendicular indicator appears.
 * Anchor is drawn separately by sapphire-anchor module.
 */
export function drawWristLines(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number,       // wrist (anchor position, filtered pixels)
  mx: number, my: number,       // MCP (hand endpoint, filtered pixels)
  ex: number, ey: number,       // elbow (filtered pixels)
  angleDiff: number,             // degrees deviation (2D collinearity)
  railDir: { x: number; y: number } | null,  // smoothed forearm direction (normalized)
  railSuccessGlow: number,       // golden flash intensity (0..1)
  wristGlowLevel?: number,
) {
  const DEADZONE_DEG = 10
  const MIN_LINE_LEN = 60

  // ── Compute rail direction ──
  // Use smoothed rail direction if available, else derive from elbow→wrist
  let dirX: number, dirY: number
  if (railDir) {
    dirX = railDir.x
    dirY = railDir.y
  } else {
    const adx = wx - ex
    const ady = wy - ey
    const adm = Math.sqrt(adx * adx + ady * ady)
    if (adm > 0) {
      dirX = adx / adm
      dirY = ady / adm
    } else {
      dirX = 0
      dirY = -1
    }
  }

  // Forearm length in pixels (for proportional extension)
  const armLen = Math.sqrt((wx - ex) * (wx - ex) + (wy - ey) * (wy - ey))
  const extensionLen = Math.max(armLen * 0.5, 30)

  // Hand segment length (wrist → MCP distance, with minimum)
  const hdx = mx - wx
  const hdy = my - wy
  const handDist = Math.sqrt(hdx * hdx + hdy * hdy)
  const handLen = Math.max(handDist, MIN_LINE_LEN)

  // ── 1. Forearm extension line (grey, always visible) ──
  // Extends backward from wrist along the arm direction
  const extEndX = wx - dirX * extensionLen
  const extEndY = wy - dirY * extensionLen

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(extEndX, extEndY)
  ctx.strokeStyle = '#8899aa'
  ctx.lineWidth = 2.5
  ctx.globalAlpha = 0.3
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  const inDeadzone = angleDiff <= DEADZONE_DEG

  // ── 2. Hand segment ──
  if (inDeadzone) {
    // CORRECT: solid blue line from wrist along rail direction
    const railEndX = wx + dirX * handLen
    const railEndY = wy + dirY * handLen

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(railEndX, railEndY)
    ctx.strokeStyle = '#5b9bd5'
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    // Return glow on the hand line
    if (wristGlowLevel && wristGlowLevel > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(wx, wy)
      ctx.lineTo(railEndX, railEndY)
      ctx.strokeStyle = '#5b9bd5'
      ctx.shadowColor = '#5b9bd5'
      ctx.shadowBlur = 18 + 24 * wristGlowLevel
      ctx.lineWidth = 6 + 10 * wristGlowLevel
      ctx.globalAlpha = 0.2 + 0.3 * wristGlowLevel
      ctx.stroke()
      ctx.restore()
    }
  } else {
    // DEVIATION: rail ghost line (where hand should be) + yellow break line (where hand is)
    const railEndX = wx + dirX * handLen
    const railEndY = wy + dirY * handLen

    // Ghost rail line (faint, shows target)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(railEndX, railEndY)
    ctx.strokeStyle = '#8899aa'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.2
    ctx.lineCap = 'round'
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Yellow break line from wrist to actual MCP position
    const intensity = Math.min(1, (angleDiff - DEADZONE_DEG) / 20)
    const lineWidth = 4 + intensity * 6
    const alpha = 0.6 + intensity * 0.3

    // Direction to actual MCP, with minimum length
    let bx = mx - wx
    let by = my - wy
    const bd = Math.sqrt(bx * bx + by * by)
    if (bd > 0) {
      const bl = Math.max(bd, MIN_LINE_LEN)
      bx = (bx / bd) * bl
      by = (by / bd) * bl
    } else {
      bx = dirX * MIN_LINE_LEN
      by = dirY * MIN_LINE_LEN
    }
    const breakEndX = wx + bx
    const breakEndY = wy + by

    ctx.save()
    ctx.setLineDash([10, 6])
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(breakEndX, breakEndY)
    ctx.strokeStyle = '#F5C842'
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = alpha
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Endpoint dot
    ctx.beginPath()
    ctx.arc(breakEndX, breakEndY, 3 + intensity * 2, 0, Math.PI * 2)
    ctx.fillStyle = '#F5C842'
    ctx.globalAlpha = alpha * 0.8
    ctx.fill()
    ctx.globalAlpha = 1

    // ── 3. Perpendicular indicator: MCP → nearest point on rail axis ──
    // Project MCP onto rail line: foot = wrist + clamp(dot(MCP-wrist, dir), 0, handLen) * dir
    const pmx = mx - wx
    const pmy = my - wy
    const proj = pmx * dirX + pmy * dirY
    const clampedProj = Math.max(0, Math.min(handLen, proj))
    const footX = wx + dirX * clampedProj
    const footY = wy + dirY * clampedProj

    const perpDist = Math.sqrt((mx - footX) * (mx - footX) + (my - footY) * (my - footY))
    if (perpDist > 5) {
      ctx.save()
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(footX, footY)
      ctx.strokeStyle = '#F5C842'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.35
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  // ── 4. Golden flash on 5s challenge success ──
  if (railSuccessGlow > 0) {
    // Golden glow on the hand line
    const railEndX = wx + dirX * handLen
    const railEndY = wy + dirY * handLen
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(railEndX, railEndY)
    ctx.strokeStyle = '#FFD700'
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 20 + 30 * railSuccessGlow
    ctx.lineWidth = 6 + 12 * railSuccessGlow
    ctx.globalAlpha = 0.3 * railSuccessGlow
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }
}
