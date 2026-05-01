## ADDED Requirements

### Requirement: MCP-Joint Approximation
The system SHALL compute the MCP-Joint position as the midpoint of LEFT_PINKY (landmark 17) and LEFT_INDEX (landmark 19) from MediaPipe Pose landmarks.

#### Scenario: MCP computation from landmarks
- **WHEN** a pose frame contains landmarks 17 and 19
- **THEN** MCP position is calculated as `((lm17.x + lm19.x)/2, (lm17.y + lm19.y)/2, (lm17.z + lm19.z)/2)`

### Requirement: Flexion/Extension angle isolation
The system SHALL measure only the Flexion/Extension component of wrist bend by projecting the hand vector onto the arm plane defined by the forearm vector and gravity.

#### Scenario: Pure flexion detected
- **WHEN** the hand bends inward (toward palm) relative to the forearm line
- **THEN** the system reports an angular deviation equal to the projected angle difference from calibration

#### Scenario: Radial/Ulnar movement ignored
- **WHEN** the hand moves laterally (radial or ulnar deviation) without flexion/extension change
- **THEN** the measured flexion angle deviation remains near zero (within deadzone)

#### Scenario: Vertical arm fallback
- **WHEN** the forearm vector is nearly parallel to the gravity vector (|forearm × up| < 0.1)
- **THEN** the system falls back to a 2D angle computation as a degraded mode

### Requirement: Plane projection algorithm
The system SHALL define the flexion plane as: `normal = normalize(forearm × [0, -1, 0])`, project the hand vector `(MCP - wrist)` onto this plane, and measure the angle between the projected hand vector and the forearm vector.

#### Scenario: Straight wrist calibration
- **WHEN** the user calibrates with a straight wrist (hand aligned with forearm)
- **THEN** the stored reference angle SHALL be approximately 180° (straight line)

#### Scenario: Angle difference computation
- **WHEN** a frame is analyzed against the master print
- **THEN** angleDiff = |currentFlexAngle - masterPrint.flexAngle|

### Requirement: Calibration stores flex-only angle
The WristMasterPrint SHALL store the projected flexion angle and MCP reference position at calibration time.

#### Scenario: Wrist calibration capture
- **WHEN** the user holds the correct wrist position and calibration triggers
- **THEN** the system stores `flexAngle`, `flexBendDir`, and `calibArmLength2D` in the MasterPrint

### Requirement: One-Euro filter on MCP
The system SHALL apply One-Euro filtering to the computed MCP position to reduce jitter.

#### Scenario: Stable MCP during held position
- **WHEN** the user holds the hand still for 1 second
- **THEN** the rendered MCP position variance SHALL be less than 2px
