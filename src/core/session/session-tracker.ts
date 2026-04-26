import type { FocusMode, Layer, ZoneCounters, SessionStats, TensionTimelineEntry } from '../types'

// Return-to-anchor thresholds per mode
const ELEVATED_THRESHOLDS: Record<FocusMode, number> = {
  shoulder: 20,
  wrist: 30,
  violin: 15,
}

const REWARD_THRESHOLDS: Record<FocusMode, number> = {
  shoulder: 10,
  wrist: 8,
  violin: 8,
}

const GLOW_DURATION = 1.5 // seconds
const TIMELINE_INTERVAL = 1.0 // sample every 1 second

/**
 * Stateful session tracker. Handles zone counting and return-to-anchor events.
 */
export function createSessionTracker(focusMode: FocusMode) {
  let active = false
  let startTime = 0
  let totalFrames = 0
  let wasElevated = false
  let returnGlowTimer = 0
  let timelineClock = 0
  const zones: ZoneCounters = { flow: 0, bewusst: 0, achtung: 0, limit: 0 }
  const timeline: TensionTimelineEntry[] = []

  const elevatedThreshold = ELEVATED_THRESHOLDS[focusMode]
  const rewardThreshold = REWARD_THRESHOLDS[focusMode]

  return {
    start() {
      active = true
      startTime = performance.now()
      totalFrames = 0
      wasElevated = false
      returnGlowTimer = 0
      timelineClock = 0
      zones.flow = 0
      zones.bewusst = 0
      zones.achtung = 0
      zones.limit = 0
      timeline.length = 0
    },

    /**
     * Record one frame of data.
     * @param tensionScore - Current tension (0-100)
     * @param layer - Current classified layer
     * @param dt - Delta time in seconds since last frame
     * @returns The current return glow timer value
     */
    recordFrame(tensionScore: number, layer: Layer, dt: number): number {
      if (!active) return 0

      totalFrames++
      zones[layer]++

      // Timeline sampling at ~1Hz
      timelineClock += dt
      if (timelineClock >= TIMELINE_INTERVAL) {
        timelineClock -= TIMELINE_INTERVAL
        const t = Math.round((performance.now() - startTime) / 1000)
        timeline.push({ t, tension: Math.round(tensionScore), layer })
      }

      // Return-to-anchor detection
      if (tensionScore > elevatedThreshold) {
        wasElevated = true
      }
      if (wasElevated && tensionScore < rewardThreshold) {
        returnGlowTimer = GLOW_DURATION
        wasElevated = false
      }
      if (returnGlowTimer > 0) {
        returnGlowTimer -= dt
        if (returnGlowTimer < 0) returnGlowTimer = 0
      }

      return returnGlowTimer
    },

    stop(): SessionStats | null {
      if (!active || totalFrames < 30) {
        active = false
        return null
      }

      active = false
      const durationMs = performance.now() - startTime
      const total = zones.flow + zones.bewusst + zones.achtung + zones.limit

      const pct = (z: number) => total > 0 ? (z / total) * 100 : 0

      return {
        durationMs,
        durationMinutes: Math.floor(durationMs / 60000),
        durationSeconds: Math.floor((durationMs % 60000) / 1000),
        totalFrames,
        zones: { ...zones },
        zonePercentages: {
          flow: pct(zones.flow),
          bewusst: pct(zones.bewusst),
          achtung: pct(zones.achtung),
          limit: pct(zones.limit),
        },
        tensionTimeline: [...timeline],
      }
    },

    get isActive() {
      return active
    },

    get glowTimer() {
      return returnGlowTimer
    },
  }
}
