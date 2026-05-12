## Context

Current wrist feedback is asymmetric in perceived repair effort: scroll-direction correction feels easier while neck-direction recovery can remain in warning colors too long. The system already has z-boost and smoothing, but visual feedback does not yet formalize a calm 4-degree silence zone with delayed visual escalation. The product goal is low-distraction, trustable peripheral coaching for professional violin practice, with positive reinforcement and immediate felt reward when posture returns.

Constraints:
- Overlay remains the primary feedback channel.
- UI tone must remain calm and non-punitive.
- Existing architecture split must be preserved (core analysis vs rendering vs hooks).

## Goals / Non-Goals

**Goals:**
- Make in-tolerance behavior visually still: inside 4 degrees, keep blue rail and anchor visible and static.
- Introduce smooth sigmoid color response outside 4 degrees, with practical ranges:
  - 4 to 7 degrees: blue to yellow trend (awareness)
  - above 8 degrees: clear move toward lilac/purple (correction)
- Increase vibrato robustness by stronger smoothing so short periodic motion does not flicker warning states.
- Improve repair feel: successful return should quickly look calm and trigger one distinct blue anchor glow pulse.
- Add measurable validation for z-boost multiplier tuning and false-positive control.

**Non-Goals:**
- No redesign of non-wrist modes.
- No new external dependencies.
- No changes to voice control, session persistence, or calibration UX flows outside wrist feedback semantics.

## Decisions

1. Deadzone as explicit visual state machine
- Decision: Define a dedicated visual state `silent` for absolute angle <= 4 degrees.
- Behavior in `silent`: fixed blue line, fixed position, no color morph animation.
- Rationale: Separates "posture is acceptable" from "posture is drifting," reducing cognitive load.
- Alternative considered: Keep slight micro-motion for liveliness. Rejected because it reintroduces vibrato noise perception.

2. Sigmoid mapping for color intensity
- Decision: Use a sigmoid easing function over normalized deviation to map color progression.
- Mapping intent:
  - near 4 degrees: shallow response (little visible change)
  - around 6 to 7 degrees: steeper ramp (clearer warning)
  - >8 degrees: saturate toward lilac/purple correction
- Rationale: Better perceptual ergonomics than linear interpolation, avoids abrupt threshold feel while still creating decisive correction cues.
- Alternative considered: Linear interpolation. Rejected because it feels either too busy near threshold or too weak before correction zone.

3. Stronger temporal smoothing with asymmetry
- Decision: Increase wrist feedback damping to heavily suppress fast oscillations (target equivalent to EMA memory around 0.95 for warning buildup), while allowing faster decay back toward calm state.
- Rationale: Musical micro-motion (vibrato) should not escalate alerts; returning to good posture should feel light and rewarding.
- Alternative considered: symmetric smoothing only. Rejected because it makes repair feel sticky.

4. Repair reward event as one-shot pulse
- Decision: Trigger a one-time blue anchor glow pulse on state transition from warning/correction back into `silent` with short hold confirmation.
- Rationale: Distinct positive confirmation improves learnability and motivation without persistent blinking.
- Alternative considered: continuous pulsing while in deadzone. Rejected due to distraction risk.

5. Z-boost sensitivity tuning with guardrails
- Decision: Test z-boost multiplier at 1.5 as exploratory default for neck-bend detectability under heavy smoothing; retain a downgrade path to 1.2 if vibrato false positives rise.
- Rationale: Neck-direction bends can be underrepresented in 2D; multiplier may restore sensitivity.
- Alternative considered: leave multiplier unchanged. Rejected for potentially missing neck bends after stronger damping.

6. Validation protocol is first-class requirement
- Decision: Add explicit test protocol:
  - "Kleben" test: induce neck-side misposture and verify stable correction signal
  - "Vibrato" negative test: strong musical vibrato should not flash warning/correction
  - console observability: inspect z-boost-driven effective angle during normal play; sustained >4 degrees without true fault indicates overtuning
- Rationale: Provides objective acceptance criteria for subjective feel targets.

## Risks / Trade-offs

- [Over-damping hides true short errors] -> Use asymmetric smoothing and verify with induced error tests.
- [Z-boost x1.5 increases false positives] -> Add downgrade rule to 1.2 based on vibrato/console thresholds.
- [Sigmoid parameters poorly tuned] -> Keep parameterized constants and tune against side-by-side recordings.
- [Reward pulse over-triggers due to boundary chatter] -> Gate pulse on transition with small debounce/hold confirmation.

## Migration Plan

- Implement feature flags/constants for deadzone, sigmoid steepness, smoothing memory, and z-boost multiplier.
- Roll out in wrist mode only and run manual musician validation protocol.
- If instability is observed, rollback path is constant reset to current deadzone/color/smoothing behavior.

## Open Questions

- Exact sigmoid parameters (midpoint and steepness) that best match perceived "soft then firm" escalation.
- Minimum hold time for repair pulse trigger to avoid chatter while preserving immediacy.
- Whether neck and scroll directions should use identical color ramp or slight direction-specific weighting.
