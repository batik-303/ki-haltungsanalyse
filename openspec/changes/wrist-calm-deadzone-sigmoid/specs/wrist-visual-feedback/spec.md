## MODIFIED Requirements

### Requirement: Yellow dashed line on deviation
The system SHALL render a directional deviation line from the wrist anchor to the hand segment when the effective deviation is above the silence threshold. Color and intensity SHALL be driven by a sigmoid mapping of effective angle: subtle near 4 degrees, warning toward yellow in mid range, and correction toward lilac/purple above 8 degrees.

#### Scenario: Deviation above silence threshold
- **WHEN** effective wrist deviation is greater than 4 degrees
- **THEN** a directional deviation line SHALL be rendered
- **AND** its color/intensity SHALL follow sigmoid escalation rather than a hard threshold jump

#### Scenario: Within silence threshold
- **WHEN** effective wrist deviation is less than or equal to 4 degrees
- **THEN** warning/correction deviation coloration SHALL NOT be rendered
- **AND** static blue baseline rail SHALL be shown instead

### Requirement: No visual clutter in correct state
When effective wrist deviation is less than or equal to 4 degrees, the system SHALL render the complete rail line and sapphire anchor in a static calm state with no warning animation.

#### Scenario: Calm posture hold
- **WHEN** effective wrist deviation stays less than or equal to 4 degrees for a session segment
- **THEN** rail and anchor SHALL remain visible in static blue presentation
- **AND** warning/correction color transitions SHALL not appear

### Requirement: Synchronized peripheral side-view
The peripheral side-view SHALL use the same effective deviation state machine as the main overlay (`silent`, `warning`, `correction`) so both views communicate equivalent posture state timing and recovery.

#### Scenario: Shared state timing
- **WHEN** the main overlay transitions between silent and warning/correction states
- **THEN** the side-view SHALL transition using the same effective deviation frame state
- **AND** recovery to silent SHALL occur in the same transition window
