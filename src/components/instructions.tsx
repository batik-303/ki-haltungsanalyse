import { usePoseStore } from '../store/pose-store'

const INSTRUCTIONS: Record<string, string[]> = {
  shoulder: [
    '1. Stelle dich so hin, dass Kopf und Schultern sichtbar sind',
    '2. Klicke "Kalibrieren" in deiner optimalen Haltung',
    '3. Der Raum zwischen Ohr und Schulter wird überwacht',
  ],
  wrist: [
    '1. Halte deinen linken Arm sichtbar vor die Kamera',
    '2. Klicke "Kalibrieren" mit geradem Handgelenk',
    '3. Abknicken nach vorne/hinten wird erkannt',
  ],
  violin: [
    '1. Nimm deine Spielhaltung ein (Geige am Kinn)',
    '2. Klicke "Kalibrieren" in deiner idealen Position',
    '3. Absinken und Anheben wird überwacht',
  ],
}

export function Instructions() {
  const focusMode = usePoseStore((s) => s.focusMode)
  const masterPrint = usePoseStore((s) => s.masterPrint)

  if (masterPrint) return null

  const steps = INSTRUCTIONS[focusMode] ?? []

  return (
    <div className="w-[640px] rounded-xl border border-border bg-card/50 backdrop-blur p-4 text-sm text-muted-foreground">
      <div className="text-xs uppercase tracking-wider mb-2">Anleitung</div>
      <ul className="space-y-1">
        {steps.map((step, i) => (
          <li key={i} className="text-xs leading-relaxed">{step}</li>
        ))}
      </ul>
    </div>
  )
}
