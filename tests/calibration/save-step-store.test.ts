import { beforeEach, describe, expect, it } from 'vitest'
import { usePoseStore } from '../../src/store/pose-store'

/**
 * #118: Der rAF-Loop schreibt nur einen kleinen Schnappschuss des ruhigen
 * Speicherns in den Store (`saveStep`) plus die Kante `saveCaptureDue`. Die
 * Zustandsmaschine selbst lebt als useRef im Hook (Triple-State-System).
 * Jeder Neustart räumt beides auf — sonst hängt ein altes Kärtchen im Bild.
 */
const SNAPSHOT = { step: 'counting', count: 2, pauseStatus: null } as const

beforeEach(() => {
  usePoseStore.getState().reset()
})

describe('saveStep im Store', () => {
  it('ist am Anfang leer', () => {
    const s = usePoseStore.getState()
    expect(s.saveStep).toBeNull()
    expect(s.saveCaptureDue).toBe(false)
  })

  it('setSaveStep / setSaveCaptureDue setzen den Schnappschuss und die Kante', () => {
    usePoseStore.getState().setSaveStep(SNAPSHOT)
    usePoseStore.getState().setSaveCaptureDue(true)
    const s = usePoseStore.getState()
    expect(s.saveStep).toEqual(SNAPSHOT)
    expect(s.saveCaptureDue).toBe(true)
  })

  it.each(['recalibrate', 'goHome', 'reset'] as const)('%s räumt saveStep und saveCaptureDue auf', (action) => {
    usePoseStore.setState({ saveStep: SNAPSHOT, saveCaptureDue: true })
    usePoseStore.getState()[action]()
    const s = usePoseStore.getState()
    expect(s.saveStep).toBeNull()
    expect(s.saveCaptureDue).toBe(false)
  })

  it('setFocusMode räumt saveStep auf', () => {
    usePoseStore.setState({ saveStep: SNAPSHOT, saveCaptureDue: true })
    usePoseStore.getState().setFocusMode('wrist')
    expect(usePoseStore.getState().saveStep).toBeNull()
  })
})
