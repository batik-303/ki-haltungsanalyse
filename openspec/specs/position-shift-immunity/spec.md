## ADDED Requirements

### Requirement: Slide-shield sensitivity for position shifts
The slide-shield SHALL activate at a wrist velocity threshold of 0.30 (normalized units/frame), reduced from 0.45. This ensures that position-shift movements (Lagenwechsel) reliably trigger the shield.

#### Scenario: Moderate speed position shift
- **WHEN** the wrist moves at 0.35 normalized units/frame during a Lagenwechsel
- **THEN** the slide-shield SHALL activate (0.35 > 0.30 threshold)

#### Scenario: Slow intentional bend not shielded
- **WHEN** the wrist bends slowly at 0.15 normalized units/frame
- **THEN** the slide-shield SHALL NOT activate (0.15 < 0.30 threshold)

### Requirement: Extended shield duration
The slide-shield SHALL remain active for 0.35 seconds after activation, extended from 0.22 seconds. This covers the full duration of a typical position shift.

#### Scenario: Shield covers position shift
- **WHEN** the slide-shield activates at t=0
- **THEN** tension contribution SHALL be damped until t=0.35s

### Requirement: Increased shield damping factor
During active slide-shield, the tension target SHALL be multiplied by a damping factor of 0.50 (reduced from 0.35). This provides stronger suppression of false positives during arm movement.

#### Scenario: Deviation during shielded movement
- **WHEN** the slide-shield is active and the computed tension target is 40
- **THEN** the effective tension target SHALL be 40 × 0.50 = 20
