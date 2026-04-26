import { usePoseStore } from '../store/pose-store'
import { cn } from '../lib/utils'

export function DistanceIndicator() {
  const distanceOk = usePoseStore((s) => s.distanceOk)
  const masterPrint = usePoseStore((s) => s.masterPrint)

  // Only show before calibration
  if (masterPrint) return null

  return (
    <div
      className={cn(
        'absolute bottom-3 left-1/2 -translate-x-1/2 z-[5] px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        distanceOk
          ? 'bg-success/20 text-success border border-success/30'
          : 'bg-destructive/20 text-destructive border border-destructive/30',
      )}
    >
      {distanceOk ? '✓ Abstand OK' : '↔ Abstand anpassen'}
    </div>
  )
}
