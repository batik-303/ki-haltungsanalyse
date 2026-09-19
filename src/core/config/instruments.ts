import type { InstrumentMeta } from '../types'

/**
 * Geteilte Instrumente der Auswahlbühne (Home-Screen). Konkrete Instanzen des
 * zentralen `InstrumentMeta` (src/core/types.ts). Reihenfolge ist die
 * Anzeigereihenfolge der Karten. V1 kennt nur die Geige; die Struktur trägt
 * spätere Instrumente (z. B. Cello) ohne Umbau der Karte.
 */
export const INSTRUMENTS: readonly InstrumentMeta[] = [
  {
    id: 'violin',
    name: 'Geige / Violine',
    icon: '🎻',
    description: 'Haltungsanalyse für Geiger',
    modes: ['violin', 'wrist', 'shoulder'],
  },
] as const
