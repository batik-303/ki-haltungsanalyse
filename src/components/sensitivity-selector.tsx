import { usePoseStore } from '../store/pose-store'
import type { SensitivityLevel } from '../core/types'
import { cn } from '../lib/utils'

const LEVELS: { value: SensitivityLevel; label: string }[] = [
  { value: 'low', label: 'Profi (locker)' },
  { value: 'med', label: 'Standard' },
  { value: 'high', label: 'Anfänger (streng)' },
]

export function SensitivitySelector() {
  const sensitivity = usePoseStore((s) => s.sensitivity)
  const setSensitivity = usePoseStore((s) => s.setSensitivity)

  return (
    <div className="flex gap-2">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => setSensitivity(level.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
            sensitivity === level.value
              ? 'bg-sapphire/20 border-sapphire/50 text-sapphire-light'
              : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50',
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}
