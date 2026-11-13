import { describe, expect, it } from 'vitest'
import { classifyLayer } from '../../src/core/analysis/layer-classifier'

/**
 * #168: Charakterisierungs-Tests für die Ebenen flow → bewusst → achtung → limit.
 * Grenzen: unter 15 flow, unter 50 bewusst, unter 75 achtung, sonst limit.
 */
describe('classifyLayer', () => {
  it('ordnet die Spannung an den Grenzen 15 / 50 / 75 der richtigen Ebene zu', () => {
    expect(classifyLayer(0, 'wrist').layer).toBe('flow')
    expect(classifyLayer(14.9, 'wrist').layer).toBe('flow')
    expect(classifyLayer(15, 'wrist').layer).toBe('bewusst')
    expect(classifyLayer(49.9, 'wrist').layer).toBe('bewusst')
    expect(classifyLayer(50, 'wrist').layer).toBe('achtung')
    expect(classifyLayer(74.9, 'wrist').layer).toBe('achtung')
    expect(classifyLayer(75, 'wrist').layer).toBe('limit')
    expect(classifyLayer(100, 'wrist').layer).toBe('limit')
  })

  it('setzt den Status-Typ je Ebene', () => {
    expect(classifyLayer(0, 'shoulder').statusType).toBe('good')
    expect(classifyLayer(20, 'shoulder').statusType).toBe('yellow')
    expect(classifyLayer(60, 'shoulder').statusType).toBe('purple')
    expect(classifyLayer(90, 'shoulder').statusType).toBe('purple')
  })

  it('liefert Handgelenk-Texte', () => {
    expect(classifyLayer(0, 'wrist')).toEqual({
      layer: 'flow',
      label: 'Flow',
      statusMessage: 'Handgelenk gerade – perfekt!',
      statusType: 'good',
    })
    expect(classifyLayer(20, 'wrist').label).toBe('Bewusst')
    expect(classifyLayer(60, 'wrist').statusMessage).toBe('Handgelenk lösen...')
    expect(classifyLayer(90, 'wrist').statusMessage).toBe('Zurück zum Anker!')
  })

  it('liefert Schulter-Texte', () => {
    expect(classifyLayer(0, 'shoulder').label).toBe('Frei')
    expect(classifyLayer(20, 'shoulder').statusMessage).toBe('Raum wird kleiner...')
    expect(classifyLayer(60, 'shoulder').label).toBe('Eng')
    expect(classifyLayer(90, 'shoulder')).toEqual({
      layer: 'limit',
      label: 'Gepresst',
      statusMessage: 'Raum freigeben!',
      statusType: 'purple',
    })
  })

  it('wählt bei der Geige den Text nach Drift-Richtung (1 = sinkt, sonst hoch)', () => {
    expect(classifyLayer(0, 'violin').label).toBe('Anker')
    expect(classifyLayer(20, 'violin', 1).statusMessage).toBe('Geige sinkt leicht...')
    expect(classifyLayer(20, 'violin', -1).statusMessage).toBe('Geige etwas hoch...')
    expect(classifyLayer(20, 'violin').statusMessage).toBe('Geige etwas hoch...')
    expect(classifyLayer(60, 'violin', 1).statusMessage).toBe('Geige sinkt ab!')
    expect(classifyLayer(60, 'violin', -1).statusMessage).toBe('Geige zu hoch!')
    expect(classifyLayer(90, 'violin', 1).statusMessage).toBe('Zurück zum Anker!')
  })
})
