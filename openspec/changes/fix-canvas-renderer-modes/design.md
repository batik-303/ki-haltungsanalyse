## Context

`src/rendering/canvas-renderer.ts` is the single render dispatch function called every animation frame from the detection loop. It reads store state via `getState()` and draws mode-specific visual feedback onto the canvas overlay.

Current state: A broken `if/else if` chain makes the wrist and violin branches structurally unreachable. The shoulder block absorbs everything due to mismatched braces. Additionally, violin-specific rendering code (deadzone snap, calibWristX/Y) was pasted into the shoulder mode's flow branch, creating nonsensical logic paths.

## Goals / Non-Goals

**Goals:**
- Restore correct control flow: each `focusMode` branch (`shoulder`, `wrist`, `violin`) executes independently at the top level
- Remove misplaced violin code from the shoulder branch
- Fix wrist glow state persistence (module-level variables)
- Preserve all existing rendering behavior per mode (no visual changes beyond "it works now")

**Non-Goals:**
- Refactoring the renderer into separate files per mode (future improvement)
- Adding new rendering features
- Changing the render API or store interface
- Fixing the unused `filteredWristCoords`/`wristForeshorteningConfidence` destructuring warnings (cosmetic)

## Decisions

### 1. Restructure as flat if/else-if chain

The renderer uses a single flat `if (shoulder) {} else if (wrist) {} else if (violin) {}` pattern. This was always the intent — we restore it rather than introducing a dispatch map or strategy pattern.

**Alternative considered**: Mode-specific render functions dispatched via `Record<FocusMode, RenderFn>`. Rejected — adds complexity for no immediate benefit. Can be done later as a clean-up pass.

### 2. Shoulder mode: simple flow anchor + pre-cal preview only

The shoulder branch should contain only its own logic:
- Calibrated + flow → anchor at right edge
- Calibrated + analyse → golden band between ear/shoulder + anchor at shoulder
- Pre-calibration → pulse anchor at shoulder + connector rectangle

All violin code (calibWristX, deadzone, snap-to-grid) is removed from this branch.

### 3. Module-level glow variables for wrist

Move `wristGlowLevel`, `wristGlowDecay`, and `lastWristRepaired` outside `renderFrame` so they persist across frames. Currently they're re-initialized to 0/false every call, making the flash effect invisible.

### 4. Remove duplicate `drawWristSideView` call

The wrist branch currently calls `drawWristSideView` twice — once inside `!isFlow` and once unconditionally. Keep only the unconditional call (it already handles both modes).

## Risks / Trade-offs

- **[Shoulder flow mode may look empty]** → The shoulder flow mode never had its own proper rendering (the code there was actually violin code). After the fix, shoulder-flow will show a simple anchor at right edge. This matches original intent but may need enhancement later.
- **[Manual testing required]** → No automated visual tests exist. Each mode × view-mode combination (6 states) needs manual verification. Mitigation: quick checklist in tasks.
- **[Single large file edit]** → The fix touches most of the file. Mitigation: rewrite the entire function body in one pass for consistency rather than patching individual braces.
