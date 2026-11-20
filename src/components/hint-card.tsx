import { cn } from '@/lib/utils'
import { DISTANCE_GLOW_COLORS, type DistanceGlowTone } from '@/core/calibration/distance-glow'

const PRIMARY = '#002b49'

interface HintCardProps {
  /** Farbe des Punkts — dieselbe wie das Randglühen (#115). */
  tone: DistanceGlowTone
  message: string
  /** Optionale kleine zweite Zeile (z. B. bei „Abstand passt", #116). */
  detail?: string
  /** `below` = zweite Zeile unter dem oberen Kärtchen (Gerät-gerade-Hinweis, #210). */
  placement?: 'top' | 'below'
  /** #147: `true` = nach rechts aus dem Bild geglitten (Zustand in Ordnung). */
  away?: boolean
}

/**
 * Ruhiges Kärtchen oben mittig im Rahmen (#114) mit Punkt in Glühfarbe (#115).
 * Gemeinsame Optik für Abstands- und Bereitschafts-Hinweis. Bewusst als
 * DOM-Element — der Canvas ist gespiegelt, Text darauf wäre unleserlich.
 *
 * #147: groß (24 px), damit es aus Spiel-Entfernung lesbar ist.
 */
export function HintCard({ tone, message, detail, placement = 'top', away = false }: HintCardProps) {
  const color = DISTANCE_GLOW_COLORS[tone]

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 z-[6] w-max max-w-[calc(100%-24px)]',
        'transition-[transform,opacity,top] duration-700 ease-in-out',
        placement === 'top' ? 'top-3' : 'top-[84px]',
      )}
      // #147: weggleiten nach rechts aus dem Bild (der Rahmen schneidet ab)
      style={{ transform: away ? 'translateX(100vw)' : 'translateX(-50%)', opacity: away ? 0 : 1 }}
    >
      <div className="inline-flex items-center gap-3.5 rounded-2xl bg-white/90 px-6 py-3 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px ${color}33` }}
        />
        <span className="flex flex-col" style={{ color: PRIMARY }}>
          <span className="font-label text-[24px] font-semibold leading-tight">{message}</span>
          {detail && <span className="font-label text-[16px] leading-snug opacity-80">{detail}</span>}
        </span>
      </div>
    </div>
  )
}
