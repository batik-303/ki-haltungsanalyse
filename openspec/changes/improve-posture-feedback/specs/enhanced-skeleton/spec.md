## MODIFIED Requirements

### Requirement: Joint size hierarchy
Joints SHALL be rendered at different sizes based on anatomical importance:
- Large (radius ~8px): shoulders, hips
- Medium (radius ~5px): elbows, knees, wrists
- Small (radius ~3px): fingers, toes, face landmarks

Shoulder joints (landmarks 11, 12) SHALL be drawn with a visual offset outward along the shoulder-to-shoulder line by approximately 15% of the measured shoulder width on each side. This offset applies ONLY to the drawn position; all posture calculations SHALL continue using the original MediaPipe landmark coordinates.

#### Scenario: Shoulder joints rendered large
- **WHEN** left and right shoulder landmarks are visible
- **THEN** they are rendered as circles with radius ~8px

#### Scenario: Shoulder dots offset outward
- **WHEN** both shoulder landmarks are visible and the shoulder width is 300px
- **THEN** the left shoulder dot is drawn ~45px further left and the right shoulder dot is drawn ~45px further right compared to the raw MediaPipe landmark positions

#### Scenario: Offset does not affect calculations
- **WHEN** the shoulder asymmetry check calculates the height difference
- **THEN** it uses the original MediaPipe landmark y-coordinates, not the offset drawing positions

#### Scenario: Finger landmarks rendered small
- **WHEN** hand tip landmarks are visible
- **THEN** they are rendered as circles with radius ~3px

## ADDED Requirements

### Requirement: Correct head tilt angle calculation
The head tilt check SHALL measure the absolute angular deviation of the ear-to-ear line from horizontal (0°). A perfectly level head SHALL produce a measurement near 0°, regardless of whether the image is mirrored or which direction the user faces.

#### Scenario: Level head measures near zero
- **WHEN** the user's head is level (ears at approximately the same height)
- **THEN** the measured head tilt angle is between 0° and 5°, regardless of mirror flip

#### Scenario: Tilted head measures correct deviation
- **WHEN** the user tilts their head 30° to the left
- **THEN** the measured head tilt angle is approximately 30°

#### Scenario: Mirror flip does not affect measurement
- **WHEN** the video feed is horizontally flipped (mirror mode)
- **THEN** the head tilt angle measurement is identical to what it would be without the flip
