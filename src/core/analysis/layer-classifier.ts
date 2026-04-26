import type { FocusMode, Layer, LayerInfo } from '../types'

interface LayerConfig {
  threshold: number
  layer: Layer
  labels: Record<FocusMode, string>
  messages: Record<FocusMode, string | ((dir?: number) => string)>
  statusType: 'good' | 'yellow' | 'purple'
}

const LAYER_CONFIGS: LayerConfig[] = [
  {
    threshold: 15,
    layer: 'flow',
    labels: {
      shoulder: 'Frei',
      wrist: 'Flow',
      violin: 'Anker',
    },
    messages: {
      shoulder: 'Raum ist offen – weiter so.',
      wrist: 'Handgelenk gerade – perfekt!',
      violin: 'Geige im Anker – weiter so!',
    },
    statusType: 'good',
  },
  {
    threshold: 50,
    layer: 'bewusst',
    labels: {
      shoulder: 'Enger',
      wrist: 'Bewusst',
      violin: 'Drift',
    },
    messages: {
      shoulder: 'Raum wird kleiner...',
      wrist: 'Handgelenk knickt...',
      violin: (dir) => dir === 1 ? 'Geige sinkt leicht...' : 'Geige etwas hoch...',
    },
    statusType: 'yellow',
  },
  {
    threshold: 75,
    layer: 'achtung',
    labels: {
      shoulder: 'Eng',
      wrist: 'Achtung',
      violin: 'Achtung',
    },
    messages: {
      shoulder: 'Schulter lösen...',
      wrist: 'Handgelenk lösen...',
      violin: (dir) => dir === 1 ? 'Geige sinkt ab!' : 'Geige zu hoch!',
    },
    statusType: 'purple',
  },
  {
    threshold: Infinity,
    layer: 'limit',
    labels: {
      shoulder: 'Gepresst',
      wrist: 'Limit',
      violin: 'Limit',
    },
    messages: {
      shoulder: 'Raum freigeben!',
      wrist: 'Zurück zum Anker!',
      violin: 'Zurück zum Anker!',
    },
    statusType: 'purple',
  },
]

/**
 * Classify a tension score into a layer with mode-specific labels and messages.
 */
export function classifyLayer(
  tensionScore: number,
  focusMode: FocusMode,
  driftDirection?: number,
): LayerInfo {
  for (const config of LAYER_CONFIGS) {
    if (tensionScore < config.threshold) {
      const messageOrFn = config.messages[focusMode]
      const statusMessage = typeof messageOrFn === 'function'
        ? messageOrFn(driftDirection)
        : messageOrFn

      return {
        layer: config.layer,
        label: config.labels[focusMode],
        statusMessage,
        statusType: config.statusType,
      }
    }
  }

  // Fallback (shouldn't reach)
  const last = LAYER_CONFIGS[LAYER_CONFIGS.length - 1]!
  const msg = last.messages[focusMode]
  return {
    layer: 'limit',
    label: last.labels[focusMode],
    statusMessage: typeof msg === 'function' ? msg(driftDirection) : msg,
    statusType: 'purple',
  }
}
