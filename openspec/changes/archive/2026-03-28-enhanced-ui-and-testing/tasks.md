## 1. Data Structures & Constants

- [x] 1.1 Define skeleton segment-to-region color mapping (SEGMENT_FARBEN dict mapping each POSE_CONNECTIONS entry to a body region color: head=white, arms=blue, torso=green, legs=orange)
- [x] 1.2 Define joint importance mapping (GELENK_GROESSEN dict mapping landmark indices to radius: large=8 for shoulders/hips, medium=5 for elbows/knees/wrists, small=3 for rest)
- [x] 1.3 Define check-to-landmark mapping (CHECK_LANDMARKS dict mapping check index 1–5 to the set of landmark indices involved in that check)
- [x] 1.4 Define mode names list (MODUS_NAMEN: 0="Alle Checks", 1="Kopfneigung", 2="Schulter-Asymmetrie", 3="Handgelenk links", 4="Ellbogen rechts", 5="Schulter-Protraktion")

## 2. Check Selector

- [x] 2.1 Add `aktiver_modus` state variable (int 0–5, default 0) to the main loop
- [x] 2.2 Extend keyboard handler in main loop to detect keys 0–5 and update `aktiver_modus`
- [x] 2.3 Modify `HaltungsAnalyse.analysiere()` to accept an optional `modus` parameter that filters which `_pruefe_*` methods run (0=all, 1–5=single check)

## 3. Enhanced Skeleton

- [x] 3.1 Refactor `Visualisierung.zeichne_skelett()` to draw glow effect (thick dark line first, colored line on top) for each connection
- [x] 3.2 Apply color-coded segment colors from SEGMENT_FARBEN to each connection line
- [x] 3.3 Apply joint size hierarchy from GELENK_GROESSEN — draw each joint circle at its importance-based radius with glow outline
- [x] 3.4 Add red failure highlighting: accept list of active warnings, map warning types to affected landmark indices, override segment colors to red for those connections/joints
- [x] 3.5 Add single-check dimming: when modus is 1–5, render non-relevant segments in gray and relevant segments in full color (using CHECK_LANDMARKS mapping)

## 4. Warning Panel

- [x] 4.1 Implement `_zeichne_panel()` helper that draws a semi-transparent dark rectangle (alpha ~0.6) using cv2.addWeighted on a frame ROI
- [x] 4.2 Refactor `zeichne_warnungen()` to render mode indicator as first line inside the panel, followed by warnings and correction hints
- [x] 4.3 Make panel height dynamic based on number of active warnings (calculate total text height before drawing the panel background)
- [x] 4.4 Show "Haltung OK" with mode indicator inside the panel when no warnings exist

## 5. Integration & Testing

- [x] 5.1 Wire up all components in main loop: pass `aktiver_modus` to `analysiere()`, pass warnings to `zeichne_skelett()`, pass mode to `zeichne_warnungen()`
- [ ] 5.2 Manual test: verify each mode (0–5) switches correctly via keyboard and displays correct mode label
- [ ] 5.3 Manual test: verify skeleton colors, glow, joint sizes render correctly
- [ ] 5.4 Manual test: trigger each posture warning and verify red highlighting on correct segments
- [ ] 5.5 Manual test: verify warning panel readability on bright and dark backgrounds
