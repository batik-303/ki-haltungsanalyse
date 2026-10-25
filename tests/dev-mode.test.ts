import { describe, it, expect, beforeEach } from 'vitest'
import { usePoseStore } from '../src/store/pose-store'

// Entwickler-Ansicht (Punkte, Linien, Gradzahl auf dem Canvas): standardmäßig
// aus, per Sprachbefehl „Development" (oder Taste D) ein- und ausschaltbar.

beforeEach(() => {
  usePoseStore.setState(usePoseStore.getInitialState(), true)
})

describe('Entwickler-Ansicht im Store', () => {
  it('ist beim Start ausgeschaltet', () => {
    expect(usePoseStore.getState().debugLandmarks).toBe(false)
  })

  it('einmal umschalten → an, nochmal umschalten → aus', () => {
    usePoseStore.getState().toggleDebugLandmarks()
    expect(usePoseStore.getState().debugLandmarks).toBe(true)
    usePoseStore.getState().toggleDebugLandmarks()
    expect(usePoseStore.getState().debugLandmarks).toBe(false)
  })
})
