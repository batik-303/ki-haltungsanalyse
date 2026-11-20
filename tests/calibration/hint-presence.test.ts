import { describe, expect, it } from 'vitest'
import {
  createHintPresenceState,
  stepHintPresence,
  HINT_OK_HOLD_MS,
} from '../../src/core/calibration/hint-presence'

/**
 * #147: Ist ein Zustand in Ordnung (Gerät gerade, Abstand passt), bleibt das
 * Kärtchen kurz stehen und gleitet dann nach rechts aus dem Bild. Es kommt nur
 * wieder, wenn es gebraucht wird (Gerät kippt, Abstand passt nicht).
 */
describe('stepHintPresence', () => {
  it('wartet ≈ 1,5 s', () => {
    expect(HINT_OK_HOLD_MS).toBe(1500)
  })

  it('zeigt das Kärtchen, solange etwas zu tun ist', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, false, 0)
    expect(s.presence).toBe('shown')
    s = stepHintPresence(s, false, 10_000)
    expect(s.presence).toBe('shown')
  })

  it('in Ordnung: bleibt kurz stehen, gleitet nach HINT_OK_HOLD_MS weg', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, true, 1000)
    expect(s.presence).toBe('shown')
    s = stepHintPresence(s, true, 1000 + HINT_OK_HOLD_MS - 1)
    expect(s.presence).toBe('shown')
    s = stepHintPresence(s, true, 1000 + HINT_OK_HOLD_MS)
    expect(s.presence).toBe('away')
  })

  it('bleibt weg, solange alles in Ordnung ist', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, true, 0)
    s = stepHintPresence(s, true, HINT_OK_HOLD_MS)
    s = stepHintPresence(s, true, 60_000)
    expect(s.presence).toBe('away')
  })

  it('kommt sofort wieder, wenn es gebraucht wird', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, true, 0)
    s = stepHintPresence(s, true, HINT_OK_HOLD_MS)
    s = stepHintPresence(s, false, HINT_OK_HOLD_MS + 100)
    expect(s.presence).toBe('shown')
  })

  it('nach dem Wiederkommen: wieder in Ordnung → erneut kurz ✓, dann weg', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, true, 0)
    s = stepHintPresence(s, true, HINT_OK_HOLD_MS)
    s = stepHintPresence(s, false, 2000)
    s = stepHintPresence(s, true, 3000)
    expect(s.presence).toBe('shown')
    s = stepHintPresence(s, true, 3000 + HINT_OK_HOLD_MS)
    expect(s.presence).toBe('away')
  })

  it('ein kurzer Wackler vor Ablauf startet die Wartezeit neu', () => {
    let s = createHintPresenceState()
    s = stepHintPresence(s, true, 0)
    s = stepHintPresence(s, false, 1000)
    s = stepHintPresence(s, true, 1200)
    s = stepHintPresence(s, true, 1200 + HINT_OK_HOLD_MS - 1)
    expect(s.presence).toBe('shown')
  })
})
