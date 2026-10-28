import { describe, it, expect } from 'vitest'
import { matchVoiceCommand } from '../src/core/voice/voice-commands'

// Sprachbefehle: aus dem gehörten Text (deutsche Erkennung) den Befehl finden.

describe('matchVoiceCommand', () => {
  it('„Development" → Entwickler-Ansicht umschalten', () => {
    expect(matchVoiceCommand('Development')).toBe('development')
  })

  it('erkennt auch abweichende Schreibweisen über den Wortstamm „develop"', () => {
    expect(matchVoiceCommand('developement')).toBe('development')
    expect(matchVoiceCommand('developments')).toBe('development')
  })

  it('bisherige Befehle bleiben', () => {
    expect(matchVoiceCommand('bereit')).toBe('kalibrieren')
    expect(matchVoiceCommand('stopp')).toBe('stop')
    expect(matchVoiceCommand('nochmal')).toBe('neu')
    expect(matchVoiceCommand('flow')).toBe('flow')
    expect(matchVoiceCommand('Analyse')).toBe('analyse')
  })

  // #111 (Entscheidungen aus #105): Knopf-Wort = Sprach-Wort.
  it('„speichern" löst Haltung-Speichern aus, „bereit" still weiter', () => {
    expect(matchVoiceCommand('speichern')).toBe('kalibrieren')
    expect(matchVoiceCommand('Haltung speichern')).toBe('kalibrieren')
    expect(matchVoiceCommand('bereit')).toBe('kalibrieren')
  })

  it('„neu speichern" heißt weiterhin „neu", nicht „speichern"', () => {
    expect(matchVoiceCommand('neu speichern')).toBe('neu')
    expect(matchVoiceCommand('Neu speichern')).toBe('neu')
  })

  it('„los" ist kein Befehl mehr (löste in Alltagssätzen aus)', () => {
    expect(matchVoiceCommand('also los')).toBeNull()
    expect(matchVoiceCommand('los')).toBeNull()
  })

  it('„Spiegel" wechselt zur Spiegel-Ansicht; „Analyse"/„Kamera" still weiter', () => {
    expect(matchVoiceCommand('Spiegel')).toBe('analyse')
    expect(matchVoiceCommand('Analyse')).toBe('analyse')
    expect(matchVoiceCommand('Kamera')).toBe('analyse')
  })

  it('„Beenden" (Knopf-Wort) beendet', () => {
    expect(matchVoiceCommand('Beenden')).toBe('stop')
  })

  it('kein Befehl im Text → null', () => {
    expect(matchVoiceCommand('guten Morgen')).toBeNull()
  })
})
