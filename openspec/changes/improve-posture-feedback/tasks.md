## 1. Fix Head Tilt Calculation

- [x] 1.1 Fix `_pruefe_kopfneigung` to normalize `atan2` result to deviation-from-horizontal (0° = level head), handling mirror-flip sign correctly
- [x] 1.2 Verify fix by testing: level head reads ~0°, 30° tilt reads ~30°, result is identical with and without mirror flip

## 2. Temporal Smoothing and Hysteresis

- [x] 2.1 Add smoothing state dict to `HaltungsAnalyse.__init__` tracking per-check EMA values and warning-active flags
- [x] 2.2 Add EMA update logic: each `_pruefe_*` method updates its smoothed value before comparing against thresholds
- [x] 2.3 Implement hysteresis: use entry threshold (existing values) and exit threshold (~20% more permissive) for warning state transitions
- [x] 2.4 Add reset logic: clear smoothing state when no landmarks are detected for >1 second
- [x] 2.5 Add `ema_alpha` parameter to `HaltungsGrenzwerte` dataclass with default 0.3

## 3. Angle Visualization

- [x] 3.1 Extend `Warnung` dataclass with `messwert` (measured value as float) and `gelenk_position` (pixel coordinates of the joint) fields
- [x] 3.2 Populate `messwert` and `gelenk_position` in all `_pruefe_*` methods when returning a Warnung (and also when no warning, for single-check mode)
- [x] 3.3 Add `_zeichne_winkel_bogen` method to `Visualisierung` that draws an arc at a joint between two limb directions with the measured angle span
- [x] 3.4 Add `_zeichne_winkel_label` method to `Visualisierung` that draws the numeric angle text (e.g., "142°") near the joint
- [x] 3.5 Color-code arcs and labels: green (OK), orange (near threshold within 20%), red (over threshold)
- [x] 3.6 In `zeichne_skelett`: draw angle arcs for active warnings in mode 0, and always for the active check in modes 1-5
- [x] 3.7 For head tilt (mode 1): draw a horizontal reference line through ear midpoint and show deviation angle
- [x] 3.8 For shoulder asymmetry (mode 2): display the height ratio value between the two shoulder joints

## 4. Unicode Text Rendering

- [x] 4.1 Add `Pillow` to `requirements.txt`
- [x] 4.2 Create a `zeichne_text` helper function that renders Unicode text onto an OpenCV frame region using PIL ImageDraw
- [x] 4.3 Implement font discovery: try bundled/system TTF font (DejaVu Sans or similar), fallback to ASCII transliteration with cv2.putText
- [x] 4.4 Replace all `cv2.putText` calls in `Visualisierung` (zeichne_warnungen, zeichne_status_leiste) with the new `zeichne_text` helper
- [x] 4.5 Restore natural German text in all strings: "noetig" → "nötig", "fuer" → "für", "Koerper" → "Körper", etc.
- [x] 4.6 Update window title to "Haltungsanalyse für Geiger" (note: cv2.imshow window titles may still be ASCII-limited on some platforms — test and document)

## 5. Shoulder Marker Visual Offset

- [x] 5.1 In `zeichne_skelett`, when drawing shoulder joint dots (landmarks 11, 12), compute an outward offset of ~15% of shoulder width along the shoulder line
- [x] 5.2 Apply offset only to drawn dot positions, not to the landmark data used by posture checks
- [x] 5.3 Verify that shoulder asymmetry check still uses original landmark coordinates

## 6. Integration and Testing

- [x] 6.1 Run full pipeline end-to-end: verify all 5 checks work with smoothing, arcs, Unicode text, and shoulder offset
- [ ] 6.2 Verify mode switching (keys 0-5) still works correctly with new angle visualization
- [ ] 6.3 Check frame rate remains above 25fps with all new rendering additions
- [ ] 6.4 Test with head level, tilted left, tilted right — confirm head tilt check no longer always fires red
