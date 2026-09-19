import { describe, expect, it } from 'vitest'
import { createReadinessGate } from '../../src/core/calibration/readiness-gate'

/**
 * Ticket #36: Gestuftes Bereitschafts-Tor vor dem Countdown.
 *
 * Ablauf (reine Zustandsmaschine, per Frame gefüttert):
 *   positioning → (Distanz ok) → posture → (Spielhaltung kurz gehalten)
 *   → holding → armed (→ Countdown auslösen).
 *
 * Grundsätze: kurz halten (kein Zufalls-Treffer), kein Einsperren (Timeout
 * meldet nur, sperrt nicht), armed ist verriegelt bis `reset()`.
 */
describe('createReadinessGate', () => {
  const opts = { holdDurationMs: 1000, timeoutMs: 5000 }

  it('startet im Zustand positioning', () => {
    const gate = createReadinessGate(opts)
    const s = gate.state()
    expect(s.phase).toBe('positioning')
    expect(s.holdMs).toBe(0)
    expect(s.justArmed).toBe(false)
  })

  it('bleibt in positioning, solange die Distanz nicht passt — auch bei guter Haltung', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: false, wristAxisOk: true, dtMs: 500 })
    expect(s.phase).toBe('positioning')
    expect(s.holdMs).toBe(0)
  })

  it('wechselt bei guter Distanz ohne Spielhaltung nach posture', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 500 })
    expect(s.phase).toBe('posture')
    expect(s.holdMs).toBe(0)
  })

  it('sammelt Haltezeit in holding und zeigt anteiligen Fortschritt', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    expect(s.phase).toBe('holding')
    expect(s.holdMs).toBe(500)
    expect(s.holdProgress).toBeCloseTo(0.5)
    expect(s.justArmed).toBe(false)
  })

  it('scharf (armed) erst, wenn die Haltezeit erreicht ist — justArmed nur auf der Übergangs-Frame', () => {
    const gate = createReadinessGate(opts)
    gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    const armed = gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    expect(armed.phase).toBe('armed')
    expect(armed.justArmed).toBe(true)
    expect(armed.holdProgress).toBe(1)

    const next = gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    expect(next.phase).toBe('armed')
    expect(next.justArmed).toBe(false)
  })

  it('setzt die Haltezeit zurück, wenn die Spielhaltung mittendrin verloren geht', () => {
    const gate = createReadinessGate(opts)
    gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    const lost = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 100 })
    expect(lost.phase).toBe('posture')
    expect(lost.holdMs).toBe(0)
  })

  it('fällt nach positioning zurück, wenn die Distanz mittendrin verloren geht', () => {
    const gate = createReadinessGate(opts)
    gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 500 })
    const lost = gate.update({ distanceOk: false, wristAxisOk: true, dtMs: 100 })
    expect(lost.phase).toBe('positioning')
    expect(lost.holdMs).toBe(0)
  })

  it('verriegelt armed bis reset() — kein Un-Arm durch verlorene Haltung', () => {
    const gate = createReadinessGate(opts)
    gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 1000 })
    const wobble = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 100 })
    expect(wobble.phase).toBe('armed')
    expect(wobble.justArmed).toBe(false)

    gate.reset()
    expect(gate.state().phase).toBe('positioning')
    expect(gate.state().holdMs).toBe(0)
  })

  it('meldet einen Timeout, ohne zu sperren (kein Einsperren)', () => {
    const gate = createReadinessGate(opts)
    // Distanz ok, aber Haltung nie erreicht → Timeout nach 5000 ms.
    let s = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 3000 })
    expect(s.timedOut).toBe(false)
    s = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 3000 })
    expect(s.timedOut).toBe(true)
    // Trotz Timeout weiterhin bedienbar: gute Haltung führt weiter Richtung armed.
    s = gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 1000 })
    expect(s.phase).toBe('armed')
  })

  it('setzt den Timeout-Zähler zurück, wenn die Distanz verloren geht', () => {
    const gate = createReadinessGate(opts)
    gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 4000 })
    gate.update({ distanceOk: false, wristAxisOk: false, dtMs: 1000 })
    const s = gate.update({ distanceOk: true, wristAxisOk: false, dtMs: 2000 })
    expect(s.timedOut).toBe(false)
  })

  it('begrenzt den Fortschritt auf 1, auch bei Überlauf der Haltezeit', () => {
    const gate = createReadinessGate(opts)
    const s = gate.update({ distanceOk: true, wristAxisOk: true, dtMs: 9999 })
    expect(s.holdProgress).toBe(1)
  })
})
