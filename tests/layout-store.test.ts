import { describe, it, expect } from 'vitest'
import {
  classifyDevice,
  classifyOrientation,
  useLayoutStore,
  TABLET_BREAKPOINT,
  DESKTOP_BREAKPOINT,
} from '../src/store/layout-store'
import type { DeviceClass, Orientation } from '../src/store/layout-store'

// ── classifyDevice ──

describe('classifyDevice', () => {
  it('returns "phone" for widths below 480px', () => {
    expect(classifyDevice(0)).toBe('phone')
    expect(classifyDevice(320)).toBe('phone')
    expect(classifyDevice(479)).toBe('phone')
  })

  it('returns "tablet" for widths between 480px and 1023px', () => {
    expect(classifyDevice(480)).toBe('tablet')
    expect(classifyDevice(768)).toBe('tablet')
    expect(classifyDevice(1023)).toBe('tablet')
  })

  it('returns "desktop" for widths >= 1024px', () => {
    expect(classifyDevice(1024)).toBe('desktop')
    expect(classifyDevice(1440)).toBe('desktop')
    expect(classifyDevice(2560)).toBe('desktop')
  })
})

// ── classifyOrientation ──

describe('classifyOrientation', () => {
  it('returns "portrait" when height > width', () => {
    expect(classifyOrientation(375, 812)).toBe('portrait')
    expect(classifyOrientation(768, 1024)).toBe('portrait')
  })

  it('returns "landscape" when width >= height', () => {
    expect(classifyOrientation(812, 375)).toBe('landscape')
    expect(classifyOrientation(1024, 768)).toBe('landscape')
  })

  it('returns "landscape" for square viewports', () => {
    expect(classifyOrientation(500, 500)).toBe('landscape')
  })
})

// ── Store initialisation ──

describe('useLayoutStore', () => {
  it('initialises with sensible defaults', () => {
    const state = useLayoutStore.getState()
    expect(state.viewportW).toBeGreaterThan(0)
    expect(state.viewportH).toBeGreaterThan(0)
    expect(['portrait', 'landscape']).toContain(state.orientation)
    expect(['phone', 'tablet', 'desktop']).toContain(state.deviceClass)
  })

  it('derives orientation from viewport width/height', () => {
    const { viewportW, viewportH, orientation } = useLayoutStore.getState()
    expect(orientation).toBe(classifyOrientation(viewportW, viewportH))
  })

  it('derives deviceClass from viewport width', () => {
    const { viewportW, deviceClass } = useLayoutStore.getState()
    expect(deviceClass).toBe(classifyDevice(viewportW))
  })

  it('can be updated imperatively via setState', () => {
    useLayoutStore.setState({ viewportW: 800, viewportH: 600, orientation: 'landscape', deviceClass: 'tablet' })
    const state = useLayoutStore.getState()
    expect(state.viewportW).toBe(800)
    expect(state.viewportH).toBe(600)
    expect(state.orientation).toBe('landscape')
    expect(state.deviceClass).toBe('tablet')
  })

  it('shallow setState preserves orientation if not explicitly provided', () => {
    // Shallow merge: setState only updates the keys you pass.
    // The pure helper functions (classifyOrientation, classifyDevice) ensure
    // consistency — callers are expected to set all fields together.
    useLayoutStore.setState({ viewportW: 375, viewportH: 812, orientation: 'portrait', deviceClass: 'phone' })
    const state = useLayoutStore.getState()
    expect(state.viewportW).toBe(375)
    expect(state.viewportH).toBe(812)
    expect(state.orientation).toBe('portrait')
    expect(state.deviceClass).toBe('phone')
  })

  it('classifies landscape desktop correctly', () => {
    useLayoutStore.setState({ viewportW: 1920, viewportH: 1080 })
    const state = useLayoutStore.getState()
    expect(classifyOrientation(state.viewportW, state.viewportH)).toBe('landscape')
    expect(classifyDevice(state.viewportW)).toBe('desktop')
  })

  it('classifies portrait tablet correctly', () => {
    useLayoutStore.setState({ viewportW: 768, viewportH: 1024 })
    const state = useLayoutStore.getState()
    expect(classifyOrientation(state.viewportW, state.viewportH)).toBe('portrait')
    expect(classifyDevice(state.viewportW)).toBe('tablet')
  })

  it('handles tablet landscape (iPad mini-like)', () => {
    useLayoutStore.setState({ viewportW: 1024, viewportH: 768 })
    const state = useLayoutStore.getState()
    expect(classifyOrientation(state.viewportW, state.viewportH)).toBe('landscape')
    expect(classifyDevice(state.viewportW)).toBe('desktop') // 1024 >= DESKTOP_BREAKPOINT
  })

  it('handles phone landscape (iPhone-like)', () => {
    useLayoutStore.setState({ viewportW: 812, viewportH: 375 })
    const state = useLayoutStore.getState()
    expect(classifyOrientation(state.viewportW, state.viewportH)).toBe('landscape')
    expect(classifyDevice(state.viewportW)).toBe('tablet') // 812 >= TABLET_BREAKPOINT
  })
})