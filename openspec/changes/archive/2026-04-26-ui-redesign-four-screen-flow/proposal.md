## Why

The current UI is a single-page column layout that contradicts the project's own design philosophy: "Canvas-Overlay ist der primäre Feedback-Kanal" and "Der Musiker übt — die App ist Beiwerk." The video feed — the most important element — is a fixed 640×480 box surrounded by stacked controls. There is no sense of entering a practice session, no structured flow, no session history, and the musician must click buttons while holding an instrument. The app needs a proper screen-based flow that puts the video front and center, uses voice commands for hands-free control, and persists session data for progress tracking.

## What Changes

- **New 4-screen navigation flow**: Home (instrument selection) → Setup (mode + sensitivity) → Session (fullscreen mirror) → Results (charts + navigation)
- **Fullscreen video-first session layout**: Video fills the viewport; UI chrome docks to edges with low opacity, only voice hints and minimal HUD visible
- **Voice command system**: Replace single-trigger voice hook with a multi-command dispatcher — voice controls calibration, session start, session stop
- **Session persistence via IndexedDB**: Store session results (zones, duration, tension timeline) locally for the results page and future history features
- **Tension timeline recording**: Sample tension values at 1Hz during sessions for time-series visualization on results page
- **Results screen with charts**: Donut chart for zone distribution, area chart for tension over time, summary stats
- **shadcn/ui component library**: Initialize shadcn and use its Card, Button, RadioGroup, Badge, Chart, and Progress components for consistent, polished UI
- **Manual button fallbacks**: Every voice command has a translucent button fallback at screen edges for accessibility and browser compatibility

## Capabilities

### New Capabilities
- `screen-navigation`: App screen state machine (home → setup → session → results) with transitions and back navigation
- `instrument-selection`: Home screen with instrument cards; currently only violin, extensible for future instruments
- `session-setup`: Setup screen combining focus mode selection and sensitivity configuration before entering session
- `fullscreen-session`: Video-first session layout with edge-docked HUD, phase-based flow (positioning → calibrating → ready → tracking → end)
- `voice-commands`: Multi-command voice dispatcher supporting calibrate, start, stop, and recalibrate voice triggers with German language recognition
- `session-persistence`: IndexedDB storage layer for session results with tension timeline, zone data, and metadata
- `session-results`: Results screen with donut chart (zone distribution), area chart (tension timeline), summary stats, and repeat/home navigation
- `tension-timeline`: Frame-sampled tension history (1Hz) during active sessions for time-series visualization

### Modified Capabilities
<!-- No existing specs to modify — this is the first spec-driven change -->

## Impact

- **src/App.tsx**: Complete rewrite — becomes a screen router instead of single-view wrapper
- **src/components/**: Most existing components refactored or replaced by new screen components. CameraView splits into session-specific logic
- **src/hooks/use-voice-control.ts**: Rewritten as multi-command dispatcher
- **src/hooks/use-pose-detection.ts**: Camera lifecycle changes — must support activation/deactivation per screen
- **src/core/session/session-tracker.ts**: Extended with tension timeline sampling
- **src/store/pose-store.ts**: New `appScreen` state, navigation actions, tension history array
- **New dependencies**: `recharts` (charts), `idb-keyval` or raw IndexedDB wrapper (persistence), shadcn/ui components
- **index.html**: Title update from "Vite + React + TS" to "Blue Anchor"
