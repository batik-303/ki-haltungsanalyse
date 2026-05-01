## ADDED Requirements

### Requirement: Flow-mode anchor renders on the left side of the screen
The Flow-mode sapphire anchor and associated visual elements (GoldenBand, return glow, tension ring) SHALL render on the left side of the visible screen in all instrument modes when `viewMode === 'flow'`. This is achieved by drawing at the right edge of the canvas (CSS `scale-x-[-1]` mirror). Analyse-mode anchors SHALL remain body-anchored at their calibrated positions.

#### Scenario: Violin Flow mode anchor position
- **WHEN** the user is in Flow mode with focusMode `violin`
- **THEN** the anchor renders at approximately `width - 50` on the canvas x-axis, appearing on the left ~10% of the visible screen

#### Scenario: Shoulder Flow mode anchor position
- **WHEN** the user is in Flow mode with focusMode `shoulder`
- **THEN** the anchor renders at `width - 50` on the canvas x-axis

#### Scenario: Wrist Flow mode anchor position
- **WHEN** the user is in Flow mode with focusMode `wrist`
- **THEN** the anchor renders at `width - 50` on the canvas x-axis

#### Scenario: Analyse mode unaffected
- **WHEN** the user is in Analyse mode for any focusMode
- **THEN** the anchor renders at the body-tracked or calibrated position, unchanged

### Requirement: Streak timer tracks continuous flow duration
The session tracker SHALL maintain a `streakSeconds` counter that accumulates time while the musician holds good posture. The streak represents continuous seconds with tension below the flow threshold.

#### Scenario: Streak increments during flow
- **WHEN** `tensionScore < 5` for consecutive frames
- **THEN** `streakSeconds` SHALL increment by the frame's delta time each frame

#### Scenario: Streak pauses when tension rises
- **WHEN** `tensionScore >= 5`
- **THEN** `streakSeconds` SHALL stop incrementing immediately (freeze)

#### Scenario: Grace period before reset
- **WHEN** `tensionScore >= 5` for less than 500ms and then returns below 5
- **THEN** `streakSeconds` SHALL resume from its frozen value without resetting

#### Scenario: Streak resets after grace period expires
- **WHEN** `tensionScore >= 5` continuously for more than 500ms
- **THEN** `streakSeconds` SHALL reset to 0

#### Scenario: Max streak tracked per session
- **WHEN** `streakSeconds` exceeds the current `maxStreak` value
- **THEN** `maxStreak` SHALL update to the new `streakSeconds` value

### Requirement: Streak communicates visually through anchor glow
The sapphire anchor SHALL communicate streak progress primarily through visual properties (glow intensity, pulse radius) rather than prominent text. A small numeric readout is secondary.

#### Scenario: Anchor glow grows with streak
- **WHEN** `streakSeconds` increases from 0 toward 60
- **THEN** the anchor's pulse radius and glow intensity SHALL increase proportionally

#### Scenario: Glow caps at 60 seconds
- **WHEN** `streakSeconds` exceeds 60
- **THEN** the visual glow SHALL remain at its maximum intensity (no further growth)

#### Scenario: Small numeric readout
- **WHEN** `streakSeconds > 0`
- **THEN** a small text label (≤12px) below the anchor SHALL display the streak in whole seconds

#### Scenario: Streak resets visual feedback
- **WHEN** `streakSeconds` resets to 0
- **THEN** the anchor glow SHALL return to its default size and intensity
