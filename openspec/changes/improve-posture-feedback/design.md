## Context

The prototype (`geigen_haltung.py`, ~540 lines) runs all posture analysis, visualization, and webcam handling in a single module. During testing, several UX and correctness issues surfaced:

1. Head tilt check fires red constantly due to `atan2` returning near-180° for level heads (sign of dx flips after mirror)
2. No temporal smoothing — warnings flicker frame-to-frame at threshold boundaries
3. Users cannot see what angles are being measured or what the target range is
4. German umlauts render as `??` because `cv2.putText` only supports ASCII
5. Shoulder landmarks appear inward of where users expect their shoulders to be

All changes stay within the single-module architecture. No new modules or architectural layers are introduced.

## Goals / Non-Goals

**Goals:**
- Fix the head tilt calculation so it correctly measures deviation from horizontal
- Add temporal smoothing and hysteresis so warnings transition gradually, not per-frame
- Show measured angles visually on the skeleton (arcs + numeric labels)
- Support full Unicode in all on-screen text via Pillow
- Improve shoulder dot placement for visual clarity

**Non-Goals:**
- Changing any threshold values (those require domain expert review)
- Extracting logic into separate modules (`src/haltungslogik/`, `src/ui/`)
- Adding new posture checks
- Mobile deployment or performance optimization beyond 30fps target

## Decisions

### 1. Head tilt angle fix: normalize atan2 to deviation from horizontal

**Choice:** Replace `abs(math.degrees(math.atan2(dy, dx)))` with a calculation that measures the absolute angular deviation of the ear-to-ear line from 0° horizontal.

**Approach:** Compute `atan2(dy, dx)` in degrees, then normalize to the range [-90, +90] representing the tilt. A perfectly level head gives ~0°, a tilted head gives the deviation in degrees.

```
neigung = math.degrees(math.atan2(dy, dx))
# Normalize: if dx < 0 (ears "reversed" after mirror flip),
# atan2 returns ~±180°. We want deviation from horizontal.
if neigung > 90:
    neigung = 180 - neigung
elif neigung < -90:
    neigung = -180 - neigung
neigung = abs(neigung)
```

**Alternative considered:** Using `abs(dy) / abs(dx)` ratio instead of angle — rejected because it lacks geometric meaning and is harder to interpret with thresholds in degrees.

### 2. Temporal smoothing: exponential moving average + hysteresis

**Choice:** Exponential Moving Average (EMA) per check, with separate enter/exit thresholds.

**Rationale:** EMA is simpler than a fixed-window rolling average (no buffer needed, just one state variable per check). Combined with hysteresis, it eliminates flickering.

**Parameters:**
- EMA alpha: `0.3` (new frame weight — responsive but smooth, ~3-4 frame effective window)
- Hysteresis band: ~20% below the trigger threshold for the "exit" threshold

**Data structure:** A dict in `HaltungsAnalyse` tracking `{check_name: {"smoothed_value": float, "warning_active": bool}}` per check.

**Alternative considered:** Fixed-size deque with mean — rejected because it requires more memory and the cutoff is abrupt rather than smooth.

### 3. Angle visualization: arcs and labels drawn by Visualisierung

**Choice:** The `HaltungsAnalyse` checks return measured angle/value as part of the `Warnung` dataclass (or a new return structure). `Visualisierung` draws:
- A small arc at the measured joint showing the angle
- A numeric label (e.g., "142°") next to the joint
- Color-coded arc: green if in OK range, orange if near threshold, red if over

**Integration:** Add a `messwert` (measured value) field and a `gelenk_position` field to the `Warnung` dataclass so the visualizer knows where and what to draw.

For checks that don't have a simple joint angle (e.g., shoulder protrusion uses z-depth), skip the arc and only show the numeric value as a label near the relevant body part.

**Alternative considered:** Separate "measurement" return alongside warnings — rejected to keep the API simple. Enriching `Warnung` is less invasive.

### 4. Unicode text: Pillow-based rendering

**Choice:** Add a helper function that renders text onto the OpenCV frame via PIL:
1. Convert BGR numpy array → PIL Image
2. Draw text with `ImageDraw.text()` using a system TTF font (or bundled font)
3. Convert back to numpy array

**Optimization:** Only convert the text panel region (ROI), not the full frame, to minimize overhead.

**Font selection:** Use a bundled or system sans-serif font that supports Latin Extended (for ä, ö, ü, ß). Fallback: DejaVu Sans (commonly available, open license).

**Alternative considered:** `cv2.freetype` module — rejected because it requires `opencv-contrib-python` which is a heavier dependency and not always pre-installed.

### 5. Shoulder dot offset: visual-only adjustment

**Choice:** When drawing shoulder joint dots (landmarks 11, 12), offset the drawn position outward along the shoulder-to-shoulder line by a fixed factor (e.g., 15% of shoulder width on each side). All calculations continue using the original MediaPipe landmark positions.

This is purely visual — the posture checks are unaffected.

**Alternative considered:** No change (just document the limitation) — rejected because users found it confusing during testing.

## Risks / Trade-offs

- **EMA alpha tuning** → The `0.3` alpha is a starting point. If feedback feels too laggy or still flickers, it needs adjustment. Mitigation: make alpha configurable in `HaltungsGrenzwerte` so it can be tuned without code changes.
- **Pillow performance** → Converting frame regions to PIL and back adds latency. Mitigation: only convert the text panel ROI (~420×200 pixels), not the full 1280×720 frame. At this ROI size, overhead is <1ms.
- **Font availability** → If no suitable TTF font is found on the system, text rendering fails. Mitigation: bundle a small open-license font (DejaVu Sans, ~700KB) or fall back to ASCII-transliterated text.
- **Angle arc clutter** → Drawing arcs for all 5 checks simultaneously (mode 0) may be visually noisy. Mitigation: in all-checks mode, only draw arcs for checks that have warnings. In single-check mode, always draw the arc.
- **Head tilt threshold re-evaluation** → After fixing the math, the 25° threshold may be too loose or too tight for correct values. This is not addressed here (requires domain expert), but the angle visualization will make it easy to evaluate.
