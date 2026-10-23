// ─────────────────────────────────────────────────────────────
//  PERIPHERE LEISTE (Wrist-Modus, #76/#94) — Variante D
// ─────────────────────────────────────────────────────────────
//  Eine senkrechte Leiste am linken Bildschirmrand, auf Laptop und Handy
//  (Analyse) — bzw. groß in der Mitte (Flow, #99, Maße: `computeFlowRailLayout`):
//   • unten der Arm — fest, gerade, immer blau (gemessen wird nur das Handgelenk)
//   • in der Mitte der Anker = Gelenk
//   • oben die Hand (≈ 1/3 der Länge), die am Anker kippt
//  Blau → Hand gerade. Gelb → nur Anker + Hand gelb, Hand kippt zur Seite des
//  Knicks. Korrektur → nur der Anker leuchtet einmal. Keine Gradzahl.
//
//  Kippwinkel, ruhige Richtung und Belohnung rechnet der Core
//  (`createWristBarTilt`); hier wird nur gezeichnet. Der Zustand lebt
//  modul-weit (visuelle Kontinuität zwischen Frames).
// ─────────────────────────────────────────────────────────────

import type { KnickSide } from '../core/types'
import { createWristBarTilt, TILT_MAX_DEG } from '../core/analysis/wrist-bar'
import { RAIL_ARM_WIDTH_PER_LENGTH, RAIL_HAND_FRACTION, RAIL_HAND_WIDTH_RATIO, type RailLayout } from '../core/analysis/flow-rail-layout'

const bar = createWristBarTilt()

/** Leisten-Zustand zurücksetzen — bei Kalibrier-Wechsel aufrufen. */
export function resetWristSideViewSmoothing() {
  bar.reset()
}

// ─── Maße ─────────────────────────────────────────────────────
const BAR_HEIGHT_FRACTION = 0.5     // Gesamtlänge ≈ 50 % der Bildhöhe
const ARM_WIDTH_CSS = 16            // kräftig, Referenz Handy (CSS-Pixel); Laptop wächst mit
const ARM_WIDTH_MAX_CSS = 24
const EDGE_MARGIN_CSS = 18          // Abstand zum Bildschirmrand

// ─── Farben ───────────────────────────────────────────────────
const BLUE = '#2196F3'
const BLUE_GLOW = '100, 181, 246'   // #64B5F6 als RGB für den Belohnungs-Hof
/** Gelb der Leiste — dasselbe wie der Anker im Bild. */
export const WRIST_YELLOW = '#F5C842'

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
 * Lage der Leiste in der Analyse-Ansicht: am RECHTEN Canvas-Rand → erscheint
 * durch den CSS-Spiegel am LINKEN Bildschirmrand.
 */
function computeSideRailLayout(ctx: CanvasRenderingContext2D, width: number, height: number): RailLayout {
  const px = canvasPxPerCssPx(ctx, width, height)
  const total = height * BAR_HEIGHT_FRACTION
  const handLen = total * RAIL_HAND_FRACTION
  const armWidthCss = Math.min(ARM_WIDTH_MAX_CSS, Math.max(ARM_WIDTH_CSS, (total / px) * RAIL_ARM_WIDTH_PER_LENGTH))
  const armWidth = armWidthCss * px
  const room = handLen * Math.sin((TILT_MAX_DEG * Math.PI) / 180) + (armWidth * RAIL_HAND_WIDTH_RATIO) / 2 + EDGE_MARGIN_CSS * px
  const top = (height - total) / 2
  return { cx: width - room, top, bottom: top + total, armWidth, px }
}

/**
 * Periphere Leiste zeichnen. Ohne `layout` am Rand (Analyse-Ansicht), mit
 * `layout` an der vorgegebenen Stelle (Flow-Ansicht).
 */
export function drawWristSideView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  isBlue: boolean,
  knickDiff: number,
  knickSide: KnickSide,
  layout?: RailLayout,
) {
  const { tiltDeg, anchorGlow } = bar.update({ isBlue, knickDiff, knickSide, nowMs: now })

  // ─── Geometrie ───
  const { cx, top, bottom, armWidth: armW, px } = layout ?? computeSideRailLayout(ctx, width, height)
  const handLen = (bottom - top) * RAIL_HAND_FRACTION
  const handW = armW * RAIL_HAND_WIDTH_RATIO
  const ay = top + handLen             // Anker = Gelenk zwischen Hand und Arm

  // Kippen: negativ = links auf dem Bildschirm = +x auf dem gespiegelten Canvas.
  const tilt = (tiltDeg * Math.PI) / 180
  const hx = cx - Math.sin(tilt) * handLen
  const hy = ay - Math.cos(tilt) * handLen
  const handColor = isBlue ? BLUE : WRIST_YELLOW

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
