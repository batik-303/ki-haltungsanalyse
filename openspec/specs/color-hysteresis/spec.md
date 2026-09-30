## ADDED Requirements

### Requirement: One anchor color state blue/yellow/grey
The system SHALL derive a single anchor color state `blue | yellow | grey` via `createAnchorColorState()` (`src/core/analysis/anchor-color.ts`, #88, decision #75). Anchor, peripheral side-view and session statistics SHALL read this same state (`wristAnchorColor` in the store). It replaces `createWristRailColor`, `createWristRepairStatus` and the sigmoid/lilac visual state. The slide shield (`createSlideShield`, #90/#93) SHALL remain and enter as `slideDamping`: it damps the knick only on the way to yellow, never on the way to blue. All timings SHALL be in milliseconds, not frames.

#### Scenario: Yellow is decided by the average, not a single value
- **WHEN** the unsmoothed knick deviation is averaged over the last 500 ms
- **THEN** the state SHALL turn yellow only after the average stays above 8° for 500 ms
- **AND** SHALL return to blue after the average stays below 5° for 150 ms

#### Scenario: Vibrato around a straight posture stays blue
- **WHEN** the knick oscillates at 6 Hz with ±10° around the stored posture
- **THEN** the state SHALL remain blue

#### Scenario: Vibrato around a bent posture stays yellow
- **WHEN** the knick oscillates at 6 Hz with ±10° around 15°
- **THEN** the state SHALL turn yellow and remain yellow

#### Scenario: Short outlier after a correction
- **WHEN** the state has returned to blue and a 200 ms outlier of 25° occurs
- **THEN** the state SHALL remain blue

### Requirement: Grey has priority and pauses measuring
When `computeAnchorVisibility` reports that the wrist is not reliably visible (#74), the system SHALL neither measure nor count, including no pose-fallback knick. After 250 ms without reliable visibility the state SHALL be grey. When visible again, the system SHALL collect only new values for 150 ms and then show the honest color immediately (average ≥ 8° → yellow, otherwise blue) without the 500 ms hold.

#### Scenario: Hand briefly lost
- **WHEN** the hand is not visible for 1 s while the posture is straight
- **THEN** the state SHALL become grey and never yellow

#### Scenario: Return bent
- **WHEN** the hand is visible again with a 15° knick
- **THEN** the state SHALL switch from grey to yellow after about 150 ms

### Requirement: Reset on recalibration
`resetAnalysisState` SHALL re-create the color state, starting blue with an empty averaging window.
