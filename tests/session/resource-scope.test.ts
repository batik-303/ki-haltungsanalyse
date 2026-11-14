import { describe, it, expect, vi } from 'vitest'
import { createResourceScope } from '../../src/core/session/resource-scope'

// #192: Beim Neu-Kalibrieren wird der Kamera-Bildschirm kurz doppelt
// eingehängt und wieder abgebaut, während Modelle noch laden. Was nach dem
// Abbau fertig wird, muss sofort freigegeben werden; was vorher fertig war,
// beim Abbau genau einmal.
describe('createResourceScope', () => {
  it('gibt beim Abbau alles frei, was vorher übernommen wurde', () => {
    const scope = createResourceScope()
    const closeModel = vi.fn()
    const stopStream = vi.fn()
    expect(scope.adopt('modell', closeModel)).toBe('modell')
    expect(scope.adopt('stream', stopStream)).toBe('stream')

    scope.dispose()

    expect(closeModel).toHaveBeenCalledWith('modell')
    expect(stopStream).toHaveBeenCalledWith('stream')
  })

  it('gibt eine Ressource, die erst nach dem Abbau fertig wird, sofort frei', () => {
    const scope = createResourceScope()
    scope.dispose()
    const closeModel = vi.fn()

    expect(scope.adopt('spätes-modell', closeModel)).toBeNull()
    expect(closeModel).toHaveBeenCalledTimes(1)
  })

  it('gibt jede Ressource nur einmal frei, auch bei doppeltem Abbau', () => {
    const scope = createResourceScope()
    const closeModel = vi.fn()
    scope.adopt('modell', closeModel)

    scope.dispose()
    scope.dispose()

    expect(closeModel).toHaveBeenCalledTimes(1)
  })

  it('meldet, ob der Bereich abgebaut ist', () => {
    const scope = createResourceScope()
    expect(scope.isDisposed()).toBe(false)
    scope.dispose()
    expect(scope.isDisposed()).toBe(true)
  })

  it('gibt weiter frei, auch wenn eine Freigabe scheitert', () => {
    const scope = createResourceScope()
    const stopStream = vi.fn()
    scope.adopt('modell', () => { throw new Error('schon zu') })
    scope.adopt('stream', stopStream)

    expect(() => scope.dispose()).not.toThrow()
    expect(stopStream).toHaveBeenCalledTimes(1)
  })
})
