import { DISTANCE_GLOW_COLORS, type DistanceGlowTone } from '@/core/calibration/distance-glow'

const PRIMARY = '#002b49'

interface HintCardProps {
  /** Farbe des Punkts — dieselbe wie das Randglühen (#115). */
  tone: DistanceGlowTone
  message: string
  /** Optionale kleine zweite Zeile (z. B. bei „Abstand passt", #116). */
  detail?: string
}

/**
 * Ruhiges Kärtchen oben mittig im Rahmen (#114) mit Punkt in Glühfarbe (#115).
 * Gemeinsame Optik für Abstands- und Bereitschafts-Hinweis. Bewusst als
 * DOM-Element — der Canvas ist gespiegelt, Text darauf wäre unleserlich.
 */
export function HintCard({ tone, message, detail }: HintCardProps) {
  const color = DISTANCE_GLOW_COLORS[tone]

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[6] w-max max-w-[calc(100%-24px)]">
      <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/90 px-4 py-2 shadow-[0_4px_16px_rgba(0,43,73,0.18)] backdrop-blur">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px ${color}33` }}
        />
        <span className="flex flex-col" style={{ color: PRIMARY }}>
          <span className="font-label text-[13px] font-semibold">{message}</span>
          {detail && <span className="font-label text-[11px] opacity-80">{detail}</span>}
        </span>
      </div>
    </div>
  )
}
