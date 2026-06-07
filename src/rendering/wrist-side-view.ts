// ─────────────────────────────────────────────────────────────
//  WRIST SIDE-VIEW — anatomical line, calm by default
// ─────────────────────────────────────────────────────────────
//  Design intent:
//   • Same anatomical mapping as before (rail · anchor · forearm).
//   • Two states only: calm (in zone, faded) and alert (out of zone, amber).
//   • No breathing, no constant pulse, no ambient halos, no dashes, no
//     mid-stroke gradients. One animation: a 280ms ring "bloom" on entering
//     the deadzone — the reward moment.
//   • Numeric angle readout in Geist Mono; precision over decoration.
//
//  All visual state lives module-level (visual continuity between frames).
//  Analysis precision is preserved upstream — this file only smooths what
//  the eye sees, not what the analyzer measures.
// ─────────────────────────────────────────────────────────────

// Visual smoothers (reset on calibration change).
let sideViewAngleSmoothed = 0
let mobileBarAngleSmoothed = 0
// Cross-state alpha lerp: 1 = alert (out of zone), 0 = calm (in zone).
let sideViewAlertLerp = 0
let mobileBarAlertLerp = 0
// Track previous zone state to fire the entry-into-zone ring exactly once.
let sideViewWasBlue: boolean | null = null
let mobileBarWasBlue: boolean | null = null
// Timestamp of the most recent false→true blue transition.
let sideViewEnterZoneAt = 0
let mobileBarEnterZoneAt = 0

/** Reset module-level smoothing state — call when calibration changes. */
export function resetWristSideViewSmoothing() {
  sideViewAngleSmoothed = 0
  mobileBarAngleSmoothed = 0
  sideViewAlertLerp = 0
  mobileBarAlertLerp = 0
  sideViewWasBlue = null
  mobileBarWasBlue = null
  sideViewEnterZoneAt = 0
  mobileBarEnterZoneAt = 0
}

// ─── tuning constants ────────────────────────────────────────
const ANGLE_SMOOTHING_ALPHA = 0.10        // symmetric EMA on the displayed angle
const ANGLE_VISIBLE_DEG = 3                // below this, line snaps to straight
const ANGLE_AMPLIFY = 1.4                  // makes small deviations legible
const ANGLE_AMPLIFY_CLAMP_DEG = 55         // never tilt past this on screen
const ALERT_FADE_ALPHA = 0.16              // per-frame alpha lerp toward target
const CALM_OPACITY = 0.28                  // overall opacity in zone
const ALERT_OPACITY = 1.0                  // overall opacity out of zone
const ENTRY_RING_MS = 280                  // bloom duration on entering zone
const FONT_FAMILY = '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace'
// Colors
const CALM_INK = '#9cc3e8'                 // soft blue for calm state
const ALERT_INK = '#f1b659'                // warm amber for alert state
const NEUTRAL_INK = '#6c87a3'              // faint forearm/rail in alert state

// ─── helpers ─────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothAngle(prev: number, target: number) {
  return prev + (target - prev) * ANGLE_SMOOTHING_ALPHA
}

function effectiveAngle(smoothed: number) {
  return smoothed > ANGLE_VISIBLE_DEG
    ? Math.min(ANGLE_AMPLIFY_CLAMP_DEG, smoothed * ANGLE_AMPLIFY)
    : 0
}

/**
 * Update zone-transition state, return ring-bloom progress (0..1) for this
 * frame. The ring fires once per false→true transition and decays linearly.
 */
function ringProgress(
  isBlue: boolean,
  wasBlue: boolean | null,
  enterAt: number,
  now: number,
): { progress: number; nextEnterAt: number } {
  let nextEnterAt = enterAt
  if (wasBlue === false && isBlue === true) {
    nextEnterAt = now
  }
  const age = now - nextEnterAt
  const progress = age >= 0 && age < ENTRY_RING_MS ? 1 - age / ENTRY_RING_MS : 0
  return { progress, nextEnterAt }
}

// ─────────────────────────────────────────────────────────────
//  DESKTOP / TABLET — vertical anatomical line on left screen edge
// ─────────────────────────────────────────────────────────────

/**
 * Render the wrist side-view peripheral.
 * Layout: rail (up) · anchor (center) · forearm (down) · numeric angle.
 * Drawn on the RIGHT canvas edge → appears on the LEFT of screen (CSS mirror).
 *
 * The `_*` parameters preserve the legacy call signature from canvas-renderer
 * so this is a drop-in replacement. tensionScore / repairStatus / railSuccessGlow
 * are no longer needed — visual state derives entirely from `angleDiff` and
 * `isBlue`.
 */
export function drawWristSideView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _tensionScore: number,
  angleDiff: number,
  lastBendForward: boolean,
  now: number,
  _wristRepairStatus?: { repaired: boolean },
  _wristGlowLevel?: number,
  _railSuccessGlow?: number,
  isBlue?: boolean,
) {
  const inZone = isBlue ?? (angleDiff <= 10)

  // Smooth the displayed angle and the alert fade.
  sideViewAngleSmoothed = smoothAngle(sideViewAngleSmoothed, angleDiff)
  sideViewAlertLerp = lerp(sideViewAlertLerp, inZone ? 0 : 1, ALERT_FADE_ALPHA)

  const angle = effectiveAngle(sideViewAngleSmoothed)
  const alert = sideViewAlertLerp
  const overallOpacity = lerp(CALM_OPACITY, ALERT_OPACITY, alert)

  // Ring bloom on entering the zone (reward moment, fires once).
  const ring = ringProgress(inZone, sideViewWasBlue, sideViewEnterZoneAt, now)
  sideViewEnterZoneAt = ring.nextEnterAt
  sideViewWasBlue = inZone

  // Geometry — compact and symmetric around vertical centerline.
  const isMobile = width < 480
  const totalLen = height * (isMobile ? 0.22 : 0.26)
  const forearmLen = totalLen * 0.55
  const handLen = totalLen * 0.45
  const marginX = isMobile ? Math.max(28, width * 0.08) : 56
  const cx = width - marginX
  const cy = height / 2

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // ─── rail (where the hand should be — straight up) ────────────────
  // Always present, dims down when alert (it's a reference, not the focus).
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - handLen)
  ctx.strokeStyle = alert > 0.5 ? NEUTRAL_INK : CALM_INK
  ctx.lineWidth = 1
  ctx.globalAlpha = overallOpacity * lerp(1, 0.45, alert)
  ctx.stroke()

  // ─── forearm (down from anchor) ───────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy + forearmLen)
  ctx.strokeStyle = alert > 0.5 ? NEUTRAL_INK : CALM_INK
  ctx.lineWidth = 1.5
  ctx.globalAlpha = overallOpacity * lerp(1, 0.55, alert)
  ctx.stroke()

  // ─── hand line (tilts with deviation) ─────────────────────────────
  // In zone: blends with the rail (both straight). Out of zone: amber, tilted.
  const dirSign = lastBendForward ? 1 : -1
  const angleRad = (angle * Math.PI) / 180
  const hx = cx + Math.sin(angleRad) * dirSign * handLen
  const hy = cy - Math.cos(angleRad) * handLen
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(hx, hy)
  // Color blends from calm-blue toward amber via two-pass blending in HSL
  // would be heavier — direct hex switch reads as crisper for this aesthetic.
  ctx.strokeStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.lineWidth = 2.5
  ctx.globalAlpha = overallOpacity
  ctx.stroke()

  // ─── anchor (small filled circle, no glow) ────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2)
  ctx.fillStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.globalAlpha = overallOpacity * 1.0
  ctx.fill()

  // ─── entry-into-zone ring (single reward animation) ───────────────
  if (ring.progress > 0) {
    const ringR = 6 + (1 - ring.progress) * 14
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = CALM_INK
    ctx.lineWidth = 1.4
    ctx.globalAlpha = ring.progress * 0.7
    ctx.stroke()
  }

  // ─── numeric angle (mirror-compensated, Geist Mono) ───────────────
  // Below the forearm, centered on the column. Text follows the same
  // calm/alert color logic.
  const textY = cy + forearmLen + 18
  const angleInt = Math.round(sideViewAngleSmoothed)
  ctx.font = `500 11px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.globalAlpha = lerp(0.5, 0.95, alert)
  // CSS mirror: reads correctly when drawn with scale(-1, 1).
  ctx.save()
  ctx.translate(cx, textY)
  ctx.scale(-1, 1)
  ctx.fillText(`${angleInt}°`, 0, 0)
  ctx.restore()

  ctx.restore()
}

// ─────────────────────────────────────────────────────────────
//  MOBILE — horizontal anatomical line above the bottom HUD
// ─────────────────────────────────────────────────────────────

/**
 * Render the horizontal wrist indicator for mobile portrait screens.
 * Layout: forearm (left) ── anchor ── hand (right, tilts on deviation).
 * Sits above the React bottom bar at `bottomOffset` px from the bottom edge.
 *
 * Same calm/alert two-state design as the desktop side-view.
 */
export function drawWristMobileBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDiff: number,
  lastBendForward: boolean,
  now: number,
  isBlue?: boolean,
  _wristGlowLevel?: number,
  bottomOffset = 72,
) {
  const inZone = isBlue ?? (angleDiff <= 10)

  mobileBarAngleSmoothed = smoothAngle(mobileBarAngleSmoothed, angleDiff)
  mobileBarAlertLerp = lerp(mobileBarAlertLerp, inZone ? 0 : 1, ALERT_FADE_ALPHA)

  const angle = effectiveAngle(mobileBarAngleSmoothed)
  const alert = mobileBarAlertLerp
  const overallOpacity = lerp(CALM_OPACITY, ALERT_OPACITY, alert)

  const ring = ringProgress(inZone, mobileBarWasBlue, mobileBarEnterZoneAt, now)
  mobileBarEnterZoneAt = ring.nextEnterAt
  mobileBarWasBlue = inZone

  const cx = width / 2
  const cy = height - bottomOffset - 40
  const totalLen = width * 0.5
  const forearmLen = totalLen * 0.5
  const handLen = totalLen * 0.5

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Reference rail (where the hand should be — straight right)
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + handLen, cy)
  ctx.strokeStyle = alert > 0.5 ? NEUTRAL_INK : CALM_INK
  ctx.lineWidth = 1
  ctx.globalAlpha = overallOpacity * lerp(1, 0.45, alert)
  ctx.stroke()

  // Forearm (left of anchor)
  ctx.beginPath()
  ctx.moveTo(cx - forearmLen, cy)
  ctx.lineTo(cx, cy)
  ctx.strokeStyle = alert > 0.5 ? NEUTRAL_INK : CALM_INK
  ctx.lineWidth = 1.5
  ctx.globalAlpha = overallOpacity * lerp(1, 0.55, alert)
  ctx.stroke()

  // Hand line (tilts on deviation)
  const dirSign = lastBendForward ? 1 : -1
  const angleRad = (angle * Math.PI) / 180
  const hx = cx + Math.cos(angleRad) * handLen
  const hy = cy + Math.sin(angleRad) * dirSign * handLen
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(hx, hy)
  ctx.strokeStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.lineWidth = 2.5
  ctx.globalAlpha = overallOpacity
  ctx.stroke()

  // Anchor dot
  ctx.beginPath()
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2)
  ctx.fillStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.globalAlpha = overallOpacity
  ctx.fill()

  // Entry-into-zone ring
  if (ring.progress > 0) {
    const ringR = 6 + (1 - ring.progress) * 14
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = CALM_INK
    ctx.lineWidth = 1.4
    ctx.globalAlpha = ring.progress * 0.7
    ctx.stroke()
  }

  // Numeric angle below the bar
  const textY = cy + 22
  const angleInt = Math.round(mobileBarAngleSmoothed)
  ctx.font = `500 11px ${FONT_FAMILY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = alert > 0.5 ? ALERT_INK : CALM_INK
  ctx.globalAlpha = lerp(0.5, 0.95, alert)
  ctx.save()
  ctx.translate(cx, textY)
  ctx.scale(-1, 1)
  ctx.fillText(`${angleInt}°`, 0, 0)
  ctx.restore()

  ctx.restore()
}
