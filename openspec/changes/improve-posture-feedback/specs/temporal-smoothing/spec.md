## ADDED Requirements

### Requirement: Smoothed angle values for warning evaluation
The system SHALL apply temporal smoothing (exponential moving average) to all measured angle and ratio values before evaluating them against thresholds. Raw per-frame values SHALL NOT directly trigger or clear warnings.

#### Scenario: Jittery values smoothed out
- **WHEN** the head tilt angle fluctuates between 24° and 26° across consecutive frames
- **THEN** the smoothed value changes gradually and does not cause the warning to toggle on and off every frame

#### Scenario: Genuine posture change detected
- **WHEN** the user moves their head from 10° tilt to 35° tilt over ~0.5 seconds
- **THEN** the smoothed value rises to reflect the new posture within approximately 0.3-0.5 seconds and a warning is triggered

#### Scenario: Smoothing resets on tracking loss
- **WHEN** the pose is lost (no landmarks detected) for more than 1 second and then re-detected
- **THEN** the smoothed values reset and begin fresh from the newly detected values

### Requirement: Hysteresis for warning state transitions
The system SHALL use separate thresholds for entering and exiting warning states. The exit threshold SHALL be more permissive than the entry threshold by a defined hysteresis margin.

#### Scenario: Warning activation at entry threshold
- **WHEN** the smoothed head tilt angle rises from 20° to 26° (entry threshold: 25°)
- **THEN** the head tilt warning activates when the smoothed value crosses 25°

#### Scenario: Warning deactivation at exit threshold
- **WHEN** the head tilt warning is active and the smoothed angle drops to 22°
- **THEN** the warning remains active because 22° is above the exit threshold (25° minus hysteresis band)

#### Scenario: Warning clears below exit threshold
- **WHEN** the head tilt warning is active and the smoothed angle drops to 19°
- **THEN** the warning deactivates because 19° is below the exit threshold (~20°, i.e., 25° minus ~20% hysteresis band)

### Requirement: Visual feedback reflects smoothed state
The skeleton color-coding, angle arcs, warning panel text, and status bar SHALL all reflect the smoothed and hysteresis-gated warning state, not the raw per-frame measurement.

#### Scenario: Skeleton stays green during jitter
- **WHEN** the raw angle briefly crosses the threshold for 2 frames then returns
- **THEN** the skeleton segments remain in their normal colors (no red flash)

#### Scenario: Status bar stable during borderline values
- **WHEN** the raw values hover near the threshold boundary
- **THEN** the status bar color does not flicker between green and orange
