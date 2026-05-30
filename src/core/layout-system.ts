import { useLayoutStore, classifyDevice, classifyOrientation } from '../store/layout-store'

// ── CSS Custom Property keys ──

const PROP_W = '--viewport-w'
const PROP_H = '--viewport-h'
const PROP_ORIENTATION = '--viewport-orientation'
const PROP_DEVICE = '--viewport-device-class'

// ── Private mutable refs ──

let _cleanup: (() => void) | null = null
let _destroyed = false

// ── Internal helpers ──

function setCSSProps(w: number, h: number): void {
  const root = document.documentElement
  root.style.setProperty(PROP_W, `${w}`)
  root.style.setProperty(PROP_H, `${h}`)
}

function setOrientationProp(orientation: 'portrait' | 'landscape'): void {
  document.documentElement.style.setProperty(PROP_ORIENTATION, orientation)
}

function setDeviceClassProp(deviceClass: string): void {
  document.documentElement.style.setProperty(PROP_DEVICE, deviceClass)
}

function syncToStore(): void {
  if (_destroyed) return
  const w = window.innerWidth
  const h = window.innerHeight
  const orientation = classifyOrientation(w, h)
  const deviceClass = classifyDevice(w)
  useLayoutStore.setState({ viewportW: w, viewportH: h, orientation, deviceClass })
  setCSSProps(w, h)
  setOrientationProp(orientation)
  setDeviceClassProp(deviceClass)
}

// ── Public API ──

/**
 * Initialise the reactive layout system.
 *
 * Sets up matchMedia listeners for breakpoints and orientation,
 * syncs all values into `useLayoutStore`, and writes CSS custom
 * properties onto `:root`.
 *
 * React-free — call once before `createRoot()` in `main.tsx`.
 *
 * @returns A cleanup function that removes all listeners.
 */
export function initLayoutSystem(): () => void {
  _destroyed = false

  // Hydrate immediately (in case DOM is already painted)
  syncToStore()

  // ── Width breakpoint listeners ──
  const tabletMQ = window.matchMedia(`(min-width: 480px)`)
  const desktopMQ = window.matchMedia(`(min-width: 1024px)`)

  function onBreakpointChange(): void {
    syncToStore()
  }

  tabletMQ.addEventListener('change', onBreakpointChange)
  desktopMQ.addEventListener('change', onBreakpointChange)

  // ── Orientation listener ──
  const orientMQ = window.matchMedia('(orientation: portrait)')

  function onOrientationChange(): void {
    syncToStore()
  }

  orientMQ.addEventListener('change', onOrientationChange)

  // ── Fallback: window resize (handles cases matchMedia misses) ──
  function onResize(): void {
    syncToStore()
  }

  window.addEventListener('resize', onResize)

  // ── Cleanup ──
  _cleanup = () => {
    _destroyed = true
    tabletMQ.removeEventListener('change', onBreakpointChange)
    desktopMQ.removeEventListener('change', onBreakpointChange)
    orientMQ.removeEventListener('change', onOrientationChange)
    window.removeEventListener('resize', onResize)
    _cleanup = null
  }

  return _cleanup
}

/**
 * Tear down the layout system.
 * Same effect as calling the cleanup function returned by `initLayoutSystem()`.
 */
export function destroyLayoutSystem(): void {
  _cleanup?.()
}