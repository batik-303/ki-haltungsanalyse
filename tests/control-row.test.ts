import { describe, it, expect } from 'vitest'
import { computeControlRow } from '../src/core/layout/control-row'

// Knopf-Zeile unter dem Rahmen (#114, Entscheidung 4 aus #104): feste Plätze
// [🎤] [Hauptknopf] [Ansicht], auf allen Geräten gleich. Namen/Texte stellt
// erst #111 um — hier nur, was an welchem Platz steht.

describe('computeControlRow', () => {
  it('vor dem Speichern: Mikro · Haltung speichern (gold), kein Ansicht-Knopf', () => {
    expect(computeControlRow({ phase: 'ready-to-calibrate', viewMode: 'analyse', calibrating: false }))
      .toEqual({ mic: true, main: 'save', view: null, discreet: false })
  })

  it('Spiegel: Mikro · Beenden (gold) · Ansicht', () => {
    expect(computeControlRow({ phase: 'tracking', viewMode: 'analyse', calibrating: false }))
      .toEqual({ mic: true, main: 'stop', view: 'to-flow', discreet: false })
  })

  it('Flow: Mikro bleibt sichtbar · Beenden · Ansicht, alles farblos', () => {
    expect(computeControlRow({ phase: 'tracking', viewMode: 'flow', calibrating: false }))
      .toEqual({ mic: true, main: 'stop', view: 'to-mirror', discreet: true })
  })

  it('beim Positionieren: nur das Mikro', () => {
    expect(computeControlRow({ phase: 'positioning', viewMode: 'analyse', calibrating: false }))
      .toEqual({ mic: true, main: null, view: null, discreet: false })
  })

  it('während des Countdowns führt das Kalibrier-Kärtchen — Knöpfe weg, Mikro bleibt', () => {
    expect(computeControlRow({ phase: 'ready-to-calibrate', viewMode: 'analyse', calibrating: true }))
      .toEqual({ mic: true, main: null, view: null, discreet: false })
  })
})
