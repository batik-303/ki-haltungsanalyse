## MODIFIED Requirements

### Requirement: 5-second decay timer
The system SHALL maintain a continuous timer that tracks sustained correct posture. The timer SHALL rise at real-time speed (+dt per frame) when the player is in the correct posture, and freeze (value unchanged) when the player deviates. The timer SHALL use a progressive target ladder (3s → 5s → 10s → 15s, then 15s steady state) instead of a fixed 5-second target.

#### Scenario: Timer rises during correct posture
- **WHEN** the player holds correct posture for 3 consecutive seconds
- **THEN** the timer value SHALL be approximately 3.0

#### Scenario: Timer freezes on deviation
- **WHEN** the timer is at 4.0 and the player deviates for 2 seconds
- **THEN** the timer value SHALL remain 4.0

#### Scenario: Timer does not go below zero
- **WHEN** the timer is at 0.0 and the player deviates
- **THEN** the timer value SHALL remain 0.0

### Requirement: Success event on 5-second completion
The system SHALL fire a success event when the timer reaches the current milestone target, then reset the timer to 0.0 and advance to the next target in the ladder.

#### Scenario: First milestone completed
- **WHEN** the timer reaches the first target (3s)
- **THEN** a success event is fired, the timer resets to 0.0, and the next target becomes 5s

#### Scenario: Multiple completions per session
- **WHEN** the timer resets after success
- **THEN** it immediately begins rising again toward the next milestone target

#### Scenario: Steady state target
- **WHEN** all ladder targets have been achieved
- **THEN** subsequent milestones each require 15 seconds

### Requirement: Golden anchor flash on success
The system SHALL render a golden glow exclusively on the sapphire anchor when a milestone is completed. The glow SHALL decay over 600ms. No golden flash SHALL be rendered on the hand/rail line.

#### Scenario: Visual success reward
- **WHEN** a milestone completes
- **THEN** the sapphire anchor emits a golden flash (color #FFD700) that decays to invisible over 600ms

#### Scenario: Golden flash visible in side-view
- **WHEN** a milestone completes
- **THEN** the side-view anchor also emits a synchronized golden flash

#### Scenario: No flash on hand line
- **WHEN** a milestone completes
- **THEN** no golden glow effect SHALL be rendered on the wrist-to-MCP hand line
