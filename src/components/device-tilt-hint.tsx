import type { DeviceTiltView } from '@/core/calibration/device-tilt'
import { HintCard } from '@/components/hint-card'

/**
 * Kärtchen „Gerät steht gerade" vor der Kalibrierung (#210). Ruhiges Blau in
 * beiden Zuständen (Gelb gehört dem Handgelenk-Knick). Kommt zuerst, oben
 * mittig; der Abstands-Hinweis folgt darunter bzw. danach. Ohne Sensor oder
 * Erlaubnis erscheint nichts.
 */
export function DeviceTiltHint({ view }: { view: DeviceTiltView }) {
  if (view === 'hidden') return null

  return (
    <HintCard
      tone="blue"
      message={view === 'level' ? 'Gerät steht gerade' : 'Stell dein Gerät gerade und auf Augenhöhe auf.'}
    />
  )
}
