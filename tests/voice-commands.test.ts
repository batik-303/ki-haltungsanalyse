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

  it('kein Befehl im Text → null', () => {
    expect(matchVoiceCommand('guten Morgen')).toBeNull()
  })
})
