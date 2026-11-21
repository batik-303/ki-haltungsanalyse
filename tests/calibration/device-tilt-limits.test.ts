import { describe, expect, it } from 'vitest'
import {
  computeTiltLimits,
  createDeviceTiltHintState,
  stepDeviceTiltHint,
  TILT_LIMITS_PHONE,
  TILT_LIMITS_TABLET,
} from '../../src/core/calibration/device-tilt'

/**
 * #215, Entscheidung Nutzerin: zwei Grenzen nach Gerät. Handy 15° (Hysterese 17°),
 * Tablet 25° (27°). Tablet = kürzere Bildschirmseite ≥ 600 CSS-px.
 */
describe('computeTiltLimits – Grenzen aus der Bildschirmgröße', () => {
  it('Handy und Tablet haben eigene Grenzen', () => {
    expect(TILT_LIMITS_PHONE).toEqual({ enterDeg: 15, exitDeg: 17 })
    expect(TILT_LIMITS_TABLET).toEqual({ enterDeg: 25, exitDeg: 27 })
  })

  it('iPhone (390×844) → Handy', () => {
    expect(computeTiltLimits(390, 844)).toEqual(TILT_LIMITS_PHONE)
  })

  it('iPad hochkant (820×1180) und quer (1180×820) → Tablet', () => {
    expect(computeTiltLimits(820, 1180)).toEqual(TILT_LIMITS_TABLET)
    expect(computeTiltLimits(1180, 820)).toEqual(TILT_LIMITS_TABLET)
  })

  it('Grenze genau bei 600 px kürzerer Seite', () => {
    expect(computeTiltLimits(599, 1000)).toEqual(TILT_LIMITS_PHONE)
    expect(computeTiltLimits(600, 1000)).toEqual(TILT_LIMITS_TABLET)
  })
})

describe('stepDeviceTiltHint mit Handy-Grenzen', () => {
  const live = (tilt: number) =>
    stepDeviceTiltHint(stepDeviceTiltHint(createDeviceTiltHintState(), tilt + 0.01, 0, 'granted', TILT_LIMITS_PHONE), tilt, 16, 'granted', TILT_LIMITS_PHONE)

  it('iPhone ruhig auf dem Ständer ≈12° → „gerade ✓“', () => {
    expect(live(12).view).toBe('level')
  })

  it('über 15° → schief', () => {
    expect(live(16).view).toBe('tilted')
  })

  it('Hysterese: einmal gerade, bleibt es bis 17° gerade', () => {
    let s = live(12)
    s = stepDeviceTiltHint(s, 16.5, 100, 'granted', TILT_LIMITS_PHONE)
    expect(s.view).toBe('level')
    s = stepDeviceTiltHint(s, 17.5, 200, 'granted', TILT_LIMITS_PHONE)
    expect(s.view).toBe('tilted')
  })
})
