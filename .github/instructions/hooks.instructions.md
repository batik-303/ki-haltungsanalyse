---
description: "Use when working in src/hooks/ — rAF loop, MediaPipe integration, useRef mutable state, store bridging. Covers the triple-state system and detection loop lifecycle."
applyTo: "src/hooks/**/*.ts"
---

# Hooks Layer Rules

## Triple-State System
The app has **three parallel state layers** — choose correctly:

| Layer | Where | Use For |
|-------|-------|---------|
| **Zustand store** | `src/store/pose-store.ts` | React-visible UI state (session phase, calibration, navigation) |
| **useRef mutable** | Inside hooks | rAF-loop analysis state (filters, smoothers, timers) — NEVER in React state |
| **Module-level vars** | Inside renderers | Canvas glow decay timers, adaptive baselines |

**Analysis state should NEVER go in Zustand.** It belongs in `useRef` inside hooks.

## rAF Loop Pattern
- The rAF loop in `use-pose-detection.ts` is the **heartbeat** — it drives detection → analysis → store update → render
- All mutable loop state uses `xxxRef` pattern: `smootherRef`, `tensionRef`, `violinRef`, etc.
- `updateFrame()` is the **ONLY** path from rAF loop to store — uses conditional spread (undefined fields are NOT reset)
- Renderers read store via `usePoseStore.getState()` — **never** via React subscription

## Store Access in Hooks
- Write: `usePoseStore.getState().updateFrame(data)` or direct action calls
- Never use selector subscriptions (`usePoseStore((s) => s.field)`) in hooks — that's for components only

## MediaPipe Lifecycle
- WASM loaded from CDN via `@mediapipe/tasks-vision`
- `PoseLandmarker` created with `pose_landmarker_lite` on GPU
- Webcam at 640×480, `facingMode: 'user'`
- Microphone pre-granted for voice commands

## Calibration Reset
- When calibration changes, **all** rAF-loop refs must be reset (filters, smoothers, timers)
- Use the `resetAnalysisState` callback pattern — don't forget any ref
