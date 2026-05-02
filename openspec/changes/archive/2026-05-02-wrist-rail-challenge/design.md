## Context

The wrist mode currently uses a 3D flexion-plane projection (forearm × gravity) to isolate wrist bend angle, with One-Euro-filtered z-values. This approach is fundamentally limited by MediaPipe's noisy z-axis data (±50% variance per frame on depth values), causing phantom triggers especially for bends toward the player's neck (primarily z-axis movement). The visual feedback only appears on deviation — the musician never sees what "straight" looks like, losing the pedagogical opportunity to build body awareness.

Current architecture: `wrist-analyzer.ts` computes 3D angle → `use-pose-detection.ts` smooths and feeds store → `canvas-renderer.ts` dispatches to `wrist-lines.ts` (deviation line) and `wrist-side-view.ts` (peripheral). The repair status uses a 200ms hard-reset hysteresis.

## Goals / Non-Goals

**Goals:**
- Stable, flicker-free rail visualization that follows the arm in real-time
- Visible "broken line" on wrist deviation in both directions (scroll + neck)
- Detection of neck-direction bends despite limited 2D visibility
- 5-second decay challenge that rewards sustained good posture
- Synchronized feedback in both analyse and peripheral side-view

**Non-Goals:**
- Changing the calibration flow (MasterPrint capture remains the same)
- Modifying the tension/layer system (tension still drives layers)
- Supporting flow-mode rail rendering (flow mode keeps current anchor-only approach)
- Measuring pronation/supination (wrist rotation around forearm axis)

## Decisions

### Decision 1: 2D collinearity as primary measurement

**Choice:** Measure wrist bend as the 2D angle at the wrist point in the triangle Elbow→Wrist→MCP, using only screen-space x,y coordinates.

**Rationale:** The z-axis is the dominant noise source in MediaPipe Pose. Both bend directions (scroll and neck) have a visible 2D component when the player faces the camera. A 2D angle is translation-invariant and does not depend on absolute depth.

**Alternative considered:** Keep 3D but increase z-filter strength. Rejected because stronger filtering (beta < 0.003) introduces unacceptable latency (>300ms) for reactive feedback, and z-noise at rest still causes phantom deviation.

**Formula:**
```
v_arm = Wrist_2d - Elbow_2d  (direction of forearm in screen space)
v_hand = MCP_2d - Wrist_2d   (direction of hand in screen space)

cos(θ) = dot(v_arm, v_hand) / (|v_arm| × |v_hand|)
angleDiff = θ  (0° = perfectly straight, 90° = right angle)
```

One-Euro filter applied to the 2D landmark positions (existing filters), NOT to the computed angle. This preserves reactivity while stabilizing the input.

### Decision 2: Z-boost for neck-direction detection

**Choice:** When the 2D angle is below 3° but filtered z-delta between wrist and MCP exceeds a threshold, inject a minimum angle score to trigger the visual break.

**Rationale:** Neck-direction bends have a smaller 2D footprint than scroll-direction bends. The z-signal, while noisy, provides directional evidence when the 2D signal is too small. By only activating when 2D is near-zero, we avoid z-noise amplifying already-detected deviations.

```
if angleDiff_2D < 3° AND |z_mcp_filtered - z_wrist_filtered| > Z_THRESHOLD:
    angleDiff = max(angleDiff_2D, Z_BOOST_DEGREES)
```

Z_THRESHOLD and Z_BOOST_DEGREES are tunable constants (start: 0.02 normalized, 8° boost). These need empirical tuning during testing.

### Decision 3: Forearm direction vector smoothing

**Choice:** Apply temporal smoothing (lerp α=0.15) to the normalized forearm direction vector, not to individual landmark positions.

**Rationale:** Landmark-level filtering (existing One-Euro filters) handles position jitter. But the *direction* Elbow→Wrist can still flicker when both points move slightly in different directions. Smoothing the direction vector directly dampens rail orientation jitter without adding positional lag.

```
dir_smooth(t) = normalize(lerp(dir_smooth(t-1), dir_current, 0.15))
```

### Decision 4: Rail extension length proportional to forearm

**Choice:** Extend the rail beyond the wrist by 0.5× the screen-space forearm length (|Elbow - Wrist| in pixels).

**Rationale:** Fixed pixel length would vary with camera distance. Proportional length scales automatically. 0.5× provides enough visual reference without extending off-screen.

### Decision 5: Decay timer as closure factory

**Choice:** Implement the 5s challenge timer as `createWristRailTimer()` factory function with closure state, following the existing pattern of `createWristRepairStatus()`.

**Rationale:** Consistent with the project's factory-with-closure pattern. Held via `useRef` in the detection hook. Clean separation from React lifecycle.

```
State: timerValue (0..5), lastSuccessTime
Input: isStright (boolean), dt (seconds)
Output: { timerValue, success (boolean), successGlow (0..1) }

if isStraight: timerValue += dt
else:          timerValue -= dt × 3
timerValue = clamp(0, 5)

if timerValue >= 5: fire success, reset to 0
```

### Decision 6: Rail always visible in analyse mode, anchor-only in flow mode

**Choice:** Render the full rail (forearm extension + hand line + anchor) in analyse mode. In flow mode, keep the existing anchor-only approach at the screen edge.

**Rationale:** The rail is a learning tool — the player needs to see their arm on camera to relate the line to their body. In flow mode (black background, no camera feed), the rail has no spatial reference and would be confusing.

## Risks / Trade-offs

- **[2D blind spot for pure z-bends]** → Mitigated by z-boost hybrid. If empirically insufficient, we can recommend camera positioning (slightly angled) as a secondary mitigation.
- **[Direction vector smoothing adds latency]** → α=0.15 at 30fps ≈ 2-frame lag on direction. Acceptable for a reference line; the MCP endpoint uses position filters only (faster response).
- **[5s timer may be too easy or too hard]** → All constants (duration, decay multiplier, deadzone) are configurable. Will tune during testing.
- **[Always-visible rail may distract]** → Rail uses low-opacity styling (grey forearm extension, subtle blue hand line). Only the break state (yellow dashed) demands attention.
- **[Existing wrist-flexion-tracking tests may break]** → The 3D functions remain available but deprecated. New 2D functions added alongside. Tests updated to cover new measurement.
