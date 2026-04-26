import { usePoseStore } from '../store/pose-store'
import { classifyLayer } from '../core/analysis/layer-classifier'

export function InfoPanel() {
  const masterPrint = usePoseStore((s) => s.masterPrint)
  const focusMode = usePoseStore((s) => s.focusMode)
  const tensionScore = usePoseStore((s) => s.tensionScore)

  if (!masterPrint) return null

  const layerInfo = classifyLayer(tensionScore, focusMode)

  return (
    <div className="w-[640px] rounded-xl border border-border bg-card/50 backdrop-blur p-4 text-sm text-muted-foreground">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs uppercase tracking-wider">
          Schicht: <span className="text-foreground font-semibold">{layerInfo.label}</span>
        </span>
        <span className="text-xs">
          {Math.round(tensionScore)}%
        </span>
      </div>
      {layerInfo.statusMessage && (
        <p className="text-xs text-muted-foreground/80 leading-relaxed">{layerInfo.statusMessage}</p>
      )}
    </div>
  )
}
