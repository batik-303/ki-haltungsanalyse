import { usePoseStore } from '../store/pose-store'
import { selectSessionDuration } from '../store/selectors'

export function SessionStats() {
  const sessionActive = usePoseStore((s) => s.sessionActive)
  const zones = usePoseStore((s) => s.sessionZones)
  const lastStats = usePoseStore((s) => s.lastSessionStats)
  const duration = usePoseStore(selectSessionDuration)

  // Show live zones during session, or last stats after session
  const z = lastStats ? lastStats.zones : zones
  if (!sessionActive && !lastStats) return null

  const total = z.flow + z.bewusst + z.achtung + z.limit
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <div className="w-[640px] rounded-xl border border-border bg-card/50 backdrop-blur p-4 text-sm text-muted-foreground">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs uppercase tracking-wider">Session</span>
        <span className="text-xs tabular-nums">{duration}</span>
      </div>
      <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-secondary/30">
        <div className="bg-success rounded-l-full" style={{ width: `${pct(z.flow)}%` }} />
        <div className="bg-amber-400" style={{ width: `${pct(z.bewusst)}%` }} />
        <div className="bg-purple-500" style={{ width: `${pct(z.achtung)}%` }} />
        <div className="bg-red-500 rounded-r-full" style={{ width: `${pct(z.limit)}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-success">Flow {pct(z.flow)}%</span>
        <span className="text-amber-400">Bewusst {pct(z.bewusst)}%</span>
        <span className="text-purple-400">Achtung {pct(z.achtung)}%</span>
        <span className="text-red-400">Limit {pct(z.limit)}%</span>
      </div>
    </div>
  )
}
