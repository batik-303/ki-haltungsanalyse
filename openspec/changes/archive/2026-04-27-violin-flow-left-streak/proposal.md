## Why

Violinists look slightly left toward the scroll and sheet music during practice. The current Flow-mode anchor sits on the right side of the screen, outside the musician's natural peripheral focus. Additionally, the app lacks any intrinsic motivation loop — the musician gets no sense of progress or accomplishment from maintaining good posture over time. A simple streak timer and personal-best tracking would create a natural "hook" without adding distracting gamification.

## What Changes

- **Flow-Anchor Left**: Move the fixed Flow-mode anchor and GoldenBand rendering to the left ~20% of the screen (right side of canvas, CSS-mirrored) for all instrument modes
- **Streak Timer**: Add a `flowStreak` counter (seconds) that increments while tension < 5, pauses immediately when tension rises, and resets after a 500ms grace period
- **Streak Visual Feedback**: Communicate streak progress through the Anchor itself — growing pulse radius, intensifying glow — rather than large numbers. Small numeric display as secondary info
- **Personal Best Persistence**: Store `personalBestStreak` in IndexedDB alongside existing session data
- **Record Celebration**: Trigger a gold anchor flash when a new personal best is set (at session end only)
- **HUD Fade in Flow**: Reduce opacity of all HUD elements (buttons, badges, text) to 20% when tension is near zero to minimize distraction during focused playing

## Capabilities

### New Capabilities
- `flow-streak`: Streak timer logic, grace period, visual feedback via anchor glow, and small numeric display
- `personal-best`: IndexedDB persistence for personal best streak, record detection, and celebration effect
- `hud-flow-fade`: Automatic opacity reduction of HUD elements during low-tension playing

### Modified Capabilities

## Impact

- `src/rendering/canvas-renderer.ts` — Flow-mode anchor position shift (all modes), streak glow integration
- `src/rendering/sapphire-anchor.ts` — Streak-aware glow scaling
- `src/rendering/golden-band.ts` — Adjusted x-coordinates for left-side positioning
- `src/core/session/session-tracker.ts` — Streak counting logic with grace period
- `src/core/persistence/session-db.ts` — New `personalBestStreak` field in IndexedDB schema
- `src/core/types.ts` — New streak-related fields in store types
- `src/store/pose-store.ts` — Streak state fields
- `src/components/screens/session-screen.tsx` — HUD fade logic based on tension
