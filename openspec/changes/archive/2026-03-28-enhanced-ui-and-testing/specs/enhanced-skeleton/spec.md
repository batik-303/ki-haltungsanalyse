## ADDED Requirements

### Requirement: Color-coded skeleton segments by body region
The skeleton SHALL use distinct colors for each body region:
- Head/face landmarks: white
- Arms (shoulder to wrist, both sides): blue
- Torso (shoulders to hips): green
- Legs (hips to ankles/feet): orange

#### Scenario: Arm segments drawn in blue
- **WHEN** a pose is detected and the skeleton is rendered
- **THEN** connections from shoulder→elbow→wrist on both sides are drawn in blue

#### Scenario: Torso segments drawn in green
- **WHEN** a pose is detected and the skeleton is rendered
- **THEN** connections between shoulders, between hips, and shoulder→hip are drawn in green

### Requirement: Glow outline effect on skeleton lines
Each skeleton line SHALL be drawn with a glow effect: a thicker dark (black) line rendered first, then the colored line drawn on top. This ensures visibility against any background.

#### Scenario: Skeleton visible on bright background
- **WHEN** the camera background is bright/white
- **THEN** skeleton lines remain clearly visible due to the dark outline beneath the colored line

#### Scenario: Glow line thickness
- **WHEN** a skeleton line is rendered
- **THEN** the dark outline line has thickness ~6px and the colored line on top has thickness ~2–3px

### Requirement: Joint size hierarchy
Joints SHALL be rendered at different sizes based on anatomical importance:
- Large (radius ~8px): shoulders, hips
- Medium (radius ~5px): elbows, knees, wrists
- Small (radius ~3px): fingers, toes, face landmarks

#### Scenario: Shoulder joints rendered large
- **WHEN** left and right shoulder landmarks are visible
- **THEN** they are rendered as circles with radius ~8px

#### Scenario: Finger landmarks rendered small
- **WHEN** hand tip landmarks are visible
- **THEN** they are rendered as circles with radius ~3px

### Requirement: Red highlighting on failing checks
When a posture check detects a problem, the skeleton segments involved in that check SHALL turn red, replacing their normal body-region color.

#### Scenario: Failed wrist check turns segments red
- **WHEN** the Handgelenk links check reports a warning
- **THEN** the left shoulder→elbow and left elbow→wrist skeleton segments and their joints are rendered in red instead of blue

#### Scenario: No failure keeps normal colors
- **WHEN** all posture checks pass
- **THEN** all skeleton segments remain in their normal body-region colors
