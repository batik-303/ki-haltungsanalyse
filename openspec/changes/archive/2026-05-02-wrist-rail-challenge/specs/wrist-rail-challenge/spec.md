## ADDED Requirements

### Requirement: 5-second decay timer
The system SHALL maintain a continuous timer (0–5 seconds) that tracks sustained straight-wrist posture. The timer SHALL rise at real-time speed (+dt per frame) when the wrist is within the deadzone, and decay at 3× speed (-3×dt per frame) when the wrist deviates beyond the deadzone.

#### Scenario: Timer rises during straight posture
- **WHEN** the wrist angle is within the deadzone for 3 consecutive seconds
- **THEN** the timer value SHALL be approximately 3.0

#### Scenario: Timer decays on deviation
- **WHEN** the timer is at 4.0 and the wrist deviates for 0.5 seconds
- **THEN** the timer value SHALL be approximately 2.5 (4.0 - 0.5 × 3)

#### Scenario: Timer does not go below zero
- **WHEN** the wrist deviates continuously
- **THEN** the timer value SHALL be clamped to 0.0

### Requirement: Success event on 5-second completion
The system SHALL fire a success event when the timer reaches 5.0 seconds, then reset the timer to 0.0.

#### Scenario: Challenge completed
- **WHEN** the timer reaches 5.0
- **THEN** a success event is fired and the timer resets to 0.0

#### Scenario: Multiple completions per session
- **WHEN** the timer resets after success
- **THEN** it immediately begins rising again if the wrist remains straight

### Requirement: Golden anchor flash on success
The system SHALL render a golden glow on the sapphire anchor when the 5-second challenge is completed. The glow SHALL decay over 600ms.

#### Scenario: Visual success reward
- **WHEN** the 5-second challenge completes
- **THEN** the anchor emits a golden flash (color #FFD700) that decays to invisible over 600ms

#### Scenario: Golden flash visible in side-view
- **WHEN** the 5-second challenge completes
- **THEN** the side-view anchor also emits a synchronized golden flash

### Requirement: Timer state as closure factory
The timer SHALL be implemented as a factory function `createWristRailTimer()` returning a closure, consistent with the project's `createWristRepairStatus()` pattern.

#### Scenario: Timer instantiation
- **WHEN** the detection hook initializes
- **THEN** the timer is created via `createWristRailTimer()` and held in a `useRef`

#### Scenario: Timer reset on recalibration
- **WHEN** the user recalibrates
- **THEN** the timer resets to 0.0
