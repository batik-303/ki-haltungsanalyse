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

// Flow-Ansicht (#77/#99): nur die periphere Leiste, groß in der Mitte, fast
// volle Bildschirmhöhe — oben etwas Rand, unten Platz über den Knöpfen.
// Das Canvas hat Videogröße und füllt im Flow den Bildschirm (object-cover).

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

const PHONE = { viewWidth: 390, viewHeight: 844 }
const LAPTOP = { viewWidth: 1440, viewHeight: 900 }
const TABLET = { viewWidth: 820, viewHeight: 1180 }
// Höhe der Knöpfe unten (CSS-Pixel), gemessen an session-screen.tsx:
// Handy = 14 (im Flow angehoben, Handy-Test 24.10.) + 8 + 44 + 8 + Safe-Area (≈ 34); Laptop = clamp(24px, 6vh, 96px) + Knopf-Reihe
// (≈ 42) + Abstand 12 + Mikrofon (≈ 34).
const PHONE_BUTTONS_CSS = 108
const laptopButtonsCss = (viewHeight: number) => Math.min(96, Math.max(24, viewHeight * 0.06)) + 88
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
  ]

  for (const c of cases) {
    describe(c.name, () => {
      const layout = computeFlowRailLayout(c)
      const css = toCss(layout, c.canvasWidth, c.canvasHeight, c.viewWidth, c.viewHeight)

      it('steht waagerecht in der Bildschirm-Mitte', () => {
        expect(css.cx).toBeCloseTo(c.viewWidth / 2, 5)
      })

      const cap = css.armWidth / 2
      const buttons = c.viewWidth < 480 ? PHONE_BUTTONS_CSS : laptopButtonsCss(c.viewHeight)

      it('lässt oben etwas Rand – auch die runde Kappe', () => {
        expect(css.top - cap).toBeGreaterThan(16 - 1e-6)
        expect(css.top).toBeLessThan(c.viewHeight * 0.08)
      })

      it('endet mit der Kappe über den Knöpfen unten', () => {
        expect(css.bottom + cap).toBeLessThanOrEqual(c.viewHeight - buttons - 8)
      })

      it('füllt fast die volle Höhe', () => {
        expect(css.bottom - css.top).toBeGreaterThan(c.viewHeight * 0.7)
      })

      it('Breite wächst mit der Höhe (dicker als die Analyse-Leiste)', () => {
        expect(css.armWidth).toBeGreaterThan(24)
        expect(css.armWidth).toBeCloseTo((css.bottom - css.top) * RAIL_ARM_WIDTH_PER_LENGTH, 5)
      })
    })
  }

  // Tablet-Test 24.10.: das Leuchten (Halo, armWidth * RAIL_HALO_WIDTH_RATIO)
  // reichte bis in die Knöpfe — es zählt oben und unten mit zur Leiste.
  describe('Leuchten hält Abstand zu Rand und Knöpfen', () => {
    const haloCases = [
      { name: 'Tablet hochkant, Hochformat-Video', canvasWidth: 480, canvasHeight: 640, ...TABLET },
      { name: 'Tablet hochkant, Querformat-Video', canvasWidth: 640, canvasHeight: 480, ...TABLET },
      { name: 'Handy hochkant', canvasWidth: 480, canvasHeight: 640, ...PHONE },
      { name: 'Laptop', canvasWidth: 640, canvasHeight: 480, ...LAPTOP },
    ]
    for (const c of haloCases) {
      it(c.name, () => {
        const css = toCss(computeFlowRailLayout(c), c.canvasWidth, c.canvasHeight, c.viewWidth, c.viewHeight)
        const haloHalf = (css.armWidth * RAIL_HALO_WIDTH_RATIO) / 2
        const buttons = c.viewWidth < 480 ? PHONE_BUTTONS_CSS : laptopButtonsCss(c.viewHeight)
        expect(css.top - haloHalf).toBeGreaterThanOrEqual(16 - 1e-6)
        expect(css.bottom + haloHalf + 8).toBeLessThanOrEqual(c.viewHeight - buttons + 1e-6)
      })
    }
  })

  it('Handy und Laptop: gleiche Regel → ähnliche Strichstärke', () => {
    const phone = computeFlowRailLayout({ canvasWidth: 480, canvasHeight: 640, ...PHONE })
    const laptop = computeFlowRailLayout({ canvasWidth: 640, canvasHeight: 480, ...LAPTOP })
    const phoneCss = toCss(phone, 480, 640, PHONE.viewWidth, PHONE.viewHeight)
    const laptopCss = toCss(laptop, 640, 480, LAPTOP.viewWidth, LAPTOP.viewHeight)
    expect(Math.abs(phoneCss.armWidth - laptopCss.armWidth)).toBeLessThan(8)
  })

  it('gekippte Hand bleibt auf schmalem Handy im Bild', () => {
    const narrow = { canvasWidth: 480, canvasHeight: 640, viewWidth: 320, viewHeight: 900 }
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
    expect(layout.px).toBeCloseTo(1 / Math.max(1440 / 640, 900 / 480), 5)
  })
})
