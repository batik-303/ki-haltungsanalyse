import { describe, it, expect } from 'vitest'
import {
  computeFlowRailLayout,
  RAIL_ARM_WIDTH_PER_LENGTH,
  RAIL_HAND_FRACTION,
  RAIL_HAND_WIDTH_RATIO,
  RAIL_HALO_WIDTH_RATIO,
} from '../../src/core/analysis/flow-rail-layout'
import { TILT_MAX_DEG } from '../../src/core/analysis/wrist-bar'
import { selectIsFlowRail } from '../../src/store/selectors'
import type { PoseState } from '../../src/store/pose-store'

// Flow-Ansicht (#77/#99, #114): nur die periphere Leiste, mittig. Das Canvas
// hat Videogröße und füllt im Flow den Bereich ÜBER der Knopf-Zeile
// (object-cover) — die Knöpfe liegen also nie im Canvas. Die Leiste nimmt
// höchstens ≈ 60 % der Bildschirmhöhe ein (Entscheidung 3 aus #104).
// Handy-Test 28.10.: am Handy war die Leiste so zu dünn und zu klein — dort
// darf sie bis ≈ 72 % reichen und ist etwas dicker. Laptop/Tablet bleiben.

// Sichtbarer Bereich des Canvas in CSS-Pixeln (object-cover, zentriert).
function toCss(
  layout: ReturnType<typeof computeFlowRailLayout>,
  canvasWidth: number,
  canvasHeight: number,
  viewWidth: number,
  viewHeight: number,
) {
  const s = Math.max(viewWidth / canvasWidth, viewHeight / canvasHeight)
  const offY = (viewHeight - canvasHeight * s) / 2
  const offX = (viewWidth - canvasWidth * s) / 2
  return {
    cx: layout.cx * s + offX,
    top: layout.top * s + offY,
    bottom: layout.bottom * s + offY,
    armWidth: layout.armWidth * s,
  }
}

// Bildschirm und Bereich über der Knopf-Zeile (Kopfzeile ist im Flow aus).
const PHONE = { viewWidth: 390, viewHeight: 744, screenHeight: 844 }
const LAPTOP = { viewWidth: 1440, viewHeight: 800, screenHeight: 900 }
const TABLET = { viewWidth: 820, viewHeight: 1080, screenHeight: 1180 }
const TABLET_LANDSCAPE = { viewWidth: 1180, viewHeight: 720, screenHeight: 820 }
const tiltReach = Math.sin((TILT_MAX_DEG * Math.PI) / 180)

const state = (over: Partial<PoseState>): PoseState =>
  ({ focusMode: 'wrist', viewMode: 'analyse', ...over }) as unknown as PoseState

describe('selectIsFlowRail', () => {
  it('gilt nur im Wrist-Modus in der Flow-Ansicht', () => {
    expect(selectIsFlowRail(state({ focusMode: 'wrist', viewMode: 'flow' }))).toBe(true)
    expect(selectIsFlowRail(state({ focusMode: 'wrist', viewMode: 'analyse' }))).toBe(false)
    expect(selectIsFlowRail(state({ focusMode: 'shoulder', viewMode: 'flow' }))).toBe(false)
    expect(selectIsFlowRail(state({ focusMode: 'violin', viewMode: 'flow' }))).toBe(false)
  })
})

describe('computeFlowRailLayout', () => {
  const cases = [
    { name: 'Handy hochkant, Hochformat-Video', canvasWidth: 480, canvasHeight: 640, ...PHONE },
    { name: 'Handy hochkant, Querformat-Video', canvasWidth: 640, canvasHeight: 480, ...PHONE },
    { name: 'Laptop, Querformat-Video', canvasWidth: 640, canvasHeight: 480, ...LAPTOP },
    { name: 'Tablet hochkant, Querformat-Video', canvasWidth: 640, canvasHeight: 480, ...TABLET },
    { name: 'Tablet quer, Querformat-Video', canvasWidth: 640, canvasHeight: 480, ...TABLET_LANDSCAPE },
  ]

  for (const c of cases) {
    describe(c.name, () => {
      const layout = computeFlowRailLayout(c)
      const css = toCss(layout, c.canvasWidth, c.canvasHeight, c.viewWidth, c.viewHeight)
      const haloHalf = (css.armWidth * RAIL_HALO_WIDTH_RATIO) / 2
      const length = css.bottom - css.top

      it('steht waagerecht in der Mitte', () => {
        expect(css.cx).toBeCloseTo(c.viewWidth / 2, 5)
      })

      it('steht senkrecht mittig über der Knopf-Zeile', () => {
        expect((css.top + css.bottom) / 2).toBeCloseTo(c.viewHeight / 2, 5)
      })

      const isPhone = c.viewWidth < 480
      const maxFraction = isPhone ? 0.72 : 0.6

      it(`nimmt samt Leuchten höchstens ${maxFraction * 100} % der Bildschirmhöhe ein`, () => {
        expect(length + 2 * haloHalf).toBeLessThanOrEqual(c.screenHeight * maxFraction + 1e-6)
      })

      it('bleibt deutlich sichtbar', () => {
        expect(length).toBeGreaterThan(c.screenHeight * (isPhone ? 0.6 : 0.45))
      })

      it('Leuchten hält oben und unten Abstand zum Rand des Bereichs', () => {
        expect(css.top - haloHalf).toBeGreaterThanOrEqual(16 - 1e-6)
        expect(css.bottom + haloHalf).toBeLessThanOrEqual(c.viewHeight - 16 + 1e-6)
      })

      it('Breite wächst mit der Länge (am Handy etwas dicker)', () => {
        expect(css.armWidth).toBeGreaterThan(isPhone ? 28 : 18)
        if (isPhone) expect(css.armWidth).toBeGreaterThan(length * RAIL_ARM_WIDTH_PER_LENGTH)
        else expect(css.armWidth).toBeCloseTo(length * RAIL_ARM_WIDTH_PER_LENGTH, 5)
      })
    })
  }

  it('niedriger Bereich: Leiste passt trotzdem samt Leuchten hinein', () => {
    const c = { canvasWidth: 640, canvasHeight: 480, viewWidth: 900, viewHeight: 300, screenHeight: 900 }
    const css = toCss(computeFlowRailLayout(c), 640, 480, c.viewWidth, c.viewHeight)
    const haloHalf = (css.armWidth * RAIL_HALO_WIDTH_RATIO) / 2
    expect(css.top - haloHalf).toBeGreaterThanOrEqual(16 - 1e-6)
    expect(css.bottom + haloHalf).toBeLessThanOrEqual(300 - 16 + 1e-6)
  })

  it('Handy mindestens so dick wie Laptop, aber nicht klobig', () => {
    const phone = computeFlowRailLayout({ canvasWidth: 480, canvasHeight: 640, ...PHONE })
    const laptop = computeFlowRailLayout({ canvasWidth: 640, canvasHeight: 480, ...LAPTOP })
    const phoneCss = toCss(phone, 480, 640, PHONE.viewWidth, PHONE.viewHeight)
    const laptopCss = toCss(laptop, 640, 480, LAPTOP.viewWidth, LAPTOP.viewHeight)
    expect(phoneCss.armWidth).toBeGreaterThanOrEqual(laptopCss.armWidth)
    expect(phoneCss.armWidth - laptopCss.armWidth).toBeLessThan(14)
  })

  it('gekippte Hand bleibt auf schmalem Handy im Bild', () => {
    const narrow = { canvasWidth: 480, canvasHeight: 640, viewWidth: 320, viewHeight: 900, screenHeight: 1000 }
    const layout = computeFlowRailLayout(narrow)
    const css = toCss(layout, 480, 640, narrow.viewWidth, narrow.viewHeight)
    const total = css.bottom - css.top
    // Hand kippt bis TILT_MAX_DEG — Spitze samt halber Handbreite hält den Seitenrand.
    const handHalfWidth = (css.armWidth * RAIL_HAND_WIDTH_RATIO) / 2
    const reach = total * RAIL_HAND_FRACTION * tiltReach + handHalfWidth
    expect(css.cx + reach).toBeLessThanOrEqual(narrow.viewWidth - 16)
  })

  it('liefert Canvas-Pixel pro CSS-Pixel für Leuchten/Ränder', () => {
    const layout = computeFlowRailLayout({ canvasWidth: 640, canvasHeight: 480, ...LAPTOP })
    expect(layout.px).toBeCloseTo(1 / Math.max(1440 / 640, 800 / 480), 5)
  })
})
