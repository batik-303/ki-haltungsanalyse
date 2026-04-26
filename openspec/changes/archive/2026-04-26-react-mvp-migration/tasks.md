## 1. Project Scaffold

- [x] 1.1 Initialize Vite + React + TypeScript project in the repo root (alongside existing `outputs/`)
- [x] 1.2 Install and configure Tailwind CSS v4
- [x] 1.3 Initialize shadcn/ui with custom dark theme (background #0a1628, gold #DAA520, sapphire #2196F3, deep blue #1565C0)
- [x] 1.4 Install Zustand
- [x] 1.5 Install `@mediapipe/tasks-vision` as npm dependency and configure WASM asset path
- [x] 1.6 Create folder structure: `src/core/`, `src/store/`, `src/rendering/`, `src/hooks/`, `src/components/`
- [x] 1.7 Configure strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)

## 2. Core Types

- [x] 2.1 Create `src/core/types.ts` with shared types: `FocusMode`, `SensitivityLevel`, `Layer`, `Landmark`, `MasterPrint` (discriminated union for shoulder/wrist/violin variants), `FrameAnalysis`, `ZoneCounters`, `SessionStats`
- [x] 2.2 Create `src/core/config/sensitivity.ts` with the three sensitivity presets (low, med, high) and their threshold values

## 3. Core Signal Processing

- [x] 3.1 Implement `src/core/signal/one-euro-filter.ts` — One-Euro filter factory function with configurable minCutoff, beta, dCutoff
- [x] 3.2 Implement `src/core/signal/smoothing.ts` — Moving average with configurable window size (default 30)
- [x] 3.3 Implement `src/core/signal/tension.ts` — Tension score computation with dual-speed asymmetric approach rates, clamped 0-100

## 4. Core Analyzers

- [x] 4.1 Implement `src/core/analysis/shoulder-analyzer.ts` — Ear-to-shoulder distance analysis, deviation computation, tension target mapping from sensitivity thresholds
- [x] 4.2 Implement `src/core/analysis/wrist-analyzer.ts` — Wrist angle computation (elbow→wrist→index), bend direction via cross product, direction locking logic, tension target mapping
- [x] 4.3 Implement `src/core/analysis/violin-analyzer.ts` — Wrist Y drift computation, 60-second trend buffer, instant vs. trend blending (70/30 split at 0.04 threshold), tension target mapping
- [x] 4.4 Create `src/core/analysis/layer-classifier.ts` — Tension score to layer classification with mode-specific labels and status messages

## 5. Core Calibration & Session

- [x] 5.1 Implement `src/core/calibration/master-print.ts` — Master Print creation functions for each mode, typed interfaces
- [x] 5.2 Implement `src/core/calibration/distance-check.ts` — Shoulder width ratio validation (0.12-0.45 range), drift detection (25% threshold)
- [x] 5.3 Implement `src/core/session/session-tracker.ts` — Session lifecycle, zone frame counting, statistics computation, return-to-anchor event detection

## 6. Zustand Store

- [x] 6.1 Create `src/store/pose-store.ts` — Full typed store with all state slices: focusMode, sensitivity, masterPrint, calibration state, tensionScore, smoothedDeviation, currentLayer, session state, returnGlowTimer
- [x] 6.2 Create actions: `setFocusMode`, `setSensitivity`, `calibrate`, `updateFrame`, `endSession`, `reset`
- [x] 6.3 Create `src/store/selectors.ts` — Derived state selectors for statusColor, statusMessage, isCalibrationLocked, sessionDuration

## 7. Hooks (React Glue)

- [x] 7.1 Implement `src/hooks/use-pose-detection.ts` — MediaPipe PoseLandmarker lifecycle (load model, init camera, run detectForVideo in requestAnimationFrame loop), dispatch results to store and canvas renderer
- [x] 7.2 Implement `src/hooks/use-calibration.ts` — Countdown timer logic (3s standard, 10s timer variant), state transitions, doCapture orchestration
- [x] 7.3 Implement `src/hooks/use-voice-control.ts` — Web Speech API setup (de-DE), keyword detection ("Start"/"Los"/"Speichern"), activate/deactivate lifecycle

## 8. Canvas Rendering

- [x] 8.1 Create `src/rendering/canvas-renderer.ts` — Main render dispatch: reads store via getState(), clears canvas, calls mode-specific renderer, draws silhouette
- [x] 8.2 Implement `src/rendering/sapphire-anchor.ts` — Radial gradient anchor with glow ring, edge highlight, inner sparkle, ⚓ symbol, breathing pulse
- [x] 8.3 Implement `src/rendering/golden-band.ts` — Multi-layer tapered band (outer glow, main body, core, edge lines), pulsing at high tension, directional arrow
- [x] 8.4 Implement `src/rendering/freedom-space.ts` — Rectangular space between ear/shoulder, height shrinks with tension, color gradient blue→yellow→purple, breathing animation, pulsing border
- [x] 8.5 Implement `src/rendering/wrist-lines.ts` — Arm line, hand line (direction-colored), dashed reference line, glow overlay, angle text
- [x] 8.6 Implement `src/rendering/silhouette.ts` — Faint body outline connecting 8 landmark pairs at 6% opacity
- [x] 8.7 Implement `src/rendering/return-glow.ts` — Expanding ring animation with dual rings, white center flash, mode-specific color (gold for violin, blue for others)
- [x] 8.8 Implement `src/rendering/target-zone.ts` — Dashed target outline (head circle, shoulder line, body shape) shown before calibration

## 9. shadcn/ui Components

- [x] 9.1 Create `src/components/camera-view.tsx` — Layered container with video element, canvas overlay, and positioned child components
- [x] 9.2 Create `src/components/focus-mode-selector.tsx` — shadcn ToggleGroup with three mode options (🎻 Geige, 🤚 Handgelenk, 💪 Schulter)
- [x] 9.3 Create `src/components/sensitivity-selector.tsx` — shadcn ToggleGroup with three sensitivity levels
- [x] 9.4 Create `src/components/calibration-overlay.tsx` — Semi-transparent overlay with countdown display and instructional text
- [x] 9.5 Create `src/components/calibrate-controls.tsx` — Button group: main calibrate (locked/ready states), timer, voice, session end
- [x] 9.6 Create `src/components/status-bar.tsx` — Colored dot + text message, responsive to analysis state
- [x] 9.7 Create `src/components/info-panel.tsx` — Card with four labeled value fields (Abweichung, Spannung, Geglättet, Layer)
- [x] 9.8 Create `src/components/session-stats.tsx` — Card with duration, zone percentages, color-coded horizontal progress bar
- [x] 9.9 Create `src/components/distance-indicator.tsx` — Floating badge overlay on camera showing distance status
- [x] 9.10 Create `src/components/instructions.tsx` — Collapsible card with usage instructions
- [x] 9.11 Create `src/components/app.tsx` — Root layout composing all components with the camera view

## 10. Integration & Verification

- [x] 10.1 Wire the detection loop: usePoseDetection → core analyzers → store.updateFrame → canvas renderer reads store
- [x] 10.2 Wire calibration flow: calibrate controls → useCalibration → core master-print → store.calibrate
- [x] 10.3 Wire session lifecycle: calibration triggers session start, mode switch / end button triggers session end + stats display
- [ ] 10.4 Verify shoulder mode: calibrate, raise shoulder, confirm band/space responds, return-to-anchor glow works
- [ ] 10.5 Verify wrist mode: calibrate, bend wrist, confirm line coloring and angle display, direction locking works
- [ ] 10.6 Verify violin mode: calibrate, lower wrist, confirm golden band appears, drift trend buffer works
- [ ] 10.7 Verify sensitivity switching changes feedback responsiveness in real-time
- [ ] 10.8 Test side-by-side with original prototype in `outputs/Blue_Anchor_Prototyp.html` for behavior parity
