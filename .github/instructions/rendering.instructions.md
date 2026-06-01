---
description: "Use when working in src/rendering/ — canvas drawing, pure render functions, store reads via getState(). Covers render dispatch, module-level glow state, and CSS-mirror awareness."
applyTo: "src/rendering/**/*.ts"
---

# Rendering Layer Rules

## Import Boundaries
- **NEVER** import from `react` or `components/`
- Read store via `import { usePoseStore } from '@/store/pose-store'` → call `.getState()` (NOT a React subscription)
- Import types from `@/core/types`

## Render Functions
- Pure functions with `ctx: CanvasRenderingContext2D` as first argument
- `drawXxx` prefix convention (e.g., `drawSilhouette`, `drawSapphireAnchor`)
- No React hooks, no side effects beyond canvas drawing

## Module-Level State
- Some renderers use module-level variables for glow decay timers (e.g., `wristGlowLevel`, `repairGoldenGlow`)
- These persist across frames without going through React or Zustand
- Keep this state minimal — only for visual continuity between frames

## CSS Mirror Awareness
- Canvas is CSS-mirrored (selfie view) — drawing on the LEFT canvas edge appears on the RIGHT of the screen
- Wrist side-view: desktop draws on left canvas edge (= right screen edge after mirror)
- Account for this in all coordinate calculations

## Render Dispatch
- Entry point: `renderFrame()` in `canvas-renderer.ts`
- Dispatch order: clear → background → silhouette → mode-specific → overlays
- Mode-specific rendering branches on `focusMode` (shoulder | wrist | violin)
