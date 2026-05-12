## ADDED Requirements

### Requirement: Silence zone for peripheral wrist feedback
The system SHALL provide a visual silence zone for wrist feedback at absolute effective deviation less than or equal to 4 degrees. In this zone, the blue rail and anchor SHALL remain visible and static without position drift, color morphing, or warning flicker.

#### Scenario: Stable in-deadzone posture
- **WHEN** absolute effective wrist deviation is less than or equal to 4 degrees
- **THEN** the side-view hand rail SHALL render as static blue
- **AND** the anchor SHALL remain visible without warning pulse or color shift

### Requirement: Sigmoid color morph outside silence zone
The system SHALL use a sigmoid color mapping for deviation above 4 degrees so visual escalation is weak near 4 degrees, increases rapidly around 6 to 7 degrees, and approaches correction color above 8 degrees.

#### Scenario: Early post-threshold drift
- **WHEN** absolute effective wrist deviation is between 4 and 5 degrees
- **THEN** the displayed color shift from blue SHALL be subtle and not equivalent to correction intensity

#### Scenario: Correction-zone drift
- **WHEN** absolute effective wrist deviation is greater than 8 degrees
- **THEN** the displayed color SHALL converge toward lilac/purple correction state

### Requirement: One-shot repair reward pulse
The system SHALL emit one distinct blue anchor glow pulse when feedback transitions from warning or correction back into the silence zone after a valid return.

#### Scenario: Successful repair from warning
- **WHEN** the previous frame state is outside silence and current state returns to less than or equal to 4 degrees
- **THEN** the anchor SHALL trigger one blue glow pulse
- **AND** the pulse SHALL not repeat continuously while posture remains inside silence
