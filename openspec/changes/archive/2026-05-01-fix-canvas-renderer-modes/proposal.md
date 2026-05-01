## Why

The canvas renderer (`src/rendering/canvas-renderer.ts`) has a broken brace structure that nests the wrist and violin mode branches inside the shoulder mode's `if` block. This makes all mode-specific rendering — anchor, golden band, return glow, wrist lines — completely unreachable when `focusMode` is `'wrist'` or `'violin'` (the default). The app starts, the camera runs, MediaPipe detects landmarks, but no visual feedback renders. TypeScript confirms this with "unintentional comparison" errors on lines 166 and 302.

## What Changes

- **Fix brace structure**: Close the shoulder mode block properly so that `else if (focusMode === 'wrist')` and `else if (focusMode === 'violin')` are top-level siblings, not nested children.
- **Remove misplaced violin code from shoulder branch**: Violin deadzone/snap logic was copy-pasted into the shoulder mode's `if (isFlow)` block. It must be removed from there.
- **Restore shoulder mode's own rendering**: The shoulder mode's pre-calibration preview (pulse anchor + connector rectangle) is currently orphaned inside the `isFlow` scope where it doesn't belong.
- **Fix module-level glow variables**: Wrist glow state variables are declared inside the function body (reset every frame). They need to be actual module-level variables to persist across frames.

## Capabilities

### New Capabilities

_(none — this is a structural fix, not a new feature)_

### Modified Capabilities

_(no spec-level behavior changes — the intended behavior already matches the existing code's intent, the braces just prevent it from executing)_

## Impact

- **Primary file**: `src/rendering/canvas-renderer.ts` (~350 lines, full rewrite of control flow structure)
- **No API changes**: `renderFrame` signature stays identical
- **No store changes**: All state already flows correctly from `use-pose-detection.ts` → store → renderer
- **Risk**: Low. The fix restores the originally intended behavior. All three modes (shoulder, wrist, violin) will render their respective feedback again.
- **Testing**: Manual verification — calibrate in each mode and confirm anchor + feedback renders.
