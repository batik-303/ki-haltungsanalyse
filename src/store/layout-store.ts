import { create } from 'zustand'

// ── Layout Types ──

export type Orientation = 'portrait' | 'landscape'

export type DeviceClass = 'phone' | 'tablet' | 'desktop'

export interface LayoutState {
  /** Current screen orientation via `screen.orientation` or fallback matchMedia */
  orientation: Orientation
  /** Device class derived from viewport width breakpoints */
  deviceClass: DeviceClass
  /** Current viewport width (px) */
  viewportW: number
  /** Current viewport height (px) */
  viewportH: number
}

// ── Breakpoints ──

/** Width ≥ this value → tablet (below = phone) */
export const TABLET_BREAKPOINT = 480
/** Width ≥ this value → desktop (below = tablet) */
export const DESKTOP_BREAKPOINT = 1024

// ── Helpers (pure, exported for testing) ──

/** Derive device class from viewport width alone. */
export function classifyDevice(width: number): DeviceClass {
  if (width >= DESKTOP_BREAKPOINT) return 'desktop'
  if (width >= TABLET_BREAKPOINT) return 'tablet'
  return 'phone'
}

/** Derive orientation from width/height ratio. Pure fallback. */
export function classifyOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait'
}

// ── Initial values (safe SSR / prerender defaults) ──

function getInitialState(): LayoutState {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  return {
    orientation: classifyOrientation(w, h),
    deviceClass: classifyDevice(w),
    viewportW: w,
    viewportH: h,
  }
}

// ── Store ──

export const useLayoutStore = create<LayoutState>(() => getInitialState())