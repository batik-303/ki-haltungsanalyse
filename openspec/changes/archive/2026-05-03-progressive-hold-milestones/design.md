## Context

The wrist-rail-challenge (archived 2026-05-02) introduced a 5-second decay timer with a golden flash on the hand line. Testing revealed three UX gaps: (1) no immediate feedback on posture correction, (2) the golden flash fires on the line instead of the anchor where attention sits, and (3) a fixed 5s target with hard reset feels unrewarding. The session tracker already tracks `repaired` state and `anchorPoints` (1 per 5s in deadzone), but these are mode-specific and not tied to progressive rewards.

The `flowStreak` (seconds with tension < 5) runs independently in the session tracker and is mode-agnostic. The new hold-milestone system runs **parallel** to flowStreak — both coexist in the results screen.

## Goals / Non-Goals

**Goals:**
- Replace decay timer with freeze timer (no progress lost on deviation)
- Progressive milestone ladder: 3s → 5s → 10s → 15s → 15s...
- Golden flash on sapphire anchor (not hand line) on each milestone
- Cumulative milestone count persisted in IDB across sessions (never resets)
- Results screen shows session milestones + all-time total
- Mode-agnostic: works for violin and wrist via existing `repaired` signal

**Non-Goals:**
- No HUD/score display during active session (only anchor flash)
- No replacement of flowStreak (runs in parallel)
- No gamification beyond milestone counter (no levels, badges, leaderboards)
- No change to the return-glow (sapphire glow on repair) — it stays as-is

## Decisions

### 1. Freeze instead of Decay

**Choice:** When the player deviates, the hold timer pauses (value unchanged). When they return, it resumes from where it stopped.

**Why:** Decay (3× multiplier) punishes wobbles disproportionately, especially at higher milestone targets (15s). Freeze is simpler to understand ("just stay in position") and the cumulative point system already means no single milestone is critical. The player is never "set back" — only paused.

**Alternatives considered:**
- Decay 1.5× with floor at 30%: More complex, still punitive
- Decay 3× (current): Too aggressive at longer milestones

### 2. Progressive milestone ladder in the timer factory

**Choice:** Refactor `createWristRailTimer()` to accept a milestone ladder `[3, 5, 10, 15]`. On each success, advance to the next target. After the ladder is exhausted, repeat the last value (15s steady state). The timer resets to 0 after each milestone.

**Why:** The factory function pattern (closure state) is already established. The ladder is a simple array — easy to tune later. Keeping the logic inside the timer factory means neither the hook nor the session tracker need to know about milestone progression.

**Return shape change:**
```ts
// Before
{ timerValue, success, successGlow }
// After
{ timerValue, success, successGlow, milestoneLevel, currentTarget }
```

### 3. Session tracker counts milestones

**Choice:** Add a `holdMilestones` counter to `createSessionTracker`. It increments whenever the hold timer fires `success`. The session tracker already receives `repaired` — it just needs to also receive the `success` flag from the timer.

**Why:** The session tracker is the single point for session stats. Counting here means the results screen gets milestones through the existing `stop()` → `SessionStats` flow.

### 4. IDB persistence via simple key

**Choice:** Store `total-hold-milestones` as a single `idb-keyval` key in the existing `blue-anchor` store. On session save, read current total, add session milestones, write back.

**Why:** No schema migration needed. A single atomic counter is simpler than summing across all stored sessions (which would require scanning all entries). The key is write-once-per-session — no concurrency issues.

### 5. Golden flash on anchor only

**Choice:** Remove the golden glow effect from `drawWristLines()` (section 4: "Golden flash on 5s challenge success"). Keep and enhance the golden flash on the sapphire anchor in `canvas-renderer.ts` (already exists for both flow and analyse mode). Keep the golden flash on the side-view anchor (already exists in `wrist-side-view.ts`).

**Why:** The anchor is the player's visual focus point. Flashing the line is peripheral noise. The anchor flash code already exists — we just remove the duplicate on the line.

### 6. Mode-agnostic via `repaired` signal

**Choice:** The hold-milestone timer runs inside the session tracker's `recordFrame()`, gated by the `repaired` parameter which is already passed by both violin and wrist hooks.

**Why:** Violin mode already passes `repaired` (from wristRepairStatus or equivalent deadzone check). No mode-specific branching needed. Both modes get milestones automatically.

**Note:** In violin mode, `repaired` reflects whether tension returned below threshold after being elevated. The progressive timer will reward sustained low-tension posture — which aligns with flow-streak but with milestone markers instead of continuous counting.

## Risks / Trade-offs

- **Freeze may feel too easy:** Players could wobble freely and still eventually hit 15s milestones → Mitigated by: the milestone itself isn't the point — it's the golden flash as positive reinforcement. "Too easy" milestones are better than frustrating ones for a pedagogical tool.
- **IDB counter can't decrease:** If a session is somehow invalid, milestones are still counted → Acceptable: the counter is motivational, not competitive. No need for correction.
- **Violin `repaired` semantics differ:** In violin mode, `repaired` means tension < threshold (hysteresis-gated), not angle-specific → Acceptable: the milestone system rewards sustained good posture regardless of measurement method.
- **Timer factory rewrite:** `createWristRailTimer` changes signature and behavior → Mitigated by: all call sites are in `use-pose-detection.ts` (1 location), and tests will be updated.
