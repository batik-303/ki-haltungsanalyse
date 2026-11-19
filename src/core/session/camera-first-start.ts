import type { ResourceScope } from './resource-scope'

export interface CameraAndModelSources<Model, Stream> {
  loadModel: () => Promise<Model>
  releaseModel: (model: Model) => void
  openCamera: () => Promise<Stream>
  releaseCamera: (stream: Stream) => void
}

/**
 * Startet Kamera und Modell gleichzeitig (#145): Das Kamerabild erscheint
 * sofort, die Analyse beginnt, sobald das Modell fertig ist. Beides gehört zum
 * Bereich `scope` (#192): Wird er abgebaut, bevor etwas fertig ist, wird es
 * sofort freigegeben und als `null` geliefert.
 */
export function startCameraAndModel<Model, Stream>(
  scope: ResourceScope,
  sources: CameraAndModelSources<Model, Stream>,
): { camera: Promise<Stream | null>; model: Promise<Model | null> } {
  const camera = sources.openCamera().then((s) => scope.adopt(s, sources.releaseCamera))
  const model = sources.loadModel().then((m) => scope.adopt(m, sources.releaseModel))
  return { camera, model }
}
