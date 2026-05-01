## 1. Fix control flow structure

- [x] 1.1 Move wrist glow state variables (`wristGlowLevel`, `wristGlowDecay`, `lastWristRepaired`) to module scope (above `renderFrame`)
- [x] 1.2 Rewrite shoulder mode block: remove all violin/wrist code, keep only shoulder-specific rendering (flow anchor, analyse band+anchor, pre-cal preview)
- [x] 1.3 Close shoulder block properly so `else if` chains are top-level siblings
- [x] 1.4 Verify wrist mode block is intact and unchanged (filtered coords, wrist lines, side-view, anchor)
- [x] 1.5 Verify violin mode block is intact and unchanged (snail projection, anchor at calibWristX/Y, golden band, return glow)

## 2. Remove duplicate rendering

- [x] 2.1 Remove the second `drawWristSideView` call in the wrist branch (keep only the one with full parameters)

## 3. Verify correctness

- [x] 3.1 Confirm TypeScript compiles without "unintentional comparison" errors on the mode branches
- [ ] 3.2 Manual test: violin mode — calibrate, verify anchor renders at wrist height with golden band on deviation
- [ ] 3.3 Manual test: wrist mode — calibrate, verify wrist lines + side-view + anchor render
- [ ] 3.4 Manual test: shoulder mode — calibrate, verify anchor at shoulder with ear-shoulder connector
- [ ] 3.5 Manual test: flow view in each mode — verify anchor renders at right edge
