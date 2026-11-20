import { usePoseStore } from '@/store/pose-store'
import { useDeviceTiltHint } from '@/hooks/use-device-tilt-hint'
import { HintCard } from '@/components/hint-card'

/**
 * Kärtchen „Gerät steht gerade" vor der Kalibrierung (#210). Ruhiges Blau in
 * beiden Zuständen (Gelb gehört dem Handgelenk-Knick). Steht unter dem
 * Abstands-Kärtchen und hält nie fest: nach kurzer Zeit verschwindet es von
 * selbst. Ohne Sensor oder Erlaubnis erscheint nichts.
 */
export function DeviceTiltHint() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const readinessPhase = usePoseStore((s) => s.readinessPhase)
  const active = !masterPrint && readinessPhase === 'idle'
  const view = useDeviceTiltHint(active)

  if (view === 'hidden') return null

  return (
    <HintCard
      tone="blue"
      placement="below"
      message={view === 'level' ? 'Gerät steht gerade' : 'Gerät etwas aufrichten'}
    />
  )
}
