## 1. Feedback State Model

- [x] 1.1 Introduce wrist visual state constants for `silent` (<=4deg), `warning`, and `correction` in analysis/rendering integration
- [x] 1.2 Ensure deadzone behavior keeps blue line and anchor static with no color or position morph while in `silent`
- [x] 1.3 Add transition detection from non-silent to silent for one-shot repair confirmation events

## 2. Color and Motion Behavior

- [x] 2.1 Implement sigmoid-based color mapping for wrist deviation above 4deg with calibrated ramp around 6-7deg
- [x] 2.2 Add correction-zone saturation behavior above 8deg toward lilac/purple
- [x] 2.3 Keep side-view and main overlay synchronized to the same frame-level wrist visual state

## 3. Signal Stabilization and Z-Boost Tuning

- [x] 3.1 Apply high damping profile for wrist deviation presentation (EMA-equivalent ~0.95 buildup, faster decay on repair)
- [x] 3.2 Add configurable z-boost multiplier with exploratory default 1.5 for neck-direction sensitivity
- [x] 3.3 Add downgrade path/config for z-boost multiplier (e.g., 1.2) when vibrato negative tests fail

## 4. Repair Reward and Observability

- [x] 4.1 Implement one-shot blue anchor glow pulse when transitioning back into silent state after valid return
- [x] 4.2 Add lightweight debug observability for effective angle and z-boost contribution during manual tuning
- [x] 4.3 Debounce repair pulse trigger to avoid repeated firing from boundary chatter

## 5. Validation Protocol

- [ ] 5.1 Execute "Kleben" manual test and verify stable correction signaling for induced neck-side fault
- [ ] 5.2 Execute strong vibrato negative test and verify no warning/correction flicker in normal posture
- [ ] 5.3 Review debug output thresholds and tune z-boost multiplier if normal play persistently exceeds 4deg without true fault
