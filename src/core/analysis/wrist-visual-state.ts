/**
 * Wrist visual state machine with sigmoid color mapping.
 * Three states: silent (<=4°), warning (4-8°), correction (>8°).
 * Sigmoid easing provides soft-then-firm escalation feel.
 */

// ── Visual State Constants ──
export const WRIST_SILENT_THRESHOLD = 4    // degrees: below this = silent
export const WRIST_WARNING_PEAK = 7        // degrees: sigmoid midpoint for warning
export const WRIST_CORRECTION_THRESHOLD = 8 // degrees: above this = full correction

export type WristVisualState = 'silent' | 'warning' | 'correction'

/**
 * Classify current effective angle into a visual state.
 */
export function classifyWristVisualState(effectiveAngleDeg: number): WristVisualState {
  if (effectiveAngleDeg <= WRIST_SILENT_THRESHOLD) return 'silent'
  if (effectiveAngleDeg <= WRIST_CORRECTION_THRESHOLD) return 'warning'
  return 'correction'
}

/**
 * Sigmoid easing function for smooth color transitions.
 * Returns 0..1 where the S-curve ramps slowly near edges, fast in center.
 * @param x - input value
 * @param midpoint - center of the sigmoid (where output = 0.5)
 * @param steepness - how sharp the transition is (higher = sharper)
 */
export function sigmoid(x: number, midpoint: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (x - midpoint)))
}

/**
 * Compute sigmoid-based color intensity for wrist deviation.
 * Returns 0..1 representing interpolation from blue toward warning/correction.
 * - Near 4°: close to 0 (subtle)
 * - Around 6-7°: ramps rapidly
 * - Above 8°: close to 1 (saturated)
 */
export function computeWristColorIntensity(effectiveAngleDeg: number): number {
  if (effectiveAngleDeg <= WRIST_SILENT_THRESHOLD) return 0
  // Sigmoid centered at 6° with steepness of 1.5
  // Maps ~4° → ~0.05, ~6° → ~0.5, ~8° → ~0.95
  const raw = sigmoid(effectiveAngleDeg, 6, 1.5)
  return Math.min(1, Math.max(0, raw))
}

/**
 * Interpolate between two hex colors using a 0..1 factor.
 */
export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

// Named colors for wrist feedback
export const WRIST_COLOR_BLUE = '#5b9bd5'
export const WRIST_COLOR_YELLOW = '#F5C842'
export const WRIST_COLOR_LILAC = '#9B59B6'

/**
 * Get the wrist deviation color based on sigmoid intensity.
 * - 0..0.6 intensity: blue → yellow
 * - 0.6..1.0 intensity: yellow → lilac
 */
export function getWristDeviationColor(intensity: number): string {
  if (intensity <= 0) return WRIST_COLOR_BLUE
  if (intensity <= 0.6) {
    // Blue → Yellow in first 60% of intensity
    return lerpColor(WRIST_COLOR_BLUE, WRIST_COLOR_YELLOW, intensity / 0.6)
  }
  // Yellow → Lilac in remaining 40%
  return lerpColor(WRIST_COLOR_YELLOW, WRIST_COLOR_LILAC, (intensity - 0.6) / 0.4)
}

// ── Asymmetric Damping (high memory buildup, fast decay) ──

/**
 * Create an asymmetric EMA filter for wrist visual presentation.
 * - Buildup (angle rising): very heavy smoothing (alpha ~0.05 → EMA memory ~0.95)
 * - Decay (angle falling): faster response (alpha ~0.25) for rewarding repair feel
 */
export function createWristVisualDamping() {
  let smoothed = 0

  return function update(rawAngle: number): number {
    const alpha = rawAngle > smoothed ? 0.05 : 0.25
    smoothed = smoothed * (1 - alpha) + rawAngle * alpha
    // Clamp very small values to zero for visual stillness
    if (smoothed < 0.5) smoothed = 0
    return smoothed
  }
}

// ── Z-Boost Configuration ──
export const Z_BOOST_MULTIPLIER_DEFAULT = 1.5
export const Z_BOOST_MULTIPLIER_SAFE = 1.2
