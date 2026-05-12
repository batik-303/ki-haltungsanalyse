## Why

The wrist mode main view currently renders rail lines, knick angles, ghost rails, and color-coded break lines directly on the player's body. These elements are visually unstable when the player moves, causing wackeln and flicker that disrupts concentration during practice. The directional detail (which way to correct) competes with the musician's focus on technique. Professional practice demands a calm main view with directional coaching relegated to peripheral vision.

## What Changes

- **Remove** rail lines, knick lines, ghost rail, perpendicular indicator, and endpoint dots from the wrist analyse-mode main view. Only the sapphire anchor point (following the wrist landmark) and its color remain.
- **Anchor color feedback**: The anchor point changes color based on wrist deviation severity (blue = correct, yellow = warning, lilac/purple = correction needed). No directional information in the main view.
- **Peripheral side-view becomes the sole directional channel**: The side-view line shows knick direction (left = Hals, right = Schnecke) and proportional strength. It must be clearer and more prominent since it is now the only place showing direction.
- **Adaptive baseline** for peripheral side-view: A slowly drifting baseline absorbs gradual position changes (player moving) so only actual wrist faults trigger directional feedback.
- Existing flow-mode behavior unchanged (already anchor-only).

## Capabilities

### New Capabilities
- `wrist-anchor-color`: Defines anchor-point-only feedback in the main view with color-based severity mapping (blue/yellow/lilac).
- `wrist-adaptive-baseline`: Slowly drifting reference angle that absorbs gradual position changes while preserving fast fault detection.

### Modified Capabilities
- `wrist-visual-feedback`: Removes rail lines and knick rendering from analyse-mode main view. Main view shows only anchor point with color.
- `wrist-flexion-tracking`: No signal processing changes, but the peripheral side-view becomes the sole consumer of directional angle data.

## Impact

- `src/rendering/wrist-lines.ts`: Major simplification — rail/knick rendering removed from analyse-mode, replaced by anchor color logic.
- `src/rendering/canvas-renderer.ts`: Analyse-mode wrist section simplified to anchor-only.
- `src/rendering/wrist-side-view.ts`: Enhanced as sole directional feedback channel — may need larger/thicker rendering, clearer color transitions.
- `src/core/analysis/wrist-analyzer.ts` or new module: Adaptive baseline logic.
- `src/rendering/sapphire-anchor.ts`: Color parameter support for wrist deviation state.
- No store schema changes expected. No external API changes.
