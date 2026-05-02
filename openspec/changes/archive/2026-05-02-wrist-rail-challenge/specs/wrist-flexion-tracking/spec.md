## ADDED Requirements

### Requirement: 2D collinearity measurement
The system SHALL measure wrist bend as the 2D angle at the wrist point in the screen-space triangle Elbow→Wrist→MCP, using only x,y coordinates (ignoring z).

#### Scenario: Straight wrist in 2D
- **WHEN** Elbow, Wrist, and MCP are collinear in screen space
- **THEN** the measured 2D angle deviation SHALL be approximately 0°

#### Scenario: Lateral bend detected
- **WHEN** the hand bends laterally (radial or ulnar deviation)
- **THEN** the 2D angle deviation SHALL reflect the visible angular displacement

#### Scenario: Depth movement with lateral component
- **WHEN** the hand moves toward the neck (partial depth movement)
- **THEN** the 2D angle deviation SHALL capture the lateral component of the movement

### Requirement: Z-boost for neck-direction detection
The system SHALL apply a z-boost when the 2D angle is below 3° but the filtered z-delta between MCP and wrist exceeds a configurable threshold (Z_THRESHOLD).

#### Scenario: Neck-direction bend with small 2D footprint
- **WHEN** the 2D angleDiff is less than 3° AND the absolute z-delta (|z_mcp - z_wrist|) exceeds Z_THRESHOLD
- **THEN** the effective angleDiff SHALL be raised to at least Z_BOOST_DEGREES

#### Scenario: Z-boost does not amplify visible bends
- **WHEN** the 2D angleDiff already exceeds 3°
- **THEN** the z-boost SHALL NOT modify the angleDiff

#### Scenario: Z-values use strong filtering
- **WHEN** z-values are used for the boost signal
- **THEN** they SHALL be passed through One-Euro filters with beta ≤ 0.003

### Requirement: Forearm direction vector smoothing
The system SHALL apply temporal smoothing (lerp with α=0.15) to the normalized forearm direction vector (Elbow→Wrist) to prevent rail orientation flicker.

#### Scenario: Static arm position
- **WHEN** the player holds the arm still for 1 second
- **THEN** the rail direction SHALL vary by less than 1° between consecutive frames

#### Scenario: Arm movement tracked
- **WHEN** the player moves the arm to a new position (e.g., position change)
- **THEN** the rail direction SHALL converge to the new orientation within 10 frames (~330ms at 30fps)

## MODIFIED Requirements

### Requirement: Flexion/Extension angle isolation
The system SHALL measure wrist bend primarily via 2D screen-space collinearity (Elbow→Wrist→MCP angle using x,y only). The 3D flexion-plane projection SHALL be retained as a deprecated fallback but SHALL NOT be used for primary analysis.

#### Scenario: Pure flexion detected
- **WHEN** the hand bends inward (toward palm) relative to the forearm line
- **THEN** the system reports the 2D angular deviation at the wrist point

#### Scenario: Radial/Ulnar movement detected in 2D
- **WHEN** the hand moves laterally (radial or ulnar deviation)
- **THEN** the 2D measurement SHALL detect this as angular deviation (unlike the previous 3D projection which filtered it out)

#### Scenario: Vertical arm fallback
- **WHEN** the forearm vector is nearly vertical in screen space (|v_arm| < threshold)
- **THEN** the system SHALL report 0° deviation (arm foreshortened, measurement unreliable)

### Requirement: Calibration stores flex-only angle
The WristMasterPrint SHALL store the 2D collinearity angle at calibration time in addition to existing fields. The stored `flexAngle` remains for backward compatibility.

#### Scenario: Wrist calibration capture
- **WHEN** the user holds the correct wrist position and calibration triggers
- **THEN** the system stores `flexAngle`, `flexBendDir`, `calibArmLength2D`, and `calib2DAngle` in the MasterPrint
