import { useId } from 'react'
import {
  ANCHOR_MARK_VIEWBOX,
  computeAnchorMarkGeometry,
} from '@/core/brand/anchor-geometry'
import { cn } from '@/lib/utils'

// Blue-Anchor-Marke als reines Inline-SVG (Variante „Gummiband", #37/#39):
// leuchtender Ankerpunkt (Notenkopf) + zentrierter, elastischer „Weg" (Hals).
// Scharf auf jeder Größe; Farben fix in Hell wie Dunkel (Sapphire #2196F3).
// Die größenabhängige Geometrie kommt aus der reinen Funktion in core/brand.

interface AnchorMarkProps {
  /** Renderbreite in px (Höhe folgt dem viewBox-Verhältnis). Steuert auch die
   *  Favicon-Feinheiten (≤32px: dezentere Krümmung, dickerer Hals). */
  size?: number
  /** Zugänglicher Name; ohne Wert wird die Marke als dekorativ (aria-hidden) markiert. */
  title?: string
  className?: string
}

/** Solo-Marke (Icon/Favicon-tauglich). */
export function AnchorMark({ size = 96, title, className }: AnchorMarkProps) {
  const uid = useId().replace(/:/g, '')
  const dotId = `dot-${uid}`
  const glowId = `glow-${uid}`
  const { neckPath, neckStrokeWidth, glowStdDeviation, showHighlight } =
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
        {/* Notenkopf: weißer Kern → Sapphire-Light → Sapphire-Deep. */}
        <radialGradient id={dotId} cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#64b5f6" />
          <stop offset="100%" stopColor="#1565c0" />
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
      <circle cx="60" cy="112" r="30" fill="rgba(33,150,243,0.4)" filter={`url(#${glowId})`} />
      {/* Der „Weg" (Hals): zentriert, elastisch aus dem Punkt heraus. */}
      <path
        d={neckPath}
        fill="none"
        stroke="#2196f3"
        strokeWidth={neckStrokeWidth}
        strokeLinecap="round"
      />
      {/* Ankerpunkt (Notenkopf). */}
      <circle cx="60" cy="112" r="22" fill={`url(#${dotId})`} />
      {/* Weißes Glanzlicht oben links — nur bei ausreichender Größe. */}
      {showHighlight && <circle cx="52" cy="104" r="6" fill="#ffffff" opacity="0.85" />}
    </svg>
  )
}

interface AnchorLockupProps {
  /** Renderbreite der Marke in px. */
  markSize?: number
  className?: string
}

/**
 * Voll-Lockup: Marke über der Wortmarke „Willkommen bei" / „Blue Anchor Music",
 * zentriert gestapelt (Home). Marke bleibt farbgleich; die Wortmarke folgt den
 * Theme-Tokens, „Anchor" in Sapphire.
 */
export function AnchorLockup({ markSize = 72, className }: AnchorLockupProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <AnchorMark size={markSize} />
      <div className="flex flex-col items-center">
        <span className="font-label text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Willkommen bei
        </span>
        <span className="font-headline text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          Blue <span className="text-sapphire">Anchor</span>
        </span>
        <span className="font-headline text-sm font-medium tracking-wide text-muted-foreground">
          Music
        </span>
      </div>
    </div>
  )
}
