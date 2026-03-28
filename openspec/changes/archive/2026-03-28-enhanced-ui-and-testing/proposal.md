## Why

The current prototype renders warning text directly on the video feed without contrast backing, making it unreadable on bright or busy backgrounds. The skeleton visualization is minimal (single color, thin lines, uniform joint sizes), providing no visual differentiation between body segments or problem areas. Additionally, all 5 posture checks run simultaneously with no way to isolate and test individual checks, slowing down iterative development and validation of each detection algorithm.

## What Changes

- **Semi-transparent warning panel**: Dark overlay behind all warning text and correction hints so they remain readable regardless of camera background
- **Check selector menu**: Live keyboard controls (0–5) to switch between all-checks mode and single-check mode, hiding irrelevant checks when testing a specific one
- **Color-coded skeleton segments**: Arms (blue), torso (green), legs (orange) with distinct colors per body region
- **Glow/outline effect on skeleton**: Thicker dark line drawn behind the colored line for contrast against any background
- **Joint size hierarchy**: Larger dots for major joints (shoulders, hips), medium for elbows/knees/wrists, small for fingers/toes/face
- **Red highlighting on failure**: Skeleton segments involved in a failing check turn red to visually pinpoint the problem area

## Capabilities

### New Capabilities
- `check-selector`: Live keyboard-driven mode switching (0=all, 1-5=individual check) that filters which posture checks run and which skeleton segments are highlighted
- `enhanced-skeleton`: Color-coded body segments, glow effect, joint size hierarchy, and red failure highlighting on the skeleton overlay
- `warning-panel`: Semi-transparent dark panel behind warning text with mode indicator, replacing raw text-on-video rendering

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Code affected**: `src/pose_estimation/geigen_haltung.py` — `Visualisierung` class (skeleton drawing, warning rendering), `main()` loop (keyboard handling, mode state), `HaltungsAnalyse.analysiere()` (check filtering)
- **No new dependencies**: All features use existing OpenCV drawing primitives (`cv2.addWeighted`, `cv2.line`, `cv2.circle`, `cv2.rectangle`)
- **No API changes**: This is a UI-only change; posture detection logic and thresholds remain untouched
