## ADDED Requirements

### Requirement: Slowly drifting reference angle
The system SHALL maintain a slow-moving reference angle using an EMA filter on the raw 2D collinearity angle. The adaptive baseline SHALL have a time constant of approximately 1.5 seconds at 30fps (alpha approximately 0.02).

#### Scenario: Gradual player movement
- **WHEN** the player shifts position gradually over 2-3 seconds
- **THEN** the adaptive baseline SHALL drift to absorb the positional change
- **AND** the peripheral side-view SHALL remain calm (not trigger warning)

#### Scenario: Fast wrist fault
- **WHEN** the player develops a wrist fault within 0.5 seconds
- **THEN** the effective deviation SHALL outpace the baseline drift
- **AND** the peripheral side-view SHALL display directional feedback

### Requirement: Peripheral receives baseline-corrected angle
The peripheral side-view SHALL receive the difference between the current effective angle and the adaptive baseline, not the raw effective angle.

#### Scenario: Baseline-corrected peripheral display
- **WHEN** the adaptive baseline is at 5 degrees and the current effective angle is 12 degrees
- **THEN** the peripheral side-view SHALL display based on a 7-degree deviation
