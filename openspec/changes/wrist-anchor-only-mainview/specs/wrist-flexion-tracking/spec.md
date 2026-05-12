## ADDED Requirements

### Requirement: Peripheral side-view is sole directional consumer
The peripheral side-view SHALL be the only rendering module that uses bend direction and angular deviation to display directional feedback. No other renderer SHALL draw directional indicators based on wrist flexion data.

#### Scenario: Wrist deviation with directional display
- **WHEN** wrist deviation exceeds the deadzone threshold
- **THEN** only the peripheral side-view SHALL render the directional knick line
- **AND** the main view SHALL show only anchor color change without directional indicators
