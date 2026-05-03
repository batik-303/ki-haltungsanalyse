## ADDED Requirements

### Requirement: Progressive freeze timer
The system SHALL maintain a hold timer that rises at real-time speed (+dt per frame) when the player is in the correct posture (repaired/deadzone), and freezes (value unchanged) when the player deviates. The timer SHALL NOT decay — it only pauses.

#### Scenario: Timer rises during correct posture
- **WHEN** the player holds correct posture for 3 consecutive seconds
- **THEN** the timer value SHALL be approximately 3.0

#### Scenario: Timer freezes on deviation
- **WHEN** the timer is at 4.0 and the player deviates for 2 seconds
- **THEN** the timer value SHALL remain 4.0

#### Scenario: Timer resumes after correction
- **WHEN** the timer was frozen at 4.0 and the player returns to correct posture for 1 second
- **THEN** the timer value SHALL be approximately 5.0

#### Scenario: Timer does not go below zero
- **WHEN** the timer is at 0.0 and the player deviates
- **THEN** the timer value SHALL remain 0.0

### Requirement: Progressive milestone ladder
The hold timer SHALL use a progressive target ladder: 3s → 5s → 10s → 15s. After the ladder is exhausted, the target SHALL repeat the last value (15s) indefinitely.

#### Scenario: First milestone at 3 seconds
- **WHEN** the player holds correct posture for 3 cumulative seconds (first milestone)
- **THEN** a success event fires and the timer resets to 0.0

#### Scenario: Second milestone at 5 seconds
- **WHEN** the first milestone was achieved and the player holds for 5 more cumulative seconds
- **THEN** a success event fires for the second milestone

#### Scenario: Steady state at 15 seconds
- **WHEN** all four ladder targets (3, 5, 10, 15) have been achieved
- **THEN** subsequent milestones SHALL each require 15 seconds

#### Scenario: Timer resets after each milestone
- **WHEN** a milestone success event fires
- **THEN** the timer resets to 0.0 and the next target begins

### Requirement: Cumulative milestone counter per session
The session tracker SHALL count the total number of milestones achieved during the session. This count SHALL be included in SessionStats.

#### Scenario: Multiple milestones in one session
- **WHEN** the player achieves 5 milestones during a session
- **THEN** SessionStats.holdMilestones SHALL be 5

#### Scenario: Zero milestones
- **WHEN** the player never holds correct posture long enough for the first milestone (3s)
- **THEN** SessionStats.holdMilestones SHALL be 0

### Requirement: Persistent total milestone counter
The system SHALL persist a cumulative milestone counter in IndexedDB that increases with each session and never decreases. The counter SHALL be readable for display on the results screen.

#### Scenario: Counter accumulates across sessions
- **WHEN** session 1 achieves 3 milestones and session 2 achieves 5 milestones
- **THEN** the persistent total SHALL be 8

#### Scenario: Counter never decreases
- **WHEN** a session achieves 0 milestones
- **THEN** the persistent total SHALL remain unchanged

#### Scenario: Counter survives app restart
- **WHEN** the app is closed and reopened
- **THEN** the persistent total SHALL reflect all previously earned milestones

### Requirement: Mode-agnostic milestone system
The milestone timer SHALL operate for both violin and wrist focus modes, using the existing `repaired` signal from the session tracker's `recordFrame()` method.

#### Scenario: Violin mode milestones
- **WHEN** the focus mode is violin and the player maintains correct posture (repaired = true)
- **THEN** the hold timer rises and milestones fire identically to wrist mode

#### Scenario: Wrist mode milestones
- **WHEN** the focus mode is wrist and the angleDiff is within the deadzone
- **THEN** the hold timer rises and milestones fire

### Requirement: Golden flash on milestone
The system SHALL render a golden flash on the sapphire anchor when a milestone is achieved. The flash SHALL decay over 600ms. The flash SHALL be visible on both the main overlay anchor and the side-view anchor.

#### Scenario: Milestone triggers anchor flash
- **WHEN** a milestone is achieved
- **THEN** the sapphire anchor emits a golden (#FFD700) glow ring decaying over 600ms

#### Scenario: Flash on side-view anchor
- **WHEN** a milestone is achieved and the side-view is visible
- **THEN** the side-view anchor emits a synchronized golden flash

#### Scenario: No flash on hand line
- **WHEN** a milestone is achieved
- **THEN** no golden flash SHALL be rendered on the hand/rail line
