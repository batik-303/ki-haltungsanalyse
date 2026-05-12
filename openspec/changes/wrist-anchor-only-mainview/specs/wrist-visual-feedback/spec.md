## REMOVED Requirements

### Requirement: Yellow dashed line on deviation
**Reason**: Rail lines and directional knick indicators are removed from the main view. Directional feedback is now exclusively provided by the peripheral side-view.
**Migration**: Deviation state is communicated via anchor point color in the main view.

### Requirement: No visual clutter in correct state
**Reason**: Replaced by anchor-only rendering. The concept of "rail line + anchor" in correct state no longer applies since rail lines are removed entirely.
**Migration**: Correct state is shown by a blue anchor point. No other elements needed.

### Requirement: Hand segment styling
**Reason**: Hand segment (wrist to MCP line) is no longer rendered in the main view. All directional line rendering moves to peripheral side-view only.
**Migration**: None needed — peripheral side-view already handles directional display.

## MODIFIED Requirements

### Requirement: Synchronized peripheral side-view
The peripheral side-view SHALL be the sole directional feedback channel for wrist deviation. It SHALL read `wristRailIsBlue` and `wristRailAngleDeg` from the store and display knick direction and deviation strength. The side-view line SHALL be rendered prominently as the primary directional indicator.

#### Scenario: Correct posture in side-view
- **WHEN** `state.wristRailIsBlue` is `true`
- **THEN** the side-view shows a straight vertical arm line, anchor at center, and straight blue hand line above

#### Scenario: Deviation shown in side-view
- **WHEN** `state.wristRailIsBlue` is `false`
- **THEN** the side-view shows a hand line angled by `wristRailAngleDeg` with yellow color
- **AND** the side-view SHALL be the only place where directional knick is rendered
