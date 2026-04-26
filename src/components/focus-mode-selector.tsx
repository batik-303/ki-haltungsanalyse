import { usePoseStore } from '../store/pose-store'
import type { FocusMode } from '../core/types'
import { cn } from '../lib/utils'

const MODES: { value: FocusMode; label: string; icon: string }[] = [
  { value: 'violin', label: 'Geige', icon: '🎻' },
  { value: 'wrist', label: 'Handgelenk', icon: '🤚' },
  { value: 'shoulder', label: 'Schulter', icon: '💪' },
]

export function FocusModeSelector() {
  const focusMode = usePoseStore((s) => s.focusMode)
  const setFocusMode = usePoseStore((s) => s.setFocusMode)

  return (
    <div className="flex gap-2">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setFocusMode(mode.value)}
          className={cn(
            'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
            focusMode === mode.value
              ? 'bg-sapphire/20 border-sapphire/50 text-sapphire-light'
              : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50',
          )}
        >
          {mode.icon} {mode.label}
        </button>
      ))}
    </div>
  )
}
