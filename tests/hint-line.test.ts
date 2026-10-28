import { describe, it, expect } from 'vitest'
import { computeHintLine, VOICE_TIP_DURATION_MS } from '../src/core/layout/hint-line'

// Hinweis-Zeile unter der Knopf-Zeile (#111, Entscheidungen 9/10 aus #105):
// vor dem Speichern „🎤 Oder sag ‚speichern‘“, nach dem Speichern ≈ 8 s
// „🎤 Du kannst auch sagen, was auf den Knöpfen steht.", danach ruhig.
// Im Flow nie. Hört das Mikro nicht zu, sagt die Zeile das ehrlich.

const base = {
  phase: 'ready-to-calibrate' as const,
  phaseHint: 'Oder sag „speichern“',
  viewMode: 'analyse' as const,
  calibrating: false,
  voiceStatus: 'listening' as const,
  voiceError: null,
  calibratedAt: null,
  now: 10_000,
}

describe('computeHintLine', () => {
  it('vor dem Speichern: „🎤 Oder sag ‚speichern‘“', () => {
    expect(computeHintLine(base)).toBe('🎤 Oder sag „speichern“')
  })

  it('nach dem Speichern ≈ 8 s: Knopf-Wörter gehen auch per Sprache', () => {
    const tracking = { ...base, phase: 'tracking' as const, calibratedAt: 10_000 }
    expect(computeHintLine({ ...tracking, now: 10_000 })).toBe('🎤 Du kannst auch sagen, was auf den Knöpfen steht.')
    expect(computeHintLine({ ...tracking, now: 10_000 + VOICE_TIP_DURATION_MS - 1 })).not.toBeNull()
  })

  it('danach ruhig', () => {
    const tracking = { ...base, phase: 'tracking' as const, calibratedAt: 10_000 }
    expect(computeHintLine({ ...tracking, now: 10_000 + VOICE_TIP_DURATION_MS })).toBeNull()
  })

  it('erhaltene Kalibrierung ohne neues Speichern: ruhig', () => {
    expect(computeHintLine({ ...base, phase: 'tracking', calibratedAt: null })).toBeNull()
  })

  it('im Flow nie, auch nicht direkt nach dem Speichern', () => {
    expect(computeHintLine({ ...base, phase: 'tracking', viewMode: 'flow', calibratedAt: 10_000 })).toBeNull()
  })

  it('während des Countdowns führt das Kalibrier-Kärtchen', () => {
    expect(computeHintLine({ ...base, calibrating: true })).toBeNull()
  })

  it('beim Positionieren: der Phasen-Hinweis', () => {
    expect(computeHintLine({ ...base, phase: 'positioning', phaseHint: 'Positioniere dich vor der Kamera' }))
      .toBe('🎤 Positioniere dich vor der Kamera')
  })

  it('Mikro aus oder gestört: ehrlich sagen, wie man es wieder anschaltet', () => {
    expect(computeHintLine({ ...base, voiceStatus: 'off' })).toBe('🎤 Aus — tippen zum Aktivieren')
    expect(computeHintLine({ ...base, voiceStatus: 'error', voiceError: 'Mikro nicht freigegeben' }))
      .toBe('🎤 Mikro nicht freigegeben')
    expect(computeHintLine({ ...base, voiceStatus: 'unsupported' })).toBe('🎤 Mikro aus — tippen')
    expect(computeHintLine({ ...base, voiceStatus: 'starting' })).toBe('🎤 startet …')
  })
})
