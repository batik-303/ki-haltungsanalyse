/**
 * One-Euro Filter (Casiez et al. 2012)
 * Adaptive low-pass filter: smooth when still, responsive when moving fast.
 * 
 * @param minCutoff - Minimum cutoff frequency (Hz). Lower = smoother when still.
 * @param beta - Speed coefficient. Higher = less lag during fast movements.
 * @param dCutoff - Derivative cutoff frequency (Hz). Typically 1.0.
 */
export function createOneEuroFilter(minCutoff: number, beta: number, dCutoff: number) {
  let xPrev: number | null = null
  let dxPrev = 0
  let tPrev: number | null = null

  function smoothingFactor(te: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * te
    return r / (r + 1)
  }

  return function filter(x: number, t: number): number {
    if (tPrev === null || xPrev === null) {
      xPrev = x
      tPrev = t
      return x
    }

    const te = t - tPrev
    if (te <= 0) return xPrev

    // Smooth the derivative
    const aD = smoothingFactor(te, dCutoff)
    const dx = (x - xPrev) / te
    const dxSmooth = aD * dx + (1 - aD) * dxPrev

    // Adaptive cutoff: fast movement → higher cutoff → less smoothing
    const cutoff = minCutoff + beta * Math.abs(dxSmooth)
    const a = smoothingFactor(te, cutoff)
    const xFiltered = a * x + (1 - a) * xPrev

    xPrev = xFiltered
    dxPrev = dxSmooth
    tPrev = t

    return xFiltered
  }
}
