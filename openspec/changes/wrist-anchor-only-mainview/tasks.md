## 1. Remove rail lines from main view

- [x] 1.1 Remove `drawWristLines()` call from canvas-renderer in wrist analyse-mode
- [x] 1.2 Verify main view shows only silhouette and anchor point (manual test)

## 2. Anchor color parameterization

- [x] 2.1 Add optional `colorOverride` parameter to `drawSapphireAnchor()`
- [x] 2.2 Apply color tint to the anchor gradient when `colorOverride` is provided
- [x] 2.3 Pass color from canvas-renderer based on `wristRailIsBlue` and `wristRailAngleDeg` (blue / yellow #F5C842 / lilac #9B59B6)
- [x] 2.4 Verify anchor changes color on deviation (manual test)

## 3. Adaptive baseline

- [x] 3.1 Add adaptive baseline EMA (alpha ~0.02) to wrist analysis pipeline in `use-pose-detection.ts`
- [x] 3.2 Pass baseline-corrected angle to peripheral side-view via store or render call
- [x] 3.3 Verify peripheral stays calm during gradual position changes (manual test)

## 4. Peripheral side-view tuning

- [x] 4.1 Increase side-view line thickness and visual angle multiplier for prominence
- [x] 4.2 Verify peripheral knick is clearly visible as sole directional channel (manual test)
