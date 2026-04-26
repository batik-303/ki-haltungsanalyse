## Why

The current posture analysis prototype has several usability and correctness issues discovered during testing: the head tilt check always fires red due to a math bug in the angle calculation, warnings flicker rapidly between states because there is no temporal smoothing, angle values and thresholds are invisible to the user making it hard to understand what the system measures, and German text with umlauts (ö, ü, ä) renders as `??` because OpenCV's Hershey fonts only support ASCII.

## What Changes

- **Fix head tilt angle calculation**: The `atan2(dy, dx)` result is not normalized to a deviation-from-horizontal value, causing near-180° readings on level heads (especially after mirror flip). Replace with a correct deviation calculation.
- **Add temporal smoothing with hysteresis**: Introduce a rolling average over recent frames and use separate enter/exit thresholds to prevent rapid red↔green flickering at boundary values.
- **Render angle values and arcs on skeleton**: Draw measured angles as numeric labels and visual arcs at the relevant joints so users can see exactly what is being measured and how close they are to thresholds.
- **Fix Unicode text rendering**: Replace `cv2.putText` (ASCII-only Hershey fonts) with Pillow-based text rendering to support German umlauts and special characters.
- **Improve shoulder marker visual positioning**: Optionally offset drawn shoulder dots outward along the shoulder line so the visual representation better matches where users expect to see their shoulders, while keeping actual joint coordinates for calculations.

## Capabilities

### New Capabilities
- `angle-visualization`: Draw measured angle arcs and numeric labels at joints on the skeleton overlay, with color-coded threshold indicators (green/orange/red zones).
- `temporal-smoothing`: Rolling-average smoothing of measured values across frames with hysteresis bands for warning state transitions to prevent flickering.
- `unicode-text-rendering`: Pillow-based text rendering pipeline replacing cv2.putText for full Unicode support (umlauts, special characters).

### Modified Capabilities
- `enhanced-skeleton`: Shoulder joint dots get optional visual offset outward for better anatomical alignment. Angle arcs integrate into the existing skeleton drawing.

## Impact

- **Code**: `src/pose_estimation/geigen_haltung.py` — all changes concentrated in this single module (HaltungsAnalyse checks, Visualisierung class, main loop)
- **Dependencies**: Adds `Pillow` to `requirements.txt` for Unicode text rendering
- **Thresholds**: Head tilt check will behave correctly after the math fix; existing threshold value (25°) may need re-evaluation once the calculation is correct. Other thresholds remain unchanged but will feel less aggressive due to smoothing.
- **Performance**: Rolling average adds negligible overhead. Pillow text rendering is slightly slower than cv2.putText but acceptable at 30fps for overlay text.
