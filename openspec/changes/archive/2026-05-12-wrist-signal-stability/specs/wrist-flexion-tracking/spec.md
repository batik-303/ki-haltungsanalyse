## MODIFIED Requirements

### Requirement: Forearm direction vector smoothing
The system SHALL apply temporal smoothing (lerp with α=0.15) to the normalized forearm direction vector (Elbow→Wrist) to prevent rail orientation flicker. Additionally, the slide-shield SHALL activate at a velocity threshold of 0.30 (reduced from 0.45), remain active for 0.35 seconds (extended from 0.22s), and apply a damping factor of 0.50 (increased from 0.35) during the shield period.

#### Scenario: Static arm position
- **WHEN** the player holds the arm still for 1 second
- **THEN** the rail direction SHALL vary by less than 1° between consecutive frames

#### Scenario: Arm movement tracked
- **WHEN** the player moves the arm to a new position (e.g., position change)
- **THEN** the rail direction SHALL converge to the new orientation within 10 frames (~330ms at 30fps)

#### Scenario: Lagenwechsel does not trigger false alarm
- **WHEN** the player performs a vertical position shift (Lagenwechsel) at velocity 0.35
- **THEN** the slide-shield SHALL activate and suppress tension feedback for 0.35 seconds
- **AND** the effective tension during the shield SHALL be damped by factor 0.50
