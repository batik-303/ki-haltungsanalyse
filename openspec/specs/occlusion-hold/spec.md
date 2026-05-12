## ADDED Requirements

### Requirement: Visibility confidence gate
Before using landmark coordinates for wrist analysis, the system SHALL check the `visibility` property of each required landmark (elbow, wrist, index/pinky). If any landmark has `visibility < 0.5`, the system SHALL use the last known stable coordinates instead of the current frame's values.

#### Scenario: Wrist partially occluded by instrument
- **WHEN** `landmarks[15].visibility` drops to 0.3 for 5 frames
- **THEN** the analysis SHALL use the last coordinates from when `visibility >= 0.5`
- **AND** the side-view and anchor SHALL remain at the last stable position

#### Scenario: All landmarks visible
- **WHEN** all three landmarks have `visibility >= 0.5`
- **THEN** the system SHALL use current frame coordinates normally

#### Scenario: Visibility recovers
- **WHEN** a landmark's `visibility` rises from 0.3 back to 0.6
- **THEN** the system SHALL resume using live coordinates from that frame onward

### Requirement: Occlusion timeout
If landmarks remain below the visibility threshold for more than 1 second (≈30 frames), the system SHALL stop updating wrist feedback (hold last state but fade anchor opacity to 50%).

#### Scenario: Prolonged occlusion
- **WHEN** wrist landmark `visibility < 0.5` persists for 1.2 seconds
- **THEN** the anchor opacity SHALL be reduced to 50%
- **AND** the analysis SHALL not update tension or rail color

#### Scenario: Recovery after timeout
- **WHEN** visibility recovers after a timeout period
- **THEN** the anchor opacity SHALL return to 100% within 300ms (fade-in)
- **AND** the analysis SHALL resume with current coordinates

### Requirement: Stable coordinate buffer
The system SHALL maintain a per-landmark buffer storing the last coordinates where `visibility >= 0.5`. This buffer SHALL be updated every frame where the landmark is visible.

#### Scenario: Buffer updates on visible frames
- **WHEN** `landmarks[15].visibility` is 0.8
- **THEN** the buffer for landmark 15 SHALL be updated with current coordinates

#### Scenario: Buffer holds during occlusion
- **WHEN** `landmarks[15].visibility` is 0.3
- **THEN** the buffer for landmark 15 SHALL retain its previous value
