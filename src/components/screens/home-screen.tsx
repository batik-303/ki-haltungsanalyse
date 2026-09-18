import { usePoseStore } from '@/store/pose-store'
import { FOCUS_MODES } from '@/core/config/focus-modes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Home = Auswahlbühne (Variante A „Zentrierte Karten-Bühne", Ticket #26).
// Instrument + Fokus werden hier markiert; der CTA startet die Übung direkt
// (kein Setup-Zwischenschritt, Kalibrierung läuft im Session-Screen).

const INSTRUMENT = {
  name: 'Violine',
  icon: '🎻',
  description: 'Haltungsanalyse für Geiger',
} as const

const ANTI_STRESS =
  'Anti-Stress-Garantie · kein Rot, keine Fehler — nur ruhige Hinweise zurück in die gute Haltung.'

export function HomeScreen() {
  const focusMode = usePoseStore((s) => s.focusMode)
  const setFocusMode = usePoseStore((s) => s.setFocusMode)
  const enterSession = usePoseStore((s) => s.enterSession)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-16 gap-12">
      <header className="text-center space-y-3 max-w-xl">
        {/* ⚓ ist Platzhalter — echtes Blue-Anchor-Music-Logo folgt später */}
        <div className="text-5xl" aria-hidden>
          ⚓
        </div>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">
          Willkommen bei Blue&nbsp;Anchor&nbsp;Music
        </h1>
        <p className="text-lg text-muted-foreground">Live-Haltungsanalyse für dein Instrument</p>
      </header>

      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-secondary-foreground">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
        <span className="font-label">{ANTI_STRESS}</span>
      </div>

      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-3">
          <h2 className="font-label text-xs uppercase tracking-widest text-muted-foreground">
            Instrument
          </h2>
          {/* Aktuell nur ein Instrument — als gewählt markiert dargestellt */}
          <div className="w-full rounded-xl border border-primary bg-secondary/40 p-6 flex items-center gap-5">
            <span className="text-4xl" aria-hidden>
              {INSTRUMENT.icon}
            </span>
            <span>
              <span className="block text-lg font-semibold">{INSTRUMENT.name}</span>
              <span className="block text-sm text-muted-foreground">{INSTRUMENT.description}</span>
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-label text-xs uppercase tracking-widest text-muted-foreground">
            Fokus
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {FOCUS_MODES.map((mode) => {
              const selected = focusMode === mode.value
              return (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFocusMode(mode.value)}
                  className={cn(
                    'rounded-xl border p-5 text-center transition',
                    selected
                      ? 'border-primary bg-secondary/40 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary hover:bg-secondary/40',
                  )}
                >
                  <div className="text-3xl mb-2" aria-hidden>
                    {mode.icon}
                  </div>
                  <div className="font-semibold">{mode.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => enterSession('violin')}
        >
          Übung starten
        </Button>
      </section>
    </div>
  )
}
