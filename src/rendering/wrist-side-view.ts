import { getTensionColor, lerpColor } from './colors'

// Smooth tension for color transitions — prevents color flicker
let visualTension = 0
// Glow Hysterese
// (Legacy, wird jetzt synchronisiert)
// let glowActive = false

/**
 * Render a polished schematic side-view of the wrist.
 * Layout: Hand (line, top) → Anchor (wrist, middle) → Arm (line, bottom).
 * Drawn on RIGHT side of canvas → appears on LEFT of screen (CSS scale-x-[-1]).
 *
 * Both directions look identical to the user — the technical difference
 * (heavier damping for forward/z-axis) is invisible in the output.
 */

// Modular: Handlinie (knickend, farbig, erweiterbar)
function drawAngledHandLine(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  angleRad: number,
  handLen: number,
  handWidth: number,
  baseBlue: string,
  tipColor: string,
) {
  const hx = wx + Math.sin(angleRad) * handLen
  const hy = wy - Math.cos(angleRad) * handLen
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(hx, hy)
  const handGrad = ctx.createLinearGradient(wx, wy, hx, hy)
  handGrad.addColorStop(0, baseBlue)
  handGrad.addColorStop(1, tipColor)
  ctx.strokeStyle = handGrad
  ctx.lineWidth = handWidth
  ctx.globalAlpha = 0.85
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}

// Modular: Status-Logik für Deadzone, Glow, Farben
function getSideViewStatus(tensionScore: number, wristRepairStatus?: { repaired: boolean }, wristGlowLevel?: number) {
  const inDeadzone = wristRepairStatus?.repaired ?? true
  const glow = wristGlowLevel ?? 0
  return { inDeadzone, glow }
}

function getSideViewColors(tension: number, inDeadzone: boolean) {
  const baseBlue = '#2196F3'
  const vt = tension
  const lineColor = inDeadzone ? baseBlue : (vt < 12 ? baseBlue : getTensionColor(vt))
  const tipColor = inDeadzone ? '#64B5F6' : (vt < 12 ? '#64B5F6' : lerpColor(baseBlue, getTensionColor(vt), 0.7))
  return { baseBlue, lineColor, tipColor }
}

/**
 * Zeichnet die Seitenansicht des Handgelenks mit knickender Handlinie.
 * @param ctx Canvas-Kontext
 * @param width Canvas-Breite
 * @param height Canvas-Höhe
 * @param tensionScore Tensionswert
 * @param angleDiff Winkelabweichung (in Grad, 0 = perfekt gestreckt)
 * @param lastBendForward Richtung (optional, für spätere Features)
 * @param now Zeitstempel
 */
/**
 * Zeichnet die Seitenansicht des Handgelenks mit knickender Handlinie und synchronisiertem Glow.
 * @param ctx Canvas-Kontext
 * @param width Canvas-Breite
 * @param height Canvas-Höhe
 * @param tensionScore Tensionswert
 * @param angleDiff Winkelabweichung (in Grad, 0 = perfekt gestreckt)
 * @param lastBendForward Richtung (optional, für spätere Features)
 * @param now Zeitstempel
 * @param wristRepairStatus Statusobjekt aus Analyse (z.B. { repaired: boolean, ... })
 * @param wristGlowLevel Glow-Intensität (0..1)
 */
export function drawWristSideView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tensionScore: number,
  angleDiff: number, // in Grad, 0 = gestreckt
  lastBendForward: boolean, // für spätere Features
  now: number,
  wristRepairStatus?: { repaired: boolean },
  wristGlowLevel?: number,
) {
  // Smooth tension for color — prevents abrupt color jumps
  const tensionLerp = tensionScore > visualTension ? 0.06 : 0.18
  visualTension += (tensionScore - visualTension) * tensionLerp
  if (visualTension < 0.5) visualTension = 0

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

  // Status und Farben modular beziehen
  const { inDeadzone, glow } = getSideViewStatus(tensionScore, wristRepairStatus, wristGlowLevel)
  const { baseBlue, lineColor, tipColor } = getSideViewColors(visualTension, inDeadzone)

  // Breathing cycle — subtle shared pulse across the whole figure
  const breath = Math.sin(now / 1200) * 0.5 + 0.5  // 0..1, ~0.8s period

  // ─── Background pill with soft gradient ───
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

  // Subtle border glow on pill when tension rises
  const vt = visualTension
  if (vt > 20) {
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1
    ctx.globalAlpha = (vt / 100) * 0.12
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ─── Reference line (ideal hand position) ───
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(wx, wy - handLen)
  ctx.strokeStyle = baseBlue
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.15 + breath * 0.05
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.setLineDash([])

  // ─── Arm line (vertical, downward) with gradient ───
  const armGrad = ctx.createLinearGradient(wx, wy, ax, ay)
  armGrad.addColorStop(0, '#5b9bd5')
  armGrad.addColorStop(1, '#3a6d99')
  ctx.beginPath()
  ctx.moveTo(wx, wy)
  ctx.lineTo(ax, ay)
  ctx.strokeStyle = armGrad
  ctx.lineWidth = 7
  ctx.globalAlpha = 0.7 + breath * 0.1
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1


  // Handlinie folgt Handgelenkswinkel (knickend)
  // Umrechnung: 0° = gestreckt (nach oben), positiver Winkel = nach rechts (aus Sicht des Musikers)
  const handWidth = 6 // Optional: anpassbar für spätere Features
  const angleRad = (angleDiff * Math.PI) / 180
  drawAngledHandLine(ctx, wx, wy, angleRad, handLen, handWidth, baseBlue, tipColor)

  // ─── Synchronisierter Glow bei Reparatur ───
  if (glow > 0 && inDeadzone) {
    ctx.save()
    ctx.globalAlpha = 0.18 * glow
    ctx.beginPath()
    ctx.moveTo(wx, wy)
    ctx.lineTo(wx + Math.sin(angleRad) * handLen, wy - Math.cos(angleRad) * handLen)
    ctx.strokeStyle = '#fffde4'
    ctx.shadowColor = '#fffde4'
    ctx.shadowBlur = 18 + 18 * glow
    ctx.lineWidth = handWidth + 7 * glow
    ctx.stroke()
    ctx.restore()
  }

  // ─── Soft glow aura um die waagerechte Handlinie (Erweiterbar) ───
  // (Aktuell deaktiviert, da Linie immer waagerecht ist. Für spätere Features wie Belohnungs-Glow.)

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

  // ─── Endpoint accents ───
  // Arm end: soft blue dot
  ctx.beginPath()
  ctx.arc(ax, ay, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = '#5b9bd566'
  ctx.fill()
  // Hand end: (Erweiterbar für Glow/Belohnung)
  // (Optional: Glow oder Akzent am Hand-Endpunkt)
}
