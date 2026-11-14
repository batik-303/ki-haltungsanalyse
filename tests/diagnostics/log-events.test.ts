import { describe, expect, it } from 'vitest'
import { createErrorEvent } from '../../src/core/diagnostics/log-events'

describe('createErrorEvent – Fehler fürs Diagnose-Log', () => {
  it('nimmt Quelle, Text und den Stack des ersten Fehlers', () => {
    const error = new Error('Modell fehlt')
    error.stack = 'Error: Modell fehlt\n    at init (index-abc.js:1:200)'
    expect(createErrorEvent('console.error', ['Laden:', error])).toEqual({
      kind: 'error',
      source: 'console.error',
      message: 'Laden: Error: Modell fehlt',
      stack: 'Error: Modell fehlt\n    at init (index-abc.js:1:200)',
    })
  })

  it('lässt den Stack weg, wenn kein Fehler-Objekt dabei ist', () => {
    expect(createErrorEvent('console.warn', ['[Pose] Mikro fehlt'])).toEqual({
      kind: 'error',
      source: 'console.warn',
      message: '[Pose] Mikro fehlt',
    })
  })

  it('filtert auch Fehler-Grund ohne Error-Objekt, z. B. Punkte bei unhandledrejection', () => {
    expect(createErrorEvent('unhandledrejection', [{ x: 0.1, y: 0.2 }]).message).toBe('[Punkte ausgelassen]')
  })
})
