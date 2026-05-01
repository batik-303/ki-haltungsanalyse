# Tasks: Violin Anchor Redesign

## Implementation Tasks

- [x] Add `calibWristX` to `ViolinMasterPrint` in `src/core/types.ts`
- [x] Store `calibWristX` during calibration in `src/core/calibration/master-print.ts`
- [x] Rewrite `drawGoldenBand` in `src/rendering/golden-band.ts` — replace trapez with directional elastic line (gold ↓ / blue ↑, thickness + opacity scale with tension, direction arrow, pulse at >80)
- [x] Fix anchor position in `src/rendering/canvas-renderer.ts` violin section — use `calibWristX * width` for anchorX instead of live `wx`
- [x] Pass `driftDirection` from store to `drawGoldenBand` in canvas-renderer (needed for color selection)
