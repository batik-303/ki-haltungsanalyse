import { describe, it, expect, beforeEach } from 'vitest'
import { usePoseStore } from '../src/store/pose-store'

// V1-Flow: der Home-Screen ist die vollständige Auswahlbühne. Der CTA
// „Übung starten" überspringt den früheren Setup-Screen und geht direkt in
// die Session (dort läuft die Kalibrierung). `enterSession` setzt das
// Instrument und wechselt den Screen, ohne den zuvor gewählten Fokus zu
// verwerfen.

describe('enterSession', () => {
  beforeEach(() => {
    usePoseStore.setState({
      appScreen: 'home',
      selectedInstrument: null,
      focusMode: 'violin',
      sessionActive: true,
      masterPrint: null,
    })
  })

  it('setzt das Instrument und wechselt direkt in die Session', () => {
    usePoseStore.getState().enterSession('violin')
    const state = usePoseStore.getState()
    expect(state.appScreen).toBe('session')
    expect(state.selectedInstrument).toBe('violin')
  })

  it('bewahrt den zuvor gewählten Fokus', () => {
    usePoseStore.getState().setFocusMode('wrist')
    usePoseStore.getState().enterSession('violin')
    expect(usePoseStore.getState().focusMode).toBe('wrist')
  })

  it('startet mit frischem Sitzungszustand (nicht aktiv, ohne Master-Print)', () => {
    usePoseStore.setState({ sessionActive: true })
    usePoseStore.getState().enterSession('violin')
    const state = usePoseStore.getState()
    expect(state.sessionActive).toBe(false)
    expect(state.masterPrint).toBeNull()
  })
})
