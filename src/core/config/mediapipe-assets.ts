// Pfade zu den MediaPipe-Dateien. Alles liegt auf der eigenen Domain,
// keine Anfrage an jsDelivr oder Google (DSGVO, #175).

/** Ordner der WASM-Dateien; die Version im Pfad sorgt beim Update für frische Dateien. */
export function mediapipeWasmPath(version: string): string {
  return `/mediapipe/wasm/${version}`
}

/** Pose-Modell (Apache 2.0), liegt in `public/models/`. */
export const POSE_MODEL_PATH =
  '/models/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

/** Hand-Modell (Apache 2.0), liegt in `public/models/`. */
export const HAND_MODEL_PATH =
  '/models/hand_landmarker/float16/1/hand_landmarker.task'
