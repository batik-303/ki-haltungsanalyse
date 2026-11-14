import { describe, expect, it } from 'vitest'
import { MAX_LOG_MESSAGE_CHARS, formatLogMessage } from '../../src/core/diagnostics/log-message'

describe('formatLogMessage – Text für das Diagnose-Log', () => {
  it('fügt Texte, Zahlen und Fehler zu einer Zeile zusammen', () => {
    expect(formatLogMessage(['[Pose] Modell', 2, new Error('weg')])).toBe('[Pose] Modell 2 Error: weg')
  })

  it('lässt Bilder als data-Adresse weg', () => {
    expect(formatLogMessage(['Bild:', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='])).toBe('Bild: [Bild ausgelassen]')
  })

  it('lässt Körper- und Hand-Punkte weg, auch einzeln oder als Liste', () => {
    const point = { x: 0.4, y: 0.5, z: -0.1, visibility: 0.9 }
    expect(formatLogMessage(['Hand', [point, point]])).toBe('Hand [Punkte ausgelassen]')
    expect(formatLogMessage(['Gelenk', point])).toBe('Gelenk [Punkte ausgelassen]')
    expect(formatLogMessage(['Ergebnis', { landmarks: [[point]] }])).toBe('Ergebnis [Punkte ausgelassen]')
  })

  it('zeigt andere Objekte nur als Platzhalter, nicht ihren Inhalt', () => {
    expect(formatLogMessage(['Zustand', { name: 'Anna' }])).toBe('Zustand [Objekt]')
  })

  it('lässt E-Mail-Adressen weg', () => {
    expect(formatLogMessage(['Konto anna.muster@example.org fehlt'])).toBe('Konto [E-Mail ausgelassen] fehlt')
  })

  it('kürzt sehr lange Texte auf 2000 Zeichen', () => {
    expect(MAX_LOG_MESSAGE_CHARS).toBe(2000)
    const text = formatLogMessage(['a'.repeat(5000)])
    expect(text).toHaveLength(2000)
    expect(text.endsWith('…')).toBe(true)
  })
})
