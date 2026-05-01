## 1. Core Analysis

- [x] 1.1 Add `computeMCP()` function in `wrist-analyzer.ts` (midpoint of landmarks 17, 19)
- [x] 1.2 Add `computeFlexionExtensionAngle()` with plane projection algorithm
- [x] 1.3 Add vertical-arm fallback (|forearm × up| < 0.1 → 2D angle)
- [x] 1.4 Update `analyzeWrist()` to use new projection + MCP instead of old 3D angle
- [x] 1.5 Update `WristMasterPrint` type in `types.ts` (flexAngle, flexBendDir, calibArmLength2D)

## 2. Calibration

- [x] 2.1 Update `createMasterPrint()` in `master-print.ts` to compute and store flex-only angle with MCP
- [x] 2.2 Verify calibration captures correct reference for straight wrist

## 3. Rendering — Main Overlay

- [x] 3.1 Rewrite `drawWristLines()` in `wrist-lines.ts`: yellow dashed line (wrist→MCP) on deviation, nothing on correct
- [x] 3.2 Add MCP coordinates to `filteredWristCoords` in store (mx, my fields)
- [x] 3.3 Apply One-Euro filter to MCP coordinates in the detection hook
- [x] 3.4 Update `canvas-renderer.ts` wrist section to pass MCP coords and use new draw function

## 4. Rendering — Side-View

- [x] 4.1 Simplify `drawWristSideView()`: vertical arm + anchor + angled hand line
- [x] 4.2 Match deviation angle and color to main overlay (yellow dashed on deviation, blue on correct)
- [x] 4.3 Synchronize glow intensity with main anchor glow

## 5. Store & Hooks

- [x] 5.1 Extend `filteredWristCoords` type to include `mx`, `my` (MCP pixel coords)
- [x] 5.2 Update pose-detection hook to compute MCP and filter it through One-Euro

## 6. Tests

- [x] 6.1 Unit test: `computeMCP()` returns correct midpoint
- [x] 6.2 Unit test: `computeFlexionExtensionAngle()` isolates flex from radial/ulnar
- [x] 6.3 Unit test: vertical arm fallback triggers correctly
- [x] 6.4 Update existing wrist tests for new interface
