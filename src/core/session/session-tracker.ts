import type { FocusMode, Layer, ZoneCounters, SessionStats, TensionTimelineEntry } from '../types'

// Return-to-anchor thresholds per mode
const ELEVATED_THRESHOLDS: Record<FocusMode, number> = {
  shoulder: 20,
  wrist: 20,
  violin: 15,
}

const REWARD_THRESHOLDS: Record<FocusMode, number> = {
  shoulder: 10,
  wrist: 8,
  violin: 8,
}

const GLOW_DURATION = 1.5 // seconds
const TIMELINE_INTERVAL = 1.0 // sample every 1 second
const STREAK_FLOW_THRESHOLD = 5 // tension below this counts as flow
const STREAK_GRACE_MS = 500 // ms before streak resets
const ELEVATED_MIN_DURATION = 0.3 // seconds — must stay elevated this long before glow can fire

/**
 * Stateful session tracker. Handles zone counting and return-to-anchor events.
 */
export function createSessionTracker(focusMode: FocusMode) {
  let active = false
  let startTime = 0
  let totalFrames = 0
  let wasElevated = false
  let elevatedDuration = 0 // how long tension has been above threshold
  let returnGlowTimer = 0
  let timelineClock = 0
  const zones: ZoneCounters = { flow: 0, bewusst: 0, achtung: 0, limit: 0 }
  const timeline: TensionTimelineEntry[] = []

  // Streak state
  let streakSeconds = 0
  let streakGraceTimer = 0
  let maxStreak = 0
  // Ankerpunkt-Logik
  let repairedTime = 0 // aufsummierte Zeit im reparierten Zustand (Sekunden)
  let wasRepaired = false

  const elevatedThreshold = ELEVATED_THRESHOLDS[focusMode]
  const rewardThreshold = REWARD_THRESHOLDS[focusMode]

  return {
    start() {
      active = true
      startTime = performance.now()
      totalFrames = 0
      wasElevated = false
      elevatedDuration = 0
      returnGlowTimer = 0
      timelineClock = 0
      streakSeconds = 0
      streakGraceTimer = 0
      maxStreak = 0
      zones.flow = 0
      zones.bewusst = 0
      zones.achtung = 0
      zones.limit = 0
      timeline.length = 0
    },

    /**
     * Record one frame of data.
     * Return-glow detection works even outside active session (pre-session exploration).
     * @param tensionScore - Current tension (0-100)
     * @param layer - Current classified layer
     * @param dt - Delta time in seconds since last frame
     * @returns The current return glow timer value
     */
    /**
     * @param tensionScore - Current tension (0-100)
     * @param layer - Current classified layer
     * @param dt - Delta time in seconds since last frame
     * @param repaired - Aktueller Reparaturstatus (true = in Deadzone)
     */
    recordFrame(tensionScore: number, layer: Layer, dt: number, repaired?: boolean): { glowTimer: number; streakSeconds: number; maxStreak: number } {
      // Ankerpunkt-Zeit aufsummieren
      if (repaired) {
        repairedTime += dt
        wasRepaired = true
      } else {
        wasRepaired = false
      }

      // Return-to-anchor detection (always active for immediate feedback)
      // Requires sustained elevation (300ms) to prevent noise-triggered glows
      if (tensionScore > elevatedThreshold) {
        elevatedDuration += dt
        if (elevatedDuration >= ELEVATED_MIN_DURATION) {
          wasElevated = true
        }
      } else {
        elevatedDuration = 0
      }
      if (wasElevated && tensionScore < rewardThreshold) {
        returnGlowTimer = GLOW_DURATION
        wasElevated = false
      }
      if (returnGlowTimer > 0) {
        returnGlowTimer -= dt
        if (returnGlowTimer < 0) returnGlowTimer = 0
      }

      // Streak logic (always active)
      if (tensionScore < STREAK_FLOW_THRESHOLD) {
        // In flow — increment streak, reset grace timer
        streakSeconds += dt
        streakGraceTimer = 0
        if (streakSeconds > maxStreak) maxStreak = streakSeconds
      } else {
        // Tension elevated — start/continue grace period
        if (streakSeconds > 0) {
          streakGraceTimer += dt * 1000 // convert to ms
          if (streakGraceTimer > STREAK_GRACE_MS) {
            streakSeconds = 0
            streakGraceTimer = 0
          }
        }
      }

      if (!active) return { glowTimer: returnGlowTimer, streakSeconds, maxStreak }

      totalFrames++
      zones[layer]++

      // Timeline sampling at ~1Hz
      timelineClock += dt
      if (timelineClock >= TIMELINE_INTERVAL) {
        timelineClock -= TIMELINE_INTERVAL
        const t = Math.round((performance.now() - startTime) / 1000)
        timeline.push({ t, tension: Math.round(tensionScore), layer })
      }

      return { glowTimer: returnGlowTimer, streakSeconds, maxStreak }
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

      // Ankerpunkte: 1 Punkt pro 5 Sekunden im reparierten Zustand
      const anchorPoints = Math.floor(repairedTime / 5)
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
        maxFlowStreak: maxStreak,
        anchorPoints,
        repairedTime: Math.round(repairedTime),
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
