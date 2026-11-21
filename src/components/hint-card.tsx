import { cn } from '@/lib/utils'
import { DISTANCE_GLOW_COLORS, type DistanceGlowTone } from '@/core/calibration/distance-glow'

const PRIMARY = '#002b49'

interface HintCardProps {
  /** Farbe des Punkts — dieselbe wie das Randglühen (#115). */
  tone: DistanceGlowTone
  message: string
  /** Optionale kleine zweite Zeile (z. B. bei „Abstand passt", #116). */
  detail?: string
  /**
   * `top` = allein oben mittig im Rahmen. `stack` = im Stapel oben (`HintStack`,
   * #215): Gerät-Kärtchen und Abstand untereinander, nie überdeckt.
   */
  placement?: 'top' | 'stack'
  /** #147: `true` = nach rechts aus dem Bild geglitten (Zustand in Ordnung). */
  away?: boolean
  /** #215: antippbar (z. B. Sensor-Frage auf iOS); sonst lässt das Kärtchen Tipps durch. */
  onTap?: () => void
}

/**
 * Ruhiges Kärtchen oben mittig im Rahmen (#114) mit Punkt in Glühfarbe (#115).
 * Gemeinsame Optik für Abstands- und Bereitschafts-Hinweis. Bewusst als
 * DOM-Element — der Canvas ist gespiegelt, Text darauf wäre unleserlich.
 *
 * #147: groß (24 px), damit es aus Spiel-Entfernung lesbar ist.
 */
export function HintCard({ tone, message, detail, placement = 'top', away = false, onTap }: HintCardProps) {
  const color = DISTANCE_GLOW_COLORS[tone]
  const Inner = onTap ? 'button' : 'div'

  return (
    <div
      className={cn(
        onTap ? 'pointer-events-auto' : 'pointer-events-none',
        'transition-[transform,opacity] duration-700 ease-in-out',
        placement === 'top'
          ? 'absolute left-1/2 top-3 z-[6] w-max max-w-[calc(100%-24px)]'
          : 'relative w-max max-w-full',
      )}
      // #147: weggleiten nach rechts aus dem Bild (der Rahmen schneidet ab)
      style={{
        transform: away ? 'translateX(100vw)' : placement === 'top' ? 'translateX(-50%)' : 'none',
        opacity: away ? 0 : 1,
      }}
    >
      <Inner
        {...(onTap && { type: 'button' as const, onClick: onTap })}
        className="inline-flex items-center gap-3.5 rounded-2xl text-left bg-white/90 px-6 py-3 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px ${color}33` }}
        />
        <span className="flex flex-col" style={{ color: PRIMARY }}>
          <span className="font-label text-[24px] font-semibold leading-tight">{message}</span>
          {detail && <span className="font-label text-[16px] leading-snug opacity-80">{detail}</span>}
        </span>
      </Inner>
    </div>
  )
}
