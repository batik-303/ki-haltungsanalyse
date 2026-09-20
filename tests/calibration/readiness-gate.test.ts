import { describe, expect, it } from 'vitest'
import { createReadinessGate } from '../../src/core/calibration/readiness-gate'

/**
 * Ticket #59 (Karte #56): Kern-Auslöselogik neu ausgerichtet.
 *
 * Kein Auto-Arm mehr: der Countdown startet **nur auf bewussten Auslöser**
 * (`requestArm()` — aus Stimme „bereit" / Knopf „Haltung speichern", T4). Das
 * Tor ist ein **Distanz-Gate mit Auto-Start**:
 *   idle → (requestArm) → waiting (Abstand passt nicht, sanfte Führung)
 *        → (distanceOk) → armed (Countdown feuert von selbst, kein erneutes
 *          Drücken).
 *
 * Grundsätze: ruhig (keine Uhr, kein Halten), kein Einsperren (Timeout meldet
 * nur, sperrt nicht), armed ist verriegelt bis `reset()`. Die Spielhaltung
 * (`wristAxisOk`) prüft nicht mehr dieses Tor, sondern der Erfassungsmoment.
 */
describe('createReadinessGate', () => {
  const opts = { timeoutMs: 5000 }

  it('startet im Zustand idle — ruhig, ohne Auslöser', () => {
    const gate = createReadinessGate(opts)
    const s = gate.state()
    expect(s.phase).toBe('idle')
    expect(s.justArmed).toBe(false)
    expect(s.timedOut).toBe(false)
  })

  it('bleibt idle, solange kein bewusster Auslöser kam — auch bei passendem Abstand', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: true, dtMs: 500 })
    expect(s.phase).toBe('idle')
    expect(s.justArmed).toBe(false)
  })

  it('feuert bei bewusstem Auslöser + passendem Abstand sofort (justArmed nur auf der Kante)', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    const armed = gate.update({ distanceOk: true, dtMs: 16 })
    expect(armed.phase).toBe('armed')
    expect(armed.justArmed).toBe(true)

    const next = gate.update({ distanceOk: true, dtMs: 16 })
    expect(next.phase).toBe('armed')
    expect(next.justArmed).toBe(false)
  })

  it('wartet bei bewusstem Auslöser ohne passenden Abstand — kein Feuern', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    const s = gate.update({ distanceOk: false, dtMs: 500 })
    expect(s.phase).toBe('waiting')
    expect(s.justArmed).toBe(false)
  })

  it('startet den Countdown automatisch, sobald der Abstand passt — kein erneutes Drücken', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    expect(gate.update({ distanceOk: false, dtMs: 500 }).phase).toBe('waiting')
    expect(gate.update({ distanceOk: false, dtMs: 500 }).phase).toBe('waiting')
    const armed = gate.update({ distanceOk: true, dtMs: 500 })
    expect(armed.phase).toBe('armed')
    expect(armed.justArmed).toBe(true)
  })

  it('verriegelt armed bis reset() — verlorener Abstand hebt die Scharfschaltung nicht auf', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    gate.update({ distanceOk: true, dtMs: 16 })
    const wobble = gate.update({ distanceOk: false, dtMs: 100 })
    expect(wobble.phase).toBe('armed')
    expect(wobble.justArmed).toBe(false)
  })

  it('ignoriert weitere Auslöser, solange bereits scharf (idempotent)', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    const first = gate.update({ distanceOk: true, dtMs: 16 })
    expect(first.justArmed).toBe(true)
    gate.requestArm()
    const again = gate.update({ distanceOk: true, dtMs: 16 })
    expect(again.justArmed).toBe(false)
  })

  it('reset() bringt zurück nach idle und verwirft den Auslöse-Wunsch', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    gate.update({ distanceOk: true, dtMs: 16 })
    gate.reset()
    const s = gate.state()
    expect(s.phase).toBe('idle')
    // Nach reset feuert ein alter Wunsch nicht nach:
    const after = gate.update({ distanceOk: true, dtMs: 16 })
    expect(after.phase).toBe('idle')
    expect(after.justArmed).toBe(false)
  })

  it('meldet einen Timeout beim Warten auf den Abstand, ohne zu sperren', () => {
    const gate = createReadinessGate(opts)
    gate.requestArm()
    let s = gate.update({ distanceOk: false, dtMs: 3000 })
    expect(s.timedOut).toBe(false)
    s = gate.update({ distanceOk: false, dtMs: 3000 })
    expect(s.timedOut).toBe(true)
    // Trotz Timeout weiter bedienbar: sobald der Abstand passt, feuert es.
    s = gate.update({ distanceOk: true, dtMs: 500 })
    expect(s.phase).toBe('armed')
    expect(s.justArmed).toBe(true)
  })

  it('meldet keinen Timeout im idle (ohne Auslöser läuft keine Wartezeit)', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: false, dtMs: 99999 })
    expect(s.phase).toBe('idle')
    expect(s.timedOut).toBe(false)
  })
})
