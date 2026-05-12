## Context

The wrist analyse-mode currently renders a full rail system on the player's body: forearm extension, hand segment (blue/yellow), knick line, ghost rail, perpendicular indicator, and endpoint dots. These depend on a computed geometry from three landmarks (elbow, wrist, MCP) that becomes unstable when the player moves even slightly. The peripheral side-view already exists as a secondary feedback channel showing a simplified arm-hand diagram.

The sapphire anchor currently renders with fixed blue coloring. It accepts a `streakSeconds` parameter for glow intensity but has no color parameter for deviation state.

## Goals / Non-Goals

**Goals:**
- Remove rail/knick rendering from wrist analyse-mode main view, keeping only the anchor point
- Add color parameterization to the anchor point (blue/yellow/lilac based on deviation)
- Make the peripheral side-view the sole directional feedback channel
- Add adaptive baseline to the peripheral pipeline so gradual position changes are absorbed
- Implement changes incrementally: one commit per logical change, test before next

**Non-Goals:**
- No changes to flow-mode (already anchor-only)
- No changes to the underlying signal processing pipeline (EMA, z-boost, bend direction stay as-is)
- No store schema changes
- No sigmoid color mapping or new visual-state module — keep it simple with direct color thresholds matching existing `wristRailIsBlue` hysteresis
- No changes to shoulder or violin modes

## Decisions

1. Anchor color via parameter, not internal state
- Decision: Add an optional `colorOverride` parameter to `drawSapphireAnchor()` that tints the gradient. The canvas-renderer passes the color based on `wristRailIsBlue` and `wristRailAngleDeg`.
- Rationale: Keeps the anchor module stateless. Color decision stays in the renderer where store state is available.
- Alternative considered: New anchor module with built-in state machine. Rejected — over-engineering for a color tint.

2. Color mapping uses existing thresholds, not sigmoid
- Decision: Use the existing `wristRailIsBlue` boolean plus a simple threshold on `wristRailAngleDeg` for the yellow-to-lilac transition. Blue when `isBlue=true`, yellow when `isBlue=false` and angle < 15°, lilac when angle >= 15°.
- Rationale: The existing hysteresis (8°/5°) is proven stable. Adding another layer of color math previously caused instability.
- Alternative considered: Sigmoid mapping. Rejected — caused issues in testing, and the 4° silence threshold conflicted with the 8° hysteresis.

3. Rail rendering removed, not hidden
- Decision: Remove the `drawWristLines()` call from canvas-renderer in analyse-mode entirely. The function stays in the codebase for potential future use.
- Rationale: Disabling via flag adds complexity. Clean removal is simpler and reversible via git.

4. Adaptive baseline as slow EMA on the 2D angle
- Decision: Maintain a slow-moving reference angle (EMA with alpha ~0.02, time constant ~1.5s at 30fps) in the hook. The peripheral side-view receives `effectiveAngleDiff - adaptiveBaseline` instead of raw `effectiveAngleDiff`.
- Rationale: Absorbs gradual drift from player movement. Fast wrist faults (happening in <0.5s) outpace the baseline drift.
- Alternative considered: Recalibration prompt. Rejected — interrupts practice flow.

5. Side-view enhancements are visual tuning, not architectural
- Decision: Make the side-view line thicker and increase the visual angle multiplier. These are constant tweaks, not new modules.
- Rationale: The side-view architecture is sound. It just needs to be more prominent since it's now the sole directional channel.

## Risks / Trade-offs

- [Adaptive baseline masks slow posture degradation] → Accept: the baseline drifts slowly enough that sustained bad posture (>5s) will still trigger warning. Can tune alpha later.
- [Removing rail lines loses visual context for self-observation] → Accept: the anchor color provides sufficient state information. The musician can still observe their silhouette.
- [Anchor color may not be noticeable peripherally] → Mitigated: anchor is always visible and color changes are bold (blue vs yellow vs lilac). Main view is for central/near-peripheral vision anyway.

## Migration Plan

- Implement in strict sequence: one change, one test, one commit
- Step 1: Remove `drawWristLines()` call from analyse-mode. Test: main view shows only anchor.
- Step 2: Add color parameter to anchor. Test: anchor changes color when wrist deviates.
- Step 3: Add adaptive baseline to hook. Test: peripheral side-view stays calm during gradual movement.
- Step 4: Tune side-view prominence. Test: peripheral knick is clearly visible.
- Rollback: Each step is a separate commit, revertible independently.

## Open Questions

- Exact alpha for adaptive baseline EMA — start with 0.02 and tune based on feel.
- Whether lilac threshold (15°) feels right or should be higher/lower.
- Whether the side-view needs a size increase or just thickness/angle amplification.
