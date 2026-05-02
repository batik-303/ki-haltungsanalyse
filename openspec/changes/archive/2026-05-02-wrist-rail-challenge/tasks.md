## 1. Core Analysis: 2D Collinearity + Z-Boost

- [x] 1.1 Add `computeCollinearityAngle2D(elbow, wrist, mcp)` function to `src/core/analysis/wrist-analyzer.ts` — returns angle deviation (0° = straight) using only x,y coordinates
- [x] 1.2 Add `computeZBoost(angleDiff2D, zMcp, zWrist, threshold, boostDeg)` function — returns boosted angleDiff when 2D < 3° and z-delta exceeds threshold
- [x] 1.3 Add `smoothDirection2D(prevDir, currentDir, alpha)` utility — lerp + normalize for forearm direction vector smoothing
- [x] 1.4 Write tests for `computeCollinearityAngle2D`: straight line → 0°, 90° bend → 90°, collinear opposite → 180°
- [x] 1.5 Write tests for `computeZBoost`: no boost when 2D > 3°, boost applied when 2D < 3° and z exceeds threshold
- [x] 1.6 Write tests for `smoothDirection2D`: convergence within 10 frames, stability under jitter

## 2. Decay Timer

- [x] 2.1 Add `createWristRailTimer(durationTarget, decayMultiplier)` factory function to `src/core/analysis/wrist-analyzer.ts` — returns closure with `update(isStraight, dt)` returning `{ timerValue, success, successGlow }`
- [x] 2.2 Implement golden glow decay (600ms) inside the timer closure — `successGlow` field tracks flash intensity after success event
- [x] 2.3 Write tests: timer rises at +dt, decays at -3×dt, clamps to 0, fires success at 5s, resets after success, brief deviation is recoverable

## 3. Detection Hook Integration

- [x] 3.1 In `use-pose-detection.ts`, replace `analyzeWrist()` call with `computeCollinearityAngle2D()` + `computeZBoost()` for primary measurement
- [x] 3.2 Add forearm direction smoothing state (`useRef`) using `smoothDirection2D()` — pass smoothed direction to store for rendering
- [x] 3.3 Instantiate `createWristRailTimer()` via `useRef`, call `update()` each frame, push `timerValue` + `successGlow` to store
- [x] 3.4 Add `smoothedRailDir`, `railTimerValue`, `railSuccessGlow` fields to store via `updateFrame()`

## 4. Rail Rendering (Analyse Mode)

- [x] 4.1 Rewrite `src/rendering/wrist-lines.ts`: always draw forearm extension line (grey, α=0.3, 2-3px) from wrist backward along smoothed direction × 0.5 × forearm length
- [x] 4.2 Draw hand segment: blue solid line from wrist toward MCP when within deadzone, yellow dashed when outside deadzone (intensity scales with deviation)
- [x] 4.3 Draw perpendicular indicator: thin dotted line from MCP to nearest point on rail axis when deviation exceeds deadzone
- [x] 4.4 Integrate golden flash on anchor: when `railSuccessGlow > 0`, render golden glow (#FFD700) on sapphire anchor, decaying over 600ms

## 5. Side-View Update

- [x] 5.1 Modify `src/rendering/wrist-side-view.ts` to always render arm + hand lines (not only on deviation)
- [x] 5.2 Show straight blue arm+hand lines in correct state, angled yellow hand line on deviation (existing asymmetric lerp preserved)
- [x] 5.3 Add golden flash to side-view anchor synchronized with `railSuccessGlow`

## 6. Canvas Renderer Wiring

- [x] 6.1 Update wrist section in `src/rendering/canvas-renderer.ts` to read `smoothedRailDir`, `railTimerValue`, `railSuccessGlow` from store
- [x] 6.2 Pass rail direction and timer state to `drawWristLines()` and `drawWristSideView()`
- [x] 6.3 Ensure rail is NOT drawn in flow mode (anchor-only behavior preserved)

## 7. Store + Types

- [x] 7.1 Add `smoothedRailDir`, `railTimerValue`, `railSuccessGlow` to PoseState in `src/store/pose-store.ts`
- [x] 7.2 Add `calib2DAngle` to `WristMasterPrint` in `src/core/types.ts` (backward-compatible optional field)

## 8. Integration Testing

- [ ] 8.1 Manual test: verify rail line visible immediately after calibration, follows arm during position changes
- [ ] 8.2 Manual test: bend wrist toward scroll → yellow break line appears instantly, return → rail heals + anchor glow
- [ ] 8.3 Manual test: bend wrist toward neck → break line appears (z-boost if 2D insufficient), tune Z_THRESHOLD
- [ ] 8.4 Manual test: hold straight for 5s → golden flash, verify timer decay on brief wobble is forgiving
- [ ] 8.5 Manual test: side-view shows alignment at all times, synchronized with main overlay
