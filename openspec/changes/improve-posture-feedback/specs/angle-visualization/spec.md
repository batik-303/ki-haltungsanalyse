## ADDED Requirements

### Requirement: Angle arcs drawn at measured joints
The system SHALL draw a visible arc at each joint where an angle is measured, showing the angular span between the two limb segments meeting at that joint.

#### Scenario: Left elbow angle arc in single-check mode
- **WHEN** mode 3 (Handgelenk links) is active and the left elbow landmark is visible
- **THEN** an arc is drawn at the left elbow joint between the upper-arm and forearm segments, spanning the measured angle

#### Scenario: Right elbow angle arc
- **WHEN** mode 4 (Ellbogen rechts) is active and the right elbow landmark is visible
- **THEN** an arc is drawn at the right elbow joint between the upper-arm and forearm segments, spanning the measured angle

#### Scenario: Head tilt angle visualization
- **WHEN** mode 1 (Kopfneigung) is active and both ear landmarks are visible
- **THEN** a horizontal reference line is drawn through the ear midpoint, and the tilt angle is shown as the deviation from that reference

### Requirement: Numeric angle labels at joints
The system SHALL display the measured angle value as a numeric label (e.g., "142°") positioned near the joint where the angle is measured.

#### Scenario: Angle label next to elbow
- **WHEN** the left elbow angle is measured as 142°
- **THEN** the text "142°" is displayed near the left elbow joint on the video feed

#### Scenario: Head tilt label near ears
- **WHEN** the head tilt is measured as 12°
- **THEN** the text "12°" is displayed near the ear-to-ear midpoint on the video feed

#### Scenario: Shoulder asymmetry label
- **WHEN** the shoulder height difference is measured
- **THEN** the relative difference value is displayed between the two shoulder joints

### Requirement: Color-coded angle arcs based on threshold proximity
The angle arc and numeric label SHALL be color-coded based on the measured value's relationship to the configured thresholds:
- Green: value is within acceptable range (no warning)
- Orange: value is near the threshold boundary (within 20% of threshold)
- Red: value exceeds the threshold (warning active)

#### Scenario: Angle in safe range
- **WHEN** the left elbow angle is 155° (threshold min is 140°)
- **THEN** the arc and label are drawn in green

#### Scenario: Angle near threshold
- **WHEN** the left elbow angle is 145° (threshold min is 140°, 20% band = 8°, so near-zone starts at 148°)
- **THEN** the arc and label are drawn in orange

#### Scenario: Angle exceeds threshold
- **WHEN** the left elbow angle is 130° (threshold min is 140°)
- **THEN** the arc and label are drawn in red

### Requirement: Angle arcs adapt to check mode
In all-checks mode (mode 0), angle arcs SHALL only be drawn for checks that currently have active warnings to avoid visual clutter. In single-check mode (modes 1-5), the angle arc for the active check SHALL always be drawn regardless of warning state.

#### Scenario: All-checks mode with one warning
- **WHEN** mode 0 is active and only the Handgelenk links check has a warning
- **THEN** only the left elbow angle arc is drawn, no arcs for other checks

#### Scenario: All-checks mode with no warnings
- **WHEN** mode 0 is active and all checks pass
- **THEN** no angle arcs are drawn

#### Scenario: Single-check mode always shows arc
- **WHEN** mode 3 is active and the left elbow angle is 160° (no warning)
- **THEN** the left elbow angle arc is still drawn (in green)
