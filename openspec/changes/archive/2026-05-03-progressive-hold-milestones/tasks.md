## 1. Core Timer Refactor

- [x] 1.1 Rewrite `createWristRailTimer()` in `src/core/analysis/wrist-analyzer.ts`: freeze on deviation (no decay), accept milestone ladder array `[3, 5, 10, 15]`, advance target on success, repeat last value on exhaustion. Return `{ timerValue, success, successGlow, milestoneLevel, currentTarget }`.
- [x] 1.2 Update `createWristRailTimer()` call site in `src/hooks/use-pose-detection.ts` to pass milestone ladder and handle new return shape.
- [x] 1.3 Update tests in `tests/wrist-rail.test.ts`: replace decay tests with freeze tests, add progressive ladder tests (3→5→10→15→15), add milestone level tracking tests.

## 2. Session Tracker Milestones

- [x] 2.1 Add `holdMilestones` counter to `createSessionTracker()` in `src/core/session/session-tracker.ts`. Increment on `success` flag from hold timer. Include in `SessionStats` via `stop()`.
- [x] 2.2 Extend `SessionStats` and `StoredSession` in `src/core/types.ts` with `holdMilestones: number` and `bestMilestoneLevel: number`.
- [x] 2.3 Pass hold timer `success` flag through `recordFrame()` in session tracker (add `holdSuccess?: boolean` parameter).
- [x] 2.4 Wire `success` from hold timer in `use-pose-detection.ts` → `sessionTracker.recordFrame()`.

## 3. IDB Persistence

- [x] 3.1 Add `getTotalHoldMilestones()` and `addHoldMilestones(count)` functions to `src/core/persistence/session-db.ts` using `idb-keyval` with key `total-hold-milestones`.
- [x] 3.2 Call `addHoldMilestones()` in session save flow (in `session-screen.tsx` or session-tracker stop path).

## 4. Golden Flash: Anchor Only

- [x] 4.1 Remove golden flash on hand line (section 4) from `drawWristLines()` in `src/rendering/wrist-lines.ts`.
- [x] 4.2 Verify golden flash on sapphire anchor in `src/rendering/canvas-renderer.ts` works for both flow and analyse mode (already exists — confirm no changes needed).
- [x] 4.3 Verify golden flash on side-view anchor in `src/rendering/wrist-side-view.ts` (already exists — confirm no changes needed).

## 5. Store Updates

- [x] 5.1 Add `holdMilestoneLevel: number` to `PoseState` and `FrameUpdate` in `src/store/pose-store.ts` (tracks current ladder position for potential future HUD use). Add default `0` and spread in `updateFrame()`.

## 6. Results Screen

- [x] 6.1 Add "Haltungs-Meilensteine" stat row (session count) to `src/components/screens/results-screen.tsx`.
- [x] 6.2 Add "Gesamt-Meilensteine" stat row (IDB total) to results screen, loaded via `getTotalHoldMilestones()` in a `useEffect`.

## 7. Manual Testing

- [ ] 7.1 Wrist mode: verify timer freezes on deviation (not decay), golden flash on anchor at 3s milestone.
- [ ] 7.2 Wrist mode: verify progressive ladder (3→5→10→15) and steady state at 15s.
- [ ] 7.3 Wrist mode: verify no golden flash on hand line.
- [ ] 7.4 Violin mode: verify milestones fire when posture is maintained.
- [ ] 7.5 Results screen: verify session milestones and total milestones display correctly across multiple sessions.
