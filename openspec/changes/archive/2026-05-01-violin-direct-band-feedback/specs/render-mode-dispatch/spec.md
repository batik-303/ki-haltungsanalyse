## MODIFIED Requirements

### Requirement: Independent mode rendering dispatch
The canvas renderer SHALL execute exactly one mode-specific rendering branch per frame based on the current `focusMode` value. The branches for `shoulder`, `wrist`, and `violin` MUST be mutually exclusive top-level conditionals — none SHALL be nested inside another mode's block.

#### Scenario: Violin mode renders anchor and wrist marker after calibration
- **WHEN** `focusMode` is `'violin'` and `masterPrint` exists with `mode: 'violin'`
- **THEN** the renderer draws the sapphire anchor at the calibrated wrist position, a blue marker at the live wrist position, and optionally a yellow band between them — and does NOT enter the shoulder or wrist rendering paths

#### Scenario: Wrist mode renders lines and side-view
- **WHEN** `focusMode` is `'wrist'` and `masterPrint` exists with `mode: 'wrist'`
- **THEN** the renderer draws wrist lines, side-view, and anchor at the filtered wrist position and does NOT enter the shoulder or violin rendering paths

#### Scenario: Shoulder mode renders ear-shoulder feedback
- **WHEN** `focusMode` is `'shoulder'` and `masterPrint` exists with `mode: 'shoulder'`
- **THEN** the renderer draws the anchor at the shoulder position with ear-shoulder connector and does NOT enter the wrist or violin rendering paths

## REMOVED Requirements

### Requirement: Violin scroll projection
**Reason**: The experimental "Schnecke" (scroll) rendering at fixed position (48,48) with spiral and SNAIL_MODE flag is removed. It had no pedagogical value and confused the direct feedback metaphor.
**Migration**: Violin mode now uses anchor→wrist-marker→band as the sole feedback visualization. No code references SNAIL_MODE anymore.
