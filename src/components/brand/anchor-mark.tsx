import { useId } from 'react'
import {
  ANCHOR_MARK_VIEWBOX,
  computeAnchorMarkGeometry,
} from '@/core/brand/anchor-geometry'
import { cn } from '@/lib/utils'

// Blue-Anchor-Marke als reines Inline-SVG (Variante „Aufwärts", #48):
// leuchtender Ankerpunkt (Notenkopf) + gerader, senkrechter „Weg" (Steg/Hals).
// Ersetzt bewusst das elastische Gummiband (#37/#41). Scharf auf jeder Größe;
// die größenabhängige Geometrie kommt aus der reinen Funktion in core/brand.

const MUSIK = ['M', 'U', 'S', 'I', 'C'] as const

interface AnchorMarkProps {
  /** Renderbreite in px (Höhe folgt dem viewBox-Verhältnis). Steuert auch die
   *  Favicon-Feinheiten (≤32px: dickerer Steg, kleinerer Glow, kein Glanzlicht). */
  size?: number
  /** Zugänglicher Name; ohne Wert wird die Marke als dekorativ (aria-hidden) markiert. */
  title?: string
  className?: string
}

/** Solo-Marke (Icon/Favicon-tauglich). */
export function AnchorMark({ size = 40, title, className }: AnchorMarkProps) {
  const uid = useId().replace(/:/g, '')
  const dotId = `dot-${uid}`
  const glowId = `glow-${uid}`
  const { steg, stegStrokeWidth, dot, glowStdDeviation, showHighlight } =
    computeAnchorMarkGeometry(size)

  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox={ANCHOR_MARK_VIEWBOX}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {/* Notenkopf: weißer Kern → Sky → Sapphire → Deep (Logo-Glow, kein Token). */}
        <radialGradient id={dotId} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="75%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        {/* Sapphire-Halo als weicher Glow. */}
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={glowStdDeviation} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo (leuchtet). */}
      <circle
        cx={dot.cx}
        cy={dot.cy}
        r={dot.r + 8}
        fill="rgba(56,189,248,0.4)"
        filter={`url(#${glowId})`}
      />
      {/* Der „Weg" (Hals): gerader, senkrechter Steg aus dem Punkt heraus. */}
      <line
        x1={steg.x1}
        y1={steg.y1}
        x2={steg.x2}
        y2={steg.y2}
        stroke="#0284c7"
        strokeWidth={stegStrokeWidth}
        strokeLinecap="round"
      />
      {/* Ankerpunkt (Notenkopf). */}
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={`url(#${dotId})`} />
      {/* Weißes Glanzlicht oben links — nur bei ausreichender Größe. */}
      {showHighlight && (
        <circle cx={dot.cx - 8} cy={dot.cy - 8} r={6} fill="#ffffff" opacity="0.85" />
      )}
    </svg>
  )
}

interface AnchorLockupProps {
  /** Renderbreite der Marke in px. */
  markSize?: number
  className?: string
}

/**
 * Horizontales Lockup (#48): Marke links, daneben die Wortmarke „BLUE ANCHOR"
 * über gesperrtem „M U S I C". „Willkommen bei" entfällt (Karten-Entscheidung Q5).
 * Marke bleibt farbgleich; die Wortmarke folgt den Theme-Tokens.
 */
export function AnchorLockup({ markSize = 40, className }: AnchorLockupProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <AnchorMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span className="font-headline text-2xl font-extrabold uppercase leading-none tracking-wider text-foreground">
          Blue Anchor
        </span>
        {/* „M U S I C": gesperrt auf Wortmarken-Breite (justify-between). */}
        <span
          aria-hidden
          className="mt-0.5 flex justify-between font-label text-[10px] font-bold uppercase leading-none text-muted-foreground"
        >
          {MUSIK.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </span>
        <span className="sr-only">Music</span>
      </span>
    </div>
  )
}
