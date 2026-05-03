## Why

The current 5-second decay timer in wrist mode provides no immediate feedback when the player corrects their posture — there's a dead zone of silence between "rail repaired" and the golden flash 5 seconds later. The golden flash fires on the hand line instead of the anchor point (where the player's attention is), and once the flash fires the timer resets to zero with no cumulative sense of progress. Players need instant acknowledgment when they fix their posture, progressive rewards that grow with sustained effort, and a persistent score that carries across sessions so every practice minute counts.

## What Changes

- **Freeze-Timer replaces Decay-Timer**: When the player deviates, the hold timer freezes (pauses) instead of decaying. No progress is lost — the timer simply waits for the player to return.
- **Progressive milestone ladder**: The hold timer targets escalate: 3s → 5s → 10s → 15s → 15s (steady state). Each milestone triggers a golden flash on the sapphire anchor.
- **Golden flash moves to anchor**: The golden flash effect fires on the sapphire anchor point, not on the hand/rail line. Both main overlay and side-view.
- **Cumulative milestone counter**: Milestones earned in a session are counted. The total across all sessions is persisted in IndexedDB and never resets.
- **Results screen shows milestones**: Two new stats — session milestones and all-time total — displayed alongside existing metrics.
- **Mode-agnostic**: The hold-milestone system uses the existing `repaired` signal from `session-tracker`, making it work for both violin and wrist modes.

## Capabilities

### New Capabilities
- `hold-milestones`: Progressive freeze-timer with milestone ladder (3s→5s→10s→15s), cumulative point tracking across sessions via IDB, and golden anchor flash on each milestone

### Modified Capabilities
- `wrist-rail-challenge`: Timer changes from decay to freeze; progressive targets replace fixed 5s target; golden flash moves from line to anchor
- `wrist-visual-feedback`: Golden flash renders on sapphire anchor instead of hand line

## Impact

- `src/core/analysis/wrist-analyzer.ts` — `createWristRailTimer` rewritten (freeze + progressive)
- `src/core/session/session-tracker.ts` — new `holdMilestones` counter using `repaired` signal
- `src/core/persistence/session-db.ts` — new `total-hold-milestones` key in IDB
- `src/core/types.ts` — `SessionStats` and `StoredSession` extended
- `src/store/pose-store.ts` — new state fields for milestone level and count
- `src/rendering/wrist-lines.ts` — remove golden flash on hand line
- `src/rendering/canvas-renderer.ts` — golden flash on anchor for both modes
- `src/rendering/wrist-side-view.ts` — golden flash on anchor (already partially there)
- `src/components/screens/results-screen.tsx` — two new stat rows
- `tests/wrist-rail.test.ts` — update timer tests for freeze + progressive behavior
