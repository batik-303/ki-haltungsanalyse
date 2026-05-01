## Context

The Violin MVP uses a canvas overlay with CSS `scale-x-[-1]` mirroring. Current Flow-mode anchors are rendered at canvas x=50 (appearing on the right of the screen). The session tracker already handles zone counting and return-glow detection. IndexedDB persistence exists via `session-db.ts` with a `StoredSession` interface. The Zustand store uses a flat structure with `updateFrame()` for per-frame data.

## Goals / Non-Goals

**Goals:**
- Move Flow-mode anchor to left screen side (all instrument modes)
- Implement streak timer that rewards sustained good posture through visual anchor growth
- Persist personal best streak across sessions
- Reduce HUD visual noise during flow state

**Non-Goals:**
- Points or rewards system (extrinsic gamification)
- Anti-cheat / hand-speed detection
- Streak display as large standalone numbers
- Any changes to Analyse mode positioning (body-anchored feedback stays)
- Streak logic for non-violin modes (extend later)

## Decisions

### 1. Flow Anchor Position: Canvas Right Edge → Screen Left

Render Flow-mode anchors at `width - 50` instead of `50` on canvas. CSS mirror flips it to screen-left. Same approach used for the wrist side-view fix.

**Alternative**: Disable CSS mirror and flip coordinates in renderer — rejected, too many call sites to change.

### 2. Streak as Closure State in Session Tracker

Add streak counting directly into `createSessionTracker()` alongside the existing return-glow logic. Both share the same tension thresholds and frame-by-frame update pattern.

- `streakSeconds`: accumulates while `tension < 5`
- `graceTimer`: 500ms countdown before reset
- `maxStreak`: session-high watermark

**Alternative**: Separate `createStreakTracker()` — rejected, would duplicate tension threshold logic and require a second `recordFrame` call.

### 3. Streak Visual via Anchor Glow, Not Text

Pass `streakSeconds` to `drawSapphireAnchor()`. The anchor grows its pulse radius and glow intensity proportionally. A small `12px` numeric readout below the anchor shows seconds, but the primary channel is the anchor itself.

**Alternative**: Large countdown display — rejected per project UI principles (canvas is primary feedback, not text).

### 4. Tension Threshold for Streak: `< 5` (not `== 0`)

MediaPipe noise makes exact zero impossible. Threshold of 5 maps to "flow" layer in the layer classifier, maintaining consistency.

### 5. Personal Best in Existing StoredSession

Add `maxFlowStreak` field to `StoredSession` interface. Query max across all sessions for personal best rather than storing a separate global record. Avoids schema migration complexity.

**Alternative**: Dedicated `personalBest` IndexedDB store — rejected, over-engineered for a single number.

### 6. HUD Fade: CSS Transition on Session Screen

Apply `opacity: 0.2` with `transition-opacity duration-700` to HUD container divs when `tensionScore < 5`. Driven by React state from store selector. Simple CSS, no canvas involvement.

## Risks / Trade-offs

- **[Streak feels too easy]** → Threshold of 5 may be generous. Can be tuned later via sensitivity presets without structural changes.
- **[Grace period too short]** → 500ms may reset during legitimate bow changes. If users report frustration, increase to 800ms.
- **[IndexedDB query for personal best]** → Scanning all sessions for max streak could be slow with 1000+ sessions. Acceptable for MVP; add an index later if needed.
- **[Anchor glow scaling]** → Need to cap the visual growth to avoid the anchor becoming distracting at long streaks. Cap at ~60s visual scale.
