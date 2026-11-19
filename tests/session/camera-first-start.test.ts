import { describe, it, expect, vi } from 'vitest'
import { createResourceScope } from '../../src/core/session/resource-scope'
import { startCameraAndModel } from '../../src/core/session/camera-first-start'

// #145: Ohne Bild denkt man, die App hängt. Die Kamera wird deshalb sofort
// angefordert, gleichzeitig mit dem Laden des Modells, statt erst danach.
// Der Schutz aus #192 bleibt: Wer die Seite während des Ladens verlässt,
// bekommt Kamera und Modell sauber freigegeben.

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('startCameraAndModel', () => {
  it('fordert die Kamera an, ohne auf das Modell zu warten', async () => {
    const scope = createResourceScope()
    const model = deferred<string>()
    const openCamera = vi.fn(() => Promise.resolve('stream'))

    const start = startCameraAndModel(scope, {
      loadModel: () => model.promise,
      releaseModel: vi.fn(),
      openCamera,
      releaseCamera: vi.fn(),
    })

    expect(openCamera).toHaveBeenCalledTimes(1)
    await expect(start.camera).resolves.toBe('stream')
    model.resolve('modell')
    await expect(start.model).resolves.toBe('modell')
  })

  it('gibt Kamera und Modell beim Abbau frei, auch wenn beide erst danach fertig werden', async () => {
    const scope = createResourceScope()
    const model = deferred<string>()
    const camera = deferred<string>()
    const releaseModel = vi.fn()
    const releaseCamera = vi.fn()

    const start = startCameraAndModel(scope, {
      loadModel: () => model.promise,
      releaseModel,
      openCamera: () => camera.promise,
      releaseCamera,
    })

    scope.dispose()
    camera.resolve('stream')
    model.resolve('modell')

    await expect(start.camera).resolves.toBeNull()
    await expect(start.model).resolves.toBeNull()
    expect(releaseCamera).toHaveBeenCalledWith('stream')
    expect(releaseModel).toHaveBeenCalledWith('modell')
  })

  it('stoppt eine schon laufende Kamera beim Abbau, während das Modell noch lädt', async () => {
    const scope = createResourceScope()
    const model = deferred<string>()
    const releaseCamera = vi.fn()

    const start = startCameraAndModel(scope, {
      loadModel: () => model.promise,
      releaseModel: vi.fn(),
      openCamera: () => Promise.resolve('stream'),
      releaseCamera,
    })

    await expect(start.camera).resolves.toBe('stream')
    scope.dispose()

    expect(releaseCamera).toHaveBeenCalledTimes(1)
    expect(releaseCamera).toHaveBeenCalledWith('stream')
  })

  it('lässt das Kamerabild laufen, wenn das Modell nicht lädt', async () => {
    const scope = createResourceScope()
    const releaseCamera = vi.fn()

    const start = startCameraAndModel(scope, {
      loadModel: () => Promise.reject(new Error('kein Modell')),
      releaseModel: vi.fn(),
      openCamera: () => Promise.resolve('stream'),
      releaseCamera,
    })

    await expect(start.camera).resolves.toBe('stream')
    await expect(start.model).rejects.toThrow('kein Modell')
    expect(releaseCamera).not.toHaveBeenCalled()
  })
})
