import type { FocusMode } from '../types'

/** Metadaten eines Fokusmodus für die Auswahlkarten. */
export interface FocusModeMeta {
  value: FocusMode
  label: string
  icon: string
  description: string
}

/**
 * Geteilte Fokusmodi der Auswahlbühne (Home-Screen). Reihenfolge ist die
 * Anzeigereihenfolge der Karten.
 */
export const FOCUS_MODES: readonly FocusModeMeta[] = [
  { value: 'violin', label: 'Geige', icon: '🎻', description: 'Gesamte Spielhaltung' },
  { value: 'wrist', label: 'Handgelenk', icon: '🤚', description: 'Fokus auf Handgelenk' },
  { value: 'shoulder', label: 'Schulter', icon: '💪', description: 'Fokus auf Schultern' },
] as const
