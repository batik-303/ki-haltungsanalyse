import { describe, expect, it } from 'vitest'
import { selectPhaseHint } from '../../src/store/selectors'
import type { PoseState } from '../../src/store/pose-store'

/**
 * T4 #60 (Karte #56): Der bewusste Auslöser heißt jetzt überall „bereit"
 * (Sprachbefehl) bzw. „Haltung speichern" (Knopf) — das Wort „kalibrieren"
 * verschwindet aus dem sichtbaren Phasen-Hinweis.
 *
 * `selectPhaseHint` liest nur `isCalibrating`, `masterPrint` und `distanceOk`;
 * die Tests reichen ein Minimal-Objekt in dieser Form durch.
 */
const state = (over: Partial<PoseState>): PoseState =>
  ({ isCalibrating: false, masterPrint: null, distanceOk: false, ...over }) as unknown as PoseState

describe('selectPhaseHint', () => {
  it('führt beim Positionieren ruhig vor die Kamera', () => {
    expect(selectPhaseHint(state({ distanceOk: false }))).toBe('Positioniere dich vor der Kamera')
  })

  it('lädt bei passendem Abstand mit „bereit" ein (kein „kalibrieren")', () => {
    const hint = selectPhaseHint(state({ distanceOk: true }))
    expect(hint).toContain('bereit')
    expect(hint.toLowerCase()).not.toContain('kalibr')
  })

  it('bleibt beim Tracking beim ruhigen Stopp-Hinweis', () => {
    expect(selectPhaseHint(state({ masterPrint: {} as PoseState['masterPrint'] }))).toBe(
      "Sage 'Stop' zum Beenden",
    )
  })
})
