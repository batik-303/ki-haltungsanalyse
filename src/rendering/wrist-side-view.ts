// ─────────────────────────────────────────────────────────────
//  PERIPHERE LEISTE (Wrist-Modus, #76/#94) — Variante D
// ─────────────────────────────────────────────────────────────
//  Eine senkrechte Leiste am linken Bildschirmrand, auf Laptop und Handy:
//   • unten der Arm — fest, gerade, immer blau (gemessen wird nur das Handgelenk)
//   • in der Mitte der Anker = Gelenk
//   • oben die Hand (≈ 1/3 der Länge), die am Anker kippt
//  Blau → Hand gerade. Gelb → nur Anker + Hand gelb, Hand kippt zur Seite des
//  Knicks. Grau (keine sichere Sicht, #88) → Anker + Hand grau, Hand gerade.
//  Korrektur → nur der Anker leuchtet einmal. Keine Gradzahl.
//
//  Kippwinkel, ruhige Richtung und Belohnung rechnet der Core
//  (`createWristBarTilt`); hier wird nur gezeichnet. Der Zustand lebt
//  modul-weit (visuelle Kontinuität zwischen Frames).
// ─────────────────────────────────────────────────────────────

import type { KnickSide } from '../core/types'
import type { AnchorColor } from '../core/analysis/anchor-color'
import { createWristBarTilt } from '../core/analysis/wrist-bar'

const bar = createWristBarTilt()

/** Leisten-Zustand zurücksetzen — bei Kalibrier-Wechsel aufrufen. */
export function resetWristSideViewSmoothing() {
  bar.reset()
}

// ─── Maße ─────────────────────────────────────────────────────
const BAR_HEIGHT_FRACTION = 0.5     // Gesamtlänge ≈ 50 % der Bildhöhe
const HAND_FRACTION = 0.36          // Anteil der Hand an der Gesamtlänge
const TILT_MAX_DEG = 40             // Platz für den Knick nach beiden Seiten
const ARM_WIDTH_CSS = 16            // kräftig, Referenz Handy (CSS-Pixel) …
const ARM_WIDTH_REF_LEN_CSS = 350   // … bei dieser Leistenlänge; Laptop wächst mit
const ARM_WIDTH_MAX_CSS = 24
const EDGE_MARGIN_CSS = 18          // Abstand zum Bildschirmrand

// ─── Farben ───────────────────────────────────────────────────
const BLUE = '#2196F3'
const BLUE_GLOW = '100, 181, 246'   // #64B5F6 als RGB für den Belohnungs-Hof
/** Gelb der Leiste — dasselbe Amber wie der Anker im Bild (#88). */
const WRIST_YELLOW = '#FFB800'
/** Grau: Kamera sieht das Handgelenk nicht sicher (#88). */
const WRIST_GREY = '#9E9E9E'
const HAND_COLORS: Record<AnchorColor, string> = { blue: BLUE, yellow: WRIST_YELLOW, grey: WRIST_GREY }

/**
 * Canvas-Pixel pro CSS-Pixel. Das Canvas hat Videogröße und wird per
 * `object-contain` eingepasst — die Linienstärke soll in CSS-Pixeln stimmen.
 */
function canvasPxPerCssPx(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const { clientWidth, clientHeight } = ctx.canvas
  if (!clientWidth || !clientHeight) return 1
  const cssPerCanvas = Math.min(clientWidth / width, clientHeight / height)
  return cssPerCanvas > 0 ? 1 / cssPerCanvas : 1
}

/**
 * Periphere Leiste zeichnen. Auf dem RECHTEN Canvas-Rand → erscheint durch
 * den CSS-Spiegel am LINKEN Bildschirmrand.
 */
export function drawWristSideView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  color: AnchorColor,
  knickDiff: number,
  knickSide: KnickSide,
) {
  const { tiltDeg, anchorGlow } = bar.update({ color, knickDiff, knickSide, nowMs: now })

  // ─── Geometrie ───
  const px = canvasPxPerCssPx(ctx, width, height)
  const total = height * BAR_HEIGHT_FRACTION
  const handLen = total * HAND_FRACTION
  const armWidthCss = Math.min(ARM_WIDTH_MAX_CSS, Math.max(ARM_WIDTH_CSS, (total / px) * (ARM_WIDTH_CSS / ARM_WIDTH_REF_LEN_CSS)))
  const armW = armWidthCss * px
  const handW = armW * 0.8
  const room = handLen * Math.sin((TILT_MAX_DEG * Math.PI) / 180) + handW / 2 + EDGE_MARGIN_CSS * px
  const cx = width - room
  const top = (height - total) / 2
  const ay = top + handLen             // Anker = Gelenk zwischen Hand und Arm
  const bottom = top + total

  // Kippen: negativ = links auf dem Bildschirm = +x auf dem gespiegelten Canvas.
  const tilt = (tiltDeg * Math.PI) / 180
  const hx = cx - Math.sin(tilt) * handLen
  const hy = ay - Math.cos(tilt) * handLen
  const handColor = HAND_COLORS[color]

  ctx.save()
  ctx.lineCap = 'round'

  const arm = () => { ctx.beginPath(); ctx.moveTo(cx, bottom); ctx.lineTo(cx, ay) }
  const hand = () => { ctx.beginPath(); ctx.moveTo(cx, ay); ctx.lineTo(hx, hy) }

  // ─── weiches Leuchten hinter den Linien ───
  const halo = (color: string, path: () => void) => {
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 20 * px
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.3
    ctx.lineWidth = armW * 2.6
    path()
    ctx.stroke()
    ctx.restore()
  }
  halo(BLUE, arm)
  halo(handColor, hand)

  // ─── klare Linien: Arm immer blau, Hand in der Zustandsfarbe ───
  ctx.strokeStyle = BLUE
  ctx.lineWidth = armW
  arm()
  ctx.stroke()
  ctx.strokeStyle = handColor
  ctx.lineWidth = handW
  hand()
  ctx.stroke()

  // ─── Belohnung: heller Hof nur am Anker, einmal ───
  if (anchorGlow > 0) {
    const r = armW * 5
    const grd = ctx.createRadialGradient(cx, ay, 0, cx, ay, r)
    grd.addColorStop(0, `rgba(${BLUE_GLOW}, ${0.8 * anchorGlow})`)
    grd.addColorStop(1, `rgba(${BLUE_GLOW}, 0)`)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(cx, ay, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // ─── Anker = Gelenk (wächst mit der Linienstärke) ───
  ctx.fillStyle = handColor
  ctx.shadowColor = handColor
  ctx.shadowBlur = (18 + anchorGlow * 30) * px
  ctx.beginPath()
  ctx.arc(cx, ay, armW * 1.4 + (2 + anchorGlow * 4) * px, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.arc(cx, ay, armW * 0.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
