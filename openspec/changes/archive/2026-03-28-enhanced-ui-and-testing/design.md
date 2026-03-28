## Context

The current `geigen_haltung.py` has a monolithic main loop that runs all 5 posture checks every frame and renders results with basic `cv2.putText` directly on the video. The `Visualisierung` class draws a uniform single-color skeleton. There is no way to isolate individual checks for testing or demonstration.

The file is ~540 lines, single-module. All changes stay within this file.

## Goals / Non-Goals

**Goals:**
- Readable warning text on any camera background via semi-transparent panels
- Keyboard-driven check selector (0–5) that works live without restarting
- Visually differentiated skeleton with color-coded segments, glow, size hierarchy, and red failure highlighting
- Keep changes contained to the existing file structure

**Non-Goals:**
- Refactoring into multiple modules (planned separately)
- Changing posture detection thresholds or adding new checks
- Adding audio feedback or haptic alerts
- Persistent settings or configuration file support

## Decisions

### 1. Keyboard-based mode switching over CLI flags

Modes are selected by pressing 0–5 during the live feed. No CLI arguments needed.

**Rationale**: Faster iteration — switch checks without restarting the webcam pipeline. CLI flags would require stopping, restarting, and waiting for camera init each time.

**Alternative considered**: CLI `--check` flag — rejected because it breaks the fast-feedback testing loop.

### 2. Single-check mode hides other checks entirely

When a check is selected (1–5), `HaltungsAnalyse.analysiere()` runs only that check. The skeleton shows full body but with relevant joints highlighted and the rest dimmed to gray.

**Rationale**: Reduces visual noise when debugging a specific detection. Full skeleton in dim provides spatial context without distraction.

**Alternative considered**: Run all checks but only display warnings for the selected one — rejected because it still clutters the skeleton and doesn't help isolate detection behavior.

### 3. Skeleton segment color mapping as a data structure

Define a dictionary mapping each `POSE_CONNECTIONS` entry to a body region (arms, torso, legs, head), and each region to a color. Joint importance levels (large/medium/small) also defined as a lookup by landmark index.

**Rationale**: Keeps the drawing loop clean — iterate connections, look up color and thickness. Easy to adjust colors later.

### 4. Glow effect via double-draw

Each skeleton line is drawn twice: first a thicker dark line (black, thickness ~6), then the colored line on top (thickness ~2–3). Same for joints.

**Rationale**: Simple, no extra dependencies. Creates contrast against both light and dark backgrounds. Performance cost is negligible (extra draw calls on a single frame).

### 5. Warning panel via cv2.addWeighted alpha blending

Create a region-of-interest (ROI) on the frame, blend a dark rectangle at ~60% opacity, then draw text on top.

**Rationale**: Native OpenCV approach, no additional dependencies. Transparent enough to still see the video underneath, opaque enough for text contrast.

## Risks / Trade-offs

- **[Skeleton color mapping maintenance]** → Adding new checks later requires updating the segment-to-region mapping. Mitigation: keep the mapping centralized as a module-level constant.
- **[Performance of double-draw]** → Drawing each line twice doubles line-draw calls. Mitigation: at ~35 connections × 2 draws, this is trivial for modern hardware at 30 fps.
- **[Mode state complexity]** → Adding mode state to the main loop increases its responsibility. Mitigation: encapsulate mode in a small state variable (int 0–5), pass to `analysiere()` and `zeichne_skelett()`.
