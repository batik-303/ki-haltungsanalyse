import { describe, it, expect } from 'vitest'
import { FOCUS_MODES } from '../src/core/config/focus-modes'
import type { FocusMode } from '../src/core/types'

// Die Fokusmodi sind geteilter Inhalt (Home-Auswahlbühne, früher im Setup
// hartkodiert). Reines Datenmodul — hier als Guardrail geprüft.

describe('FOCUS_MODES', () => {
  it('deckt alle drei Fokusmodi in fester Reihenfolge ab', () => {
    const values = FOCUS_MODES.map((m) => m.value)
    expect(values).toEqual<FocusMode[]>(['violin', 'wrist', 'shoulder'])
  })

  it('liefert je Modus deutsches Label, Icon und Beschreibung', () => {
    for (const mode of FOCUS_MODES) {
      expect(mode.label.length).toBeGreaterThan(0)
      expect(mode.icon.length).toBeGreaterThan(0)
      expect(mode.description.length).toBeGreaterThan(0)
    }
  })

  it('hat eindeutige Werte', () => {
    const values = FOCUS_MODES.map((m) => m.value)
    expect(new Set(values).size).toBe(values.length)
  })
})
