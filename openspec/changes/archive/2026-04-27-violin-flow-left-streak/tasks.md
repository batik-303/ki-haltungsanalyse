## 1. Flow Anchor Left-Side Positioning

- [x] 1.1 In `canvas-renderer.ts`, change all Flow-mode anchor x-coordinates from `50` to `width - 50` for shoulder, wrist, and violin focusModes
- [x] 1.2 Move the wrist foreshortening warning x-position to `width - 50` in Flow mode
- [x] 1.3 Verify GoldenBand renders correctly with the shifted anchor position

## 2. Streak Timer in Session Tracker

- [x] 2.1 Add `streakSeconds`, `graceTimer`, `maxStreak` closure state to `createSessionTracker()`
- [x] 2.2 Implement streak increment logic: accumulate `dt` when `tensionScore < 5`
- [x] 2.3 Implement grace period: freeze streak when tension rises, start 500ms countdown
- [x] 2.4 Implement streak reset: clear `streakSeconds` when grace timer expires
- [x] 2.5 Track `maxStreak` watermark across the session
- [x] 2.6 Return `streakSeconds` and `maxStreak` from `recordFrame()` and include in `SessionStats`

## 3. Store & Types

- [x] 3.1 Add `flowStreak` and `maxFlowStreak` fields to `PoseState` in `pose-store.ts`
- [x] 3.2 Add `streakSeconds` and `maxStreak` to `FrameUpdate` interface
- [x] 3.3 Add `maxFlowStreak` to `SessionStats` and `StoredSession` types in `types.ts`
- [x] 3.4 Update `updateFrame` in the store to write streak values

## 4. Streak Visual Feedback

- [x] 4.1 Pass `flowStreak` to `drawSapphireAnchor()` in Flow mode (add parameter)
- [x] 4.2 Scale anchor pulse radius proportionally: base + streak growth, capped at 60s
- [x] 4.3 Intensify anchor glow opacity/radius based on streak duration
- [x] 4.4 Add small numeric readout (12px, low opacity) below anchor showing streak seconds

## 5. Personal Best Persistence

- [x] 5.1 Add `maxFlowStreak` field to `StoredSession` save in `session-screen.tsx`
- [x] 5.2 Create `getPersonalBestStreak()` query function in `session-db.ts`
- [x] 5.3 On session end, compare session `maxStreak` with stored personal best
- [x] 5.4 If new record: trigger gold flash on results screen

## 6. HUD Flow Fade

- [x] 6.1 Add `hudFaded` derived state based on sustained low tension (< 5 for 2s)
- [x] 6.2 Apply CSS `opacity` transition to HUD container divs in `session-screen.tsx`
- [x] 6.3 Ensure HUD stays at full opacity during calibration and pre-session phases
