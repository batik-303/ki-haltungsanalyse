# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KI-Haltungsanalyse für Musiker — a real-time, on-device AI posture analysis tool for violinists. Uses MediaPipe pose estimation via webcam to detect harmful postural habits and provide live correction hints. All processing happens locally; no cloud dependency.

## Setup & Running

```bash
pip install -r requirements.txt
python src/pose_estimation/geigen_haltung.py
```

The MediaPipe model (`pose_landmarker_full.task`, ~30 MB) is auto-downloaded to `src/pose_estimation/` on first run if missing.

Press `q` or `ESC` to quit the live feed.

## Testing

```bash
pytest
```

Tests live in `tests/` (currently empty — no tests written yet).

## Architecture

**Single active module:** `src/pose_estimation/geigen_haltung.py` (~540 lines) contains the full pipeline:

1. **`HaltungsGrenzwerte`** — dataclass with threshold values for 5 posture checks (shoulder protrusion, left wrist angle, head tilt, shoulder asymmetry, right elbow angle). These values are preliminary and awaiting validation by biomechanics experts.

2. **`HaltungsAnalyse`** — main class orchestrating detection:
   - Initializes MediaPipe Tasks API `PoseLandmarker` (VIDEO mode, 30 fps)
   - `analysiere()` runs all 5 checks per frame and returns warnings
   - Each `_pruefe_*()` method computes a joint angle or height ratio against thresholds
   - Angle computation: cosine-based 2D formula over MediaPipe's 33-point skeleton
   - Landmarks with visibility < 0.5 are skipped

3. **Visualization** — draws skeleton with color-coded warnings (green/orange/red) and correction hint text overlaid on the OpenCV window

**Data flow:**
```
Webcam → OpenCV.VideoCapture → MediaPipe PoseLandmarker → 5 posture checks → color-coded overlay → imshow
```

**Planned but empty:** `src/haltungslogik/` (separate logic layer), `src/ui/` (UI framework)

## Key Constraints

- Python prototype only — mobile deployment (React Native/Flutter) is a later phase
- Thresholds in `HaltungsGrenzwerte` must not be adjusted without domain expert review (Prof. Dr. Blum for biomechanics, Prof. Bergmann for pedagogy)
- All inference must remain on-device; no cloud upload of video or pose data
