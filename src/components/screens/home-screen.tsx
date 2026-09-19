import { usePoseStore } from '@/store/pose-store'
import { FOCUS_MODES } from '@/core/config/focus-modes'
import { INSTRUMENTS } from '@/core/config/instruments'
import { AnchorLockup } from '@/components/brand/anchor-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Check, EyeOff } from 'lucide-react'

// Home = Auswahlbühne im Stitch-Layout „Willkommen & Ausrichtung" (#49,
// Referenz docs/design/design.md). Struktur aus dem Stitch-Entwurf, Farben
// und Fonts weiter aus den bestehenden Token (ADR 0001) — keine neuen Token.
// Instrument + Fokus werden hier markiert; der Gold-CTA startet den bestehenden
// Session-/Kalibrier-Flow (enterSession, Bereitschafts-Tor #36) direkt.

// Home-lokaler Sky-Verlauf (kein Token — nur Home nutzt ihn, design.md §1).
const SKY_GRADIENT =
  'linear-gradient(to bottom, #E0F2FE 0%, #EDF7FF 50%, #F8FAFC 100%)'

// Gold-CTA-Verlauf aus der Gold-Dark-Familie (design.md §1/§4): Mittelton ist
// das bestehende Token --color-gold-dark (#B8860B); die helleren/dunkleren
// Verlauf-Enden sind Home-lokale Stitch-Töne ohne Token-Entsprechung. Dunkle
// Schrift (--ui-accent-foreground) erfüllt AA (#29).
const CTA_GRADIENT =
  'linear-gradient(180deg, #C99718 0%, var(--color-gold-dark) 55%, #946905 100%)'

const ANTI_STRESS =
  'Im Spiel bleibt der Bildschirm dunkel für freien Blick auf die Noten.'

// Dunkler Haken-Kreis für die aktive Auswahl (design.md §4, --ui-primary).
function ActiveCheck() {
  return (
    <span
      className="grid size-7 flex-none place-items-center rounded-full bg-primary text-primary-foreground shadow-sm"
      aria-hidden
    >
      <Check className="size-4" strokeWidth={3} />
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-label text-xs font-bold uppercase tracking-wider text-foreground/60">
      {children}
    </h2>
  )
}

export function HomeScreen() {
  const focusMode = usePoseStore((s) => s.focusMode)
  const setFocusMode = usePoseStore((s) => s.setFocusMode)
  const enterSession = usePoseStore((s) => s.enterSession)

  return (
    <div className="min-h-screen text-foreground" style={{ background: SKY_GRADIENT }}>
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-4 pt-safe pb-safe">
        <h1 className="sr-only">Blue Anchor Music</h1>

        <main className="flex flex-1 flex-col gap-6 pt-8 pb-8">
          {/* Hero-Lockup: horizontales Lockup (Marke + Wortmarke), als Block
              zentriert (design.md §3.2/§3.3 „horizontal nebeneinander"). */}
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div aria-hidden>
              <AnchorLockup markSize={40} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Live-Haltungsanalyse für dein Instrument
            </p>
          </div>

          {/* 1. Instrument — eine Karte, als gewählt markiert (V1: nur Geige). */}
          <section className="space-y-3">
            <SectionLabel>1. Wähle dein Instrument</SectionLabel>
            {INSTRUMENTS.map((instrument) => (
              <div
                key={instrument.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <span
                  className="grid size-12 flex-none place-items-center rounded-xl bg-muted text-2xl"
                  aria-hidden
                >
                  {instrument.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{instrument.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {instrument.description}
                  </span>
                </span>
                <ActiveCheck />
              </div>
            ))}
          </section>

          {/* 2. Fokus — drei Modi bleiben wählbar (Q6, Analyzer-/Render-Dispatch). */}
          <section className="space-y-3">
            <SectionLabel>2. Wähle deinen Fokus</SectionLabel>
            <div className="space-y-3">
              {FOCUS_MODES.map((mode) => {
                const selected = focusMode === mode.value
                return (
                  <button
                    key={mode.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFocusMode(mode.value)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected ? 'border-primary' : 'border-border hover:border-primary/40',
                    )}
                  >
                    <span
                      className="grid size-12 flex-none place-items-center rounded-xl bg-secondary text-2xl"
                      aria-hidden
                    >
                      {mode.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{mode.label}</span>
                      <span className="block text-sm text-muted-foreground">
                        {mode.description}
                      </span>
                    </span>
                    {selected ? (
                      <ActiveCheck />
                    ) : (
                      <span
                        className="size-7 flex-none rounded-full border border-border"
                        aria-hidden
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Anti-Stress-Karte: halbtransparent + backdrop-blur (design.md §4).
              bg-card/70 dient zugleich als Fallback ohne backdrop-filter. */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
            <span
              className="grid size-11 flex-none place-items-center rounded-xl bg-sapphire-deep/10 text-sapphire-deep"
              aria-hidden
            >
              <EyeOff className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Anti-Stress-Garantie:</span>{' '}
              {ANTI_STRESS}
            </p>
          </div>
        </main>

        {/* Footer: Gold-CTA + Trust-Zeile (design.md §4). */}
        <footer className="space-y-3 pb-6">
          {/* Gold-CTA auf dem shadcn-Button-Primitive (Fokus-Ring/Press aus
              components.instructions.md); Gold-Verlauf via Inline-Style, der
              die Basis-`bg-primary`-Fläche überschreibt. */}
          <Button
            onClick={() => enterSession('violin')}
            style={{ background: CTA_GRADIENT, color: 'var(--ui-accent-foreground)' }}
            className="h-14 w-full gap-2 rounded-2xl text-base font-bold shadow-md hover:brightness-[1.04]"
          >
            Kamera starten &amp; Kalibrieren
            <ArrowRight className="size-5" />
          </Button>
          <p className="flex items-center justify-center gap-2 font-label text-xs text-foreground/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sapphire-deep" aria-hidden />
              Keine Registrierung nötig
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sapphire-deep" aria-hidden />
              Lokale KI-Erkennung
            </span>
          </p>
        </footer>
      </div>
    </div>
  )
}
