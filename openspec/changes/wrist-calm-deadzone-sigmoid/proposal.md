## Why

The wrist side-view currently feels harder to repair for neck-direction bends than for scroll-direction bends, which undermines trust and flow for advanced violin practice. We need calmer visual behavior in the tolerance zone and clearer, softer escalation outside it so corrective feedback feels natural and immediate.

## What Changes

- Define a strict visual silence zone for wrist feedback: within 4 degrees, the blue rail and anchor remain visible but static.
- Introduce smooth color morphing outside the silence zone using a sigmoid response:
  - 4 to 7 degrees trends from blue to yellow (awareness)
  - above 8 degrees trends toward lilac/purple (clear correction)
- Strengthen smoothing behavior so vibrato and short musical motion do not trigger unstable warnings.
- Ensure recovery feel is light: returning toward neutral should clearly and promptly restore calm blue feedback, including a distinct one-time blue anchor glow event on successful repair.
- Add explicit validation strategy for false positive control and neck-bend detectability, including provocative and negative tests plus z-boost observability.

## Capabilities

### New Capabilities
- `wrist-calm-feedback`: Defines deadzone silence behavior, sigmoid color morphing, and repair-affordance cues for peripheral wrist UI.

### Modified Capabilities
- `wrist-visual-feedback`: Updates visual transition requirements to include static-in-deadzone and smooth sigmoid escalation behavior.
- `wrist-flexion-tracking`: Updates signal-processing requirements to support stronger damping and configurable z-boost sensitivity validation.

## Impact

- Affected systems: wrist analysis core, side-view renderer, wrist color state logic, calibration/repair cues, and QA test flows.
- Affected files are expected in wrist analysis and rendering modules, plus tests around deadzone behavior, vibrato robustness, and neck-direction correction response.
- No external API changes expected; user-visible behavior changes in peripheral wrist feedback are significant.
