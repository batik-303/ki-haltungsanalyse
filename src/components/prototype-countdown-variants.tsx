/**
 * PROTOTYP – Wegwerf-Code, nie nach main (#116, Frage 3).
 *
 * Frage: Wie sieht man den Countdown beim Speichern, ohne dass Text auf dem
 * Körper steht? Drei Varianten, umschaltbar über `?variant=a|b|c` und die
 * schwebende Leiste unten:
 *   a – Kärtchen oben mit großer Zahl + pulsierendes Randglühen
 *   b – Kärtchen oben nur Text + Randglühen + große Zahl in der Mitte
 *   c – wie b, aber die Zahl in der Mitte durchscheinend
 * (Runde 2: Ton fällt weg – passt nicht zur ruhigen Philosophie.)
 *
 * Ablauf (b′) ist nur nachgestellt: 2 s Lesezeit + 1 s „still halten“ laufen
 * hier fest ab (keine echte Ruhe-Erkennung), danach 3 – 2 – 1.
 */
import { useEffect, useState } from 'react'

export type PrototypeVariant = 'a' | 'b' | 'c'

const VARIANTS: PrototypeVariant[] = ['a', 'b', 'c']
const VARIANT_NAMES: Record<PrototypeVariant, string> = {
  a: 'Zahl im Kärtchen',
  b: 'Zahl in der Mitte',
  c: 'Zahl Mitte, durchscheinend',
}

const BLUE = '#2196F3'
const PRIMARY = '#002b49'

/** Gesamt-Sekunden des nachgestellten Ablaufs: 3 s Vorlauf + 3 – 2 – 1. */
export const PROTOTYPE_TOTAL_SECONDS = 6
const NUMBER_SECONDS = 3

export function readPrototypeVariant(): PrototypeVariant | null {
  const v = new URLSearchParams(window.location.search).get('variant')
  return v === 'a' || v === 'b' || v === 'c' ? v : null
}

export function PrototypeCountdownOverlay({ variant, remaining }: { variant: PrototypeVariant; remaining: number }) {
  const isNumber = remaining <= NUMBER_SECONDS
  const isReading = remaining > NUMBER_SECONDS + 1

  const numberInCard = variant === 'a'

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <PulsingGlow pulseKey={isNumber ? remaining : 0} pulsing={isNumber} />

      <div className="absolute top-[clamp(56px,9vh,88px)] left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-2xl bg-white/92 px-5 py-3 shadow-[0_4px_16px_rgba(0,43,73,0.25)] backdrop-blur">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: BLUE, boxShadow: `0 0 0 3px ${BLUE}33` }} />
          <div className="flex flex-col">
            <span className="font-headline text-lg font-bold leading-tight" style={{ color: PRIMARY }}>Halte still</span>
            <span className="text-sm text-neutral-600">
              {isReading ? 'gleich wird gespeichert' : isNumber ? 'wird gespeichert …' : 'gleich geht’s los'}
            </span>
          </div>
          {isNumber && numberInCard && (
            <span className="ml-3 font-headline text-6xl font-extrabold tabular-nums leading-none" style={{ color: BLUE }}>
              {remaining}
            </span>
          )}
        </div>
      </div>

      {isNumber && !numberInCard && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-headline font-extrabold tabular-nums leading-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{ color: BLUE, fontSize: 'clamp(96px, 26vw, 168px)', opacity: variant === 'c' ? 0.45 : 1 }}
          >
            {remaining}
          </span>
        </div>
      )}
    </div>
  )
}

function PulsingGlow({ pulseKey, pulsing }: { pulseKey: number; pulsing: boolean }) {
  const [strong, setStrong] = useState(false)

  // Jede neue Zahl: kurz kräftig, dann weich zurück auf den ruhigen Grundschein.
  useEffect(() => {
    if (!pulsing) return
    setStrong(true)
    const t = setTimeout(() => setStrong(false), 350)
    return () => clearTimeout(t)
  }, [pulseKey, pulsing])

  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        boxShadow: strong
          ? `inset 0 0 180px 48px ${BLUE}99, inset 0 0 60px 12px ${BLUE}77`
          : `inset 0 0 140px 28px ${BLUE}55, inset 0 0 48px 6px ${BLUE}3a`,
        transition: strong ? 'box-shadow 120ms ease-out' : 'box-shadow 600ms ease-in',
      }}
    />
  )
}

/** Schwebende Umschalt-Leiste (nur Prototyp). Pfeiltasten ← → schalten auch. */
export function PrototypeSwitcher({ variant, onChange }: { variant: PrototypeVariant; onChange: (v: PrototypeVariant) => void }) {
  const step = (dir: 1 | -1) => {
    const i = VARIANTS.indexOf(variant)
    const next = VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length] ?? 'a'
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    window.history.replaceState(null, '', url)
    onChange(next)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed top-2 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-fuchsia-700 px-2 py-1 text-xs font-bold text-white shadow-lg">
      <button className="px-2 py-1" onClick={() => step(-1)} aria-label="Vorherige Variante">◀</button>
      <span>PROTOTYP {variant.toUpperCase()} · {VARIANT_NAMES[variant]}</span>
      <button className="px-2 py-1" onClick={() => step(1)} aria-label="Nächste Variante">▶</button>
    </div>
  )
}
