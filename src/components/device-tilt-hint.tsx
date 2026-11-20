import { computeDeviceTiltMessage, type DeviceTiltView } from '@/core/calibration/device-tilt'
import type { HintPresence } from '@/core/calibration/hint-presence'
import { HintCard } from '@/components/hint-card'

/**
 * Kärtchen „Gerät steht gerade" vor der Kalibrierung (#210). Ruhiges Blau in
 * beiden Zuständen (Gelb gehört dem Handgelenk-Knick). Kommt zuerst, oben
 * mittig; der Abstands-Hinweis folgt darunter bzw. danach. Ohne Sensor oder
 * Erlaubnis erscheint nichts.
 *
 * #147: Steht das Gerät gerade, gleitet das Kärtchen nach ≈ 1,5 s nach rechts
 * weg und kommt nur wieder, wenn das Gerät kippt.
 */
export function DeviceTiltHint({ view, presence }: { view: DeviceTiltView; presence: HintPresence }) {
  if (view === 'hidden') return null

  return (
    <HintCard
      tone="blue"
      message={computeDeviceTiltMessage(view)}
      away={presence === 'away'}
    />
  )
}
