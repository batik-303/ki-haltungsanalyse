## ADDED Requirements

### Requirement: 3D wrist angle computation
The system SHALL compute the wrist angle using 3D vectors (x, y, z) from MediaPipe landmarks instead of 2D vectors (x, y only).

#### Scenario: Wrist bends toward scroll (lateral movement)
- **WHEN** the player bends their wrist toward the scroll (movement primarily in x/y plane)
- **THEN** the system SHALL detect an `angleDiff` proportional to the physical bend angle

#### Scenario: Wrist bends toward neck (depth movement)
- **WHEN** the player bends their wrist toward the neck/body (movement primarily in z-axis)
- **THEN** the system SHALL detect an `angleDiff` proportional to the physical bend angle, comparable in magnitude to an equivalent lateral bend

#### Scenario: Straight wrist at calibration pose
- **WHEN** the player holds the calibrated wrist position
- **THEN** the 3D angle SHALL equal approximately 180° and `angleDiff` SHALL be near 0

### Requirement: 3D bend direction detection
The system SHALL compute the wrist bend direction using 3D cross product to distinguish bend directions in all planes.

#### Scenario: Direction detection with depth movement
- **WHEN** the wrist bends into a direction with significant z-component
- **THEN** the bend direction value SHALL reflect the actual spatial direction, not only the 2D-projected direction

### Requirement: 3D-aware calibration
The `WristMasterPrint` SHALL store the calibrated wrist angle and bend direction computed from 3D vectors.

#### Scenario: Calibration captures 3D reference
- **WHEN** the user calibrates in wrist mode
- **THEN** the stored `wristAngle` and `wristBendDir` SHALL be computed using 3D vectors (x, y, z)
