import { usePoseStore } from '@/store/pose-store'
import type { SensitivityLevel } from '@/core/types'
import { FOCUS_MODES } from '@/core/config/focus-modes'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

const LEVELS: { value: SensitivityLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Profi (locker)', description: 'Mehr Spielraum' },
  { value: 'med', label: 'Standard', description: 'Ausgewogene Erkennung' },
  { value: 'high', label: 'Anfänger (streng)', description: 'Engere Überwachung' },
]

export function SetupScreen() {
  const goHome = usePoseStore((s) => s.goHome)
  const goToSession = usePoseStore((s) => s.goToSession)
  const selectedInstrument = usePoseStore((s) => s.selectedInstrument)
  const focusMode = usePoseStore((s) => s.focusMode)
  const setFocusMode = usePoseStore((s) => s.setFocusMode)
  const sensitivity = usePoseStore((s) => s.sensitivity)
  const setSensitivity = usePoseStore((s) => s.setSensitivity)

  const instrumentName = selectedInstrument === 'violin' ? 'Violine' : selectedInstrument

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 gap-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="sm" onClick={goHome}>
            <ArrowLeft className="size-4" />
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">🎻 {instrumentName}</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-6">Analysemodus wählen</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {FOCUS_MODES.map((mode) => (
            <Card
              key={mode.value}
              className={cn(
                'cursor-pointer transition-all',
                focusMode === mode.value
                  ? 'ring-2 ring-sapphire bg-sapphire/10'
                  : 'hover:ring-sapphire/30 hover:bg-card/80',
              )}
              onClick={() => setFocusMode(mode.value)}
            >
              <CardHeader>
                <div className="text-3xl mb-1">{mode.icon}</div>
                <CardTitle className="text-base text-foreground">{mode.label}</CardTitle>
                <CardDescription className="text-xs">{mode.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-4">Empfindlichkeit</h2>

        <RadioGroup
          value={sensitivity}
          onValueChange={(val) => setSensitivity(val as SensitivityLevel)}
          className="gap-3 mb-10"
        >
          {LEVELS.map((level) => (
            <label
              key={level.value}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer transition-all',
                sensitivity === level.value
                  ? 'border-sapphire/50 bg-sapphire/10'
                  : 'hover:border-border hover:bg-card/50',
              )}
            >
              <RadioGroupItem value={level.value} />
              <div>
                <div className="text-sm font-medium text-foreground">{level.label}</div>
                <div className="text-xs text-muted-foreground">{level.description}</div>
              </div>
            </label>
          ))}
        </RadioGroup>

        <Button
          className="w-full h-12 text-base font-semibold bg-sapphire hover:bg-sapphire-deep text-white"
          onClick={goToSession}
        >
          Session starten
        </Button>
      </div>
    </div>
  )
}
