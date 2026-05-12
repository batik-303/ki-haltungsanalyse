## MODIFIED Requirements

### Requirement: Z-boost for neck-direction detection
The system SHALL support a configurable z-boost multiplier for neck-direction sensitivity and SHALL evaluate a default multiplier of 1.5 under the calm-feedback profile. The multiplier SHALL be reduced if negative tests indicate false positives during normal vibrato.

#### Scenario: Neck-direction bend with small 2D footprint
- **WHEN** 2D angle deviation is below the neck-detection gate and z-delta exceeds threshold
- **THEN** effective deviation SHALL include boosted contribution using configured z-boost multiplier

#### Scenario: Vibrato negative test failure
- **WHEN** strong normal vibrato without true wrist fault repeatedly triggers warning or correction above silence threshold
- **THEN** the z-boost multiplier SHALL be tuned down from 1.5 to a safer value (for example 1.2)

### Requirement: Forearm direction vector smoothing
The system SHALL use high damping for wrist deviation presentation to suppress high-frequency oscillation from vibrato while preserving practical correction response for sustained faults.

#### Scenario: Vibrato robustness
- **WHEN** the player performs strong vibrato in normal posture
- **THEN** effective deviation SHALL remain predominantly in silence state without warning flicker

#### Scenario: Sustained fault response
- **WHEN** a sustained wrist fault persists beyond transient motion
- **THEN** effective deviation SHALL rise into warning or correction state within an acceptable coaching delay window
