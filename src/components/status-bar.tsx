import { usePoseStore } from '../store/pose-store'
import { selectStatusColor, selectStatusMessage } from '../store/selectors'
import { cn } from '../lib/utils'

export function StatusBar() {
  const color = usePoseStore(selectStatusColor)
  const message = usePoseStore(selectStatusMessage)
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const tensionScore = usePoseStore((s) => s.tensionScore)

  if (!masterPrint) return null

  return (
    <div
      className={cn(
        'px-5 py-2 rounded-xl border text-sm font-medium transition-all shadow-lg',
        'bg-background/80 backdrop-blur',
      )}
      style={{
        borderColor: color,
        color,
        boxShadow: `0 0 15px ${color}33`,
      }}
    >
      {message} — Spannung: {Math.round(tensionScore)}%
    </div>
  )
}
