## Context

Blue Anchor is a browser-based posture analysis tool for musicians, currently supporting violin. It uses MediaPipe Pose Landmarker for real-time pose detection, with a rendering pipeline that draws color-coded feedback on a canvas overlay. The current UI is a single-page column layout with a fixed 640×480 video, stacked controls, and no navigation structure. All state lives in a Zustand flat store. The project uses React 18, TypeScript, Vite, TailwindCSS v4, and has existing scaffolding for shadcn (cva, clsx, tailwind-merge, lucide-react).

The redesign introduces a 4-screen navigation flow, fullscreen video session layout, multi-command voice control, IndexedDB persistence, and a chart-based results page.

## Goals / Non-Goals

**Goals:**
- Implement a screen-based navigation model (home → setup → session → results) via store state
- Make the session screen video-first and fullscreen, with edge-docked translucent HUD
- Enable hands-free session control via German voice commands (calibrate, start, stop)
- Record per-second tension timeline for time-series charts on the results page
- Persist session results in IndexedDB for the results screen (and future history)
- Use shadcn/ui components (Card, Button, RadioGroup, Badge, Progress) for consistent UI
- Use recharts (via shadcn Chart wrapper) for donut and area charts on results page

**Non-Goals:**
- Cross-session history / trends page (future — persistence layer enables it, but no UI yet)
- Multi-instrument support beyond violin (home screen is extensible but only violin is functional)
- User accounts, cloud sync, or any server-side component
- Replacing the existing canvas rendering pipeline (it stays as-is)
- Mobile/responsive layout (desktop browser first; responsive is a future concern)
- PWA / offline support

## Decisions

### 1. Navigation via Zustand store state, not a router

**Decision**: Add `appScreen: AppScreen` to the Zustand store. `App.tsx` renders the matching screen component.

**Alternatives considered**:
- `react-router`: Adds a dependency, URL-based routing not needed (no deep linking, no server), and the app is a single-page tool — screen state is transient.
- `useState` in App: Loses integration with the existing store pattern and makes it harder to trigger transitions from hooks.

**Rationale**: The app already uses Zustand for all state. Adding one more field keeps the pattern uniform. Navigation actions (`goToSetup`, `goToSession`, `goToResults`, `goHome`) are store actions that set `appScreen` and reset relevant state.

### 2. IndexedDB via raw `idb-keyval` wrapper

**Decision**: Use `idb-keyval` (~600 bytes) for session persistence. One object store keyed by session ID.

**Alternatives considered**:
- Raw IndexedDB API: Verbose, callback-heavy. `idb-keyval` wraps it cleanly.
- `idb` library (~1.2KB): More power (custom stores, indexes), but overkill for key-value access.
- `sql.js` / wa-sqlite: ~1MB WASM, full SQL. Massive overkill for storing session result objects.
- `localStorage`: 5MB limit, synchronous, no structured data — not suitable for tension timelines.

**Rationale**: The data model is simple: store `StoredSession` objects, retrieve the latest for the results page. No queries, no joins. `idb-keyval` is the smallest viable wrapper.

### 3. Tension timeline sampled at 1Hz

**Decision**: The session tracker samples `{ t, tension, layer }` once per second into an array. At session end, this array is included in the stored session.

**Alternatives considered**:
- Every frame (~30Hz): 27,000 points for a 15-min session. Excessive for chart rendering, wastes storage.
- Every 5 seconds: Too coarse — misses meaningful tension changes during practice.

**Rationale**: 1Hz gives 900 points for a 15-minute session (~45KB). Enough resolution for a smooth area chart, small enough to store and render efficiently.

### 4. Voice command dispatcher pattern

**Decision**: Rewrite `useVoiceControl` as a command-map hook: `useVoiceCommands(commandMap)`. The hook matches recognized German speech against a keyword map and invokes the corresponding callback.

**Command keywords**:
- `"kalibrieren"` / `"calibrate"` → trigger calibration
- `"start"` / `"los"` → begin tracked session
- `"stop"` / `"stopp"` / `"ende"` → end session
- `"neu"` / `"nochmal"` → re-calibrate

**Fallback**: Each voice command has a corresponding translucent button at the bottom edge of the session screen. Voice is the primary UX, buttons are the fallback.

### 5. shadcn/ui initialization with recharts

**Decision**: Run `npx shadcn@latest init` to set up shadcn. Install individual components as needed: Card, Button, RadioGroup, Badge, Progress, Chart. The Chart component wraps recharts.

**Rationale**: shadcn is already partially scaffolded (cva, clsx, tw-merge, lucide-react in deps). It provides accessible, unstyled primitives that match the existing Tailwind approach. recharts via shadcn's Chart wrapper gives production-quality charts without custom SVG work.

### 6. Session screen phase model

**Decision**: The session screen has 5 internal phases managed by derived state:

| Phase | Condition | HUD Hint |
|-------|-----------|----------|
| `positioning` | No masterPrint, distance not OK | "Positioniere dich vor der Kamera" |
| `ready-to-calibrate` | No masterPrint, distance OK | "Sage 'Kalibrieren'" |
| `calibrating` | isCalibrating === true | Countdown overlay |
| `ready-to-start` | masterPrint exists, !sessionActive | "Sage 'Start'" |
| `tracking` | sessionActive === true | Timer + "Sage 'Stop'" |

Phases are not stored — they are derived from existing store fields via a selector function in `selectors.ts`.

### 7. Camera lifecycle

**Decision**: Camera (`getUserMedia`) activates when entering the session screen. It deactivates when leaving (going to results or home). The setup screen does NOT activate the camera — this keeps the permission dialog at the moment of commitment.

**Rationale**: Requesting camera on setup would show the permission dialog before the user is ready. Starting it on the session screen means: user picks instrument → configures mode → commits → camera starts → positions themselves. The brief startup delay (~500ms) is acceptable given the deliberate flow.

## Risks / Trade-offs

- **Voice recognition browser support**: Web Speech API is not available in all browsers (notably Firefox has limited support). → Mitigation: Manual button fallbacks for every voice command. Voice is enhancement, not requirement.
- **Auto-calibration replaced by voice-triggered**: The user must actively say "Kalibrieren" or click a button. → Mitigation: Clear visual hint on screen. This is actually better than auto — the user consciously chooses when their pose is ideal.
- **recharts bundle size**: ~45KB gzipped. → Mitigation: Acceptable for the value it provides. Only loaded on the results screen (dynamic import possible as future optimization).
- **No cross-session comparison yet**: Persistence layer stores data but results page only shows the latest session. → Mitigation: Data model supports future history page. No work is wasted.
- **Fixed desktop layout**: No responsive/mobile support in this change. → Mitigation: Explicitly a non-goal. The app targets laptop/desktop with webcam. Mobile would need a fundamentally different layout.
