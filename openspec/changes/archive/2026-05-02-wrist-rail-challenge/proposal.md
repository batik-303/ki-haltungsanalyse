## Why

The current wrist mode uses an invisible angle measurement with feedback only on deviation — the musician never sees what "straight" looks like. Combined with noisy 3D z-axis data from MediaPipe and a hard-reset 200ms timer, the experience feels unstable and punitive. A visible "rail" line that shows the forearm-hand alignment at all times, plus a forgiving 5-second decay challenge, would make the wrist mode pedagogically useful and visually stable.

## What Changes

- **Always-visible rail line**: After calibration, a continuous line from wrist through MCP along the forearm axis is always rendered — showing the player what "straight" looks like even when posture is correct.
- **"Broken line" feedback on deviation**: When the wrist bends (toward scroll or neck), the MCP segment visibly breaks away from the rail, shown as a yellow dashed line. The player's goal: repair the line.
- **2D collinearity measurement + z-boost**: Replace 3D flexion-plane projection with a primary 2D (x,y) collinearity check. Use filtered z-data only as a secondary boost signal for neck-direction bends that have small 2D footprint.
- **5-second decay timer**: Replace the 200ms hard-reset hysteresis with a continuous timer that rises when the line is straight and decays (3× speed) on deviation. Reaching 5s triggers a golden anchor flash. Forgiving of brief wobbles, punishes sustained bending.
- **Synchronized side-view update**: The peripheral side-view reflects the rail/break concept — always showing the arm-hand alignment, not only on deviation.

## Capabilities

### New Capabilities
- `wrist-rail-challenge`: 5-second decay timer that rewards sustained straight-wrist posture with a golden anchor flash. Rises at +dt when straight, decays at -3×dt when bent, resets to 0 on success.

### Modified Capabilities
- `wrist-flexion-tracking`: Switch primary measurement from 3D flexion-plane projection to 2D collinearity (Elbow→Wrist→MCP angle in screen coordinates). Add z-boost hybrid for neck-direction detection. Deadzone tuned for 2D stability.
- `wrist-visual-feedback`: Replace "nothing on correct" with always-visible rail line. Replace "yellow line on deviation" with "broken line" metaphor showing MCP departure from the rail. Side-view always renders arm+hand alignment.

## Impact

- `src/core/analysis/wrist-analyzer.ts` — New 2D collinearity function, z-boost logic, decay timer factory
- `src/rendering/wrist-lines.ts` — Complete rewrite: rail line (always visible) + break line (on deviation)
- `src/rendering/wrist-side-view.ts` — Always render arm+hand lines, not only on deviation
- `src/rendering/canvas-renderer.ts` — Wire up rail rendering in correct state, pass timer state
- `src/hooks/use-pose-detection.ts` — Switch to 2D measurement, integrate decay timer
- `src/core/calibration/master-print.ts` — MasterPrint may need 2D baseline angle
- `tests/` — New tests for 2D collinearity, decay timer, z-boost threshold
