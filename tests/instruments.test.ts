import { describe, it, expect } from 'vitest'
import { INSTRUMENTS } from '../src/core/config/instruments'
import type { Instrument } from '../src/core/types'

// Die Instrumente sind — wie die Fokusmodi — geteilter, datengetriebener
// Inhalt der Home-Auswahlbühne (Stitch-Kartenstil, #49). Konkrete Instanzen
// des zentralen `InstrumentMeta`. Reines Datenmodul, hier als Guardrail
// geprüft. V1 kennt nur die Geige; die Struktur trägt spätere Instrumente
// (Cello …) ohne Umbau der Karte.

describe('INSTRUMENTS', () => {
  it('enthält in V1 genau die Geige', () => {
    const ids = INSTRUMENTS.map((i) => i.id)
    expect(ids).toEqual<Instrument[]>(['violin'])
  })

  it('liefert je Instrument deutschen Namen, Icon, Beschreibung und Fokusmodi', () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.name.length).toBeGreaterThan(0)
      expect(instrument.icon.length).toBeGreaterThan(0)
      expect(instrument.description.length).toBeGreaterThan(0)
      expect(instrument.modes.length).toBeGreaterThan(0)
    }
  })

  it('hat eindeutige Werte', () => {
    const ids = INSTRUMENTS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
