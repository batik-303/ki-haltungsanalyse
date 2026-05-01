## ADDED Requirements

### Requirement: Independent mode rendering dispatch
The canvas renderer SHALL execute exactly one mode-specific rendering branch per frame based on the current `focusMode` value. The branches for `shoulder`, `wrist`, and `violin` MUST be mutually exclusive top-level conditionals — none SHALL be nested inside another mode's block.

#### Scenario: Violin mode renders anchor after calibration
- **WHEN** `focusMode` is `'violin'` and `masterPrint` exists with `mode: 'violin'`
- **THEN** the renderer draws the sapphire anchor at the calibrated wrist position and does NOT enter the shoulder or wrist rendering paths

#### Scenario: Wrist mode renders lines and side-view
- **WHEN** `focusMode` is `'wrist'` and `masterPrint` exists with `mode: 'wrist'`
- **THEN** the renderer draws wrist lines, side-view, and anchor at the filtered wrist position and does NOT enter the shoulder or violin rendering paths

#### Scenario: Shoulder mode renders ear-shoulder feedback
- **WHEN** `focusMode` is `'shoulder'` and `masterPrint` exists with `mode: 'shoulder'`
- **THEN** the renderer draws the anchor at the shoulder position with ear-shoulder connector and does NOT enter the wrist or violin rendering paths

### Requirement: Wrist glow state persists across frames
The wrist repair glow flash variables (`wristGlowLevel`, `wristGlowDecay`, `lastWristRepaired`) SHALL persist across consecutive `renderFrame` calls so that the 350ms decay animation is visible.

#### Scenario: Glow flash triggers on repair status change
- **WHEN** `wristRepairStatus.repaired` transitions from `false` to `true` between frames
- **THEN** `wristGlowLevel` is set to 1.0 and decays to 0 over 350ms across subsequent frames

### Requirement: No mode-foreign code in rendering branches
Each mode branch SHALL only contain rendering logic relevant to that specific mode. Violin-specific concepts (calibWristX, calibWristY, deadzone snap) MUST NOT appear in the shoulder branch.

#### Scenario: Shoulder flow mode draws only shoulder anchor
- **WHEN** `focusMode` is `'shoulder'` and `viewMode` is `'flow'`
- **THEN** the renderer draws a simple anchor on the right canvas edge without referencing wrist position, deadzone, or violin calibration values
