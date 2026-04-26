## 1. Foundation & Dependencies

- [x] 1.1 Initialize shadcn/ui (`npx shadcn@latest init`) and configure for existing Tailwind v4 + dark theme
- [x] 1.2 Install shadcn components: Card, Button, RadioGroup, Badge, Progress
- [x] 1.3 Install shadcn Chart component (brings recharts as dependency)
- [x] 1.4 Install `idb-keyval` for IndexedDB persistence
- [x] 1.5 Update `index.html` title from "Vite + React + TS" to "Blue Anchor – KI-Haltungsanalyse"

## 2. Types & Store — Navigation

- [x] 2.1 Add `AppScreen` type (`'home' | 'setup' | 'session' | 'results'`) to `src/core/types.ts`
- [x] 2.2 Add `Instrument` type (`'violin'`) and instrument metadata to `src/core/types.ts`
- [x] 2.3 Add `TensionTimelineEntry` type (`{ t: number; tension: number; layer: Layer }`) to `src/core/types.ts`
- [x] 2.4 Extend `SessionStats` with `tensionTimeline: TensionTimelineEntry[]` in `src/core/types.ts`
- [x] 2.5 Add `StoredSession` interface to `src/core/types.ts`
- [x] 2.6 Add `appScreen`, `selectedInstrument` fields and navigation actions (`goToSetup`, `goToSession`, `goToResults`, `goHome`) to `src/store/pose-store.ts`
- [x] 2.7 Add `sessionPhase` selector to `src/store/selectors.ts` deriving phase from existing state

## 3. Tension Timeline Recording

- [x] 3.1 Add timeline sampling (1Hz) to `src/core/session/session-tracker.ts` — accumulate `{ t, tension, layer }` entries
- [x] 3.2 Include `tensionTimeline` in the `SessionStats` returned by `session-tracker.stop()`
- [x] 3.3 Wire timeline data through `updateFrame` / `endSession` in the store

## 4. Session Persistence

- [x] 4.1 Create `src/core/persistence/session-db.ts` with `saveSession(session)` and `loadLatestSession()` functions using `idb-keyval`
- [x] 4.2 Call `saveSession` when a session ends (from the store's `endSession` or the navigation action `goToResults`)

## 5. Voice Command System

- [x] 5.1 Rewrite `src/hooks/use-voice-control.ts` as `useVoiceCommands(commandMap)` — accepts keyword-to-callback map, matches German speech
- [x] 5.2 Support commands: `kalibrieren`/`calibrate`, `start`/`los`, `stop`/`stopp`/`ende`, `neu`/`nochmal`
- [x] 5.3 Auto-activate on session screen mount, auto-deactivate on unmount
- [x] 5.4 Graceful no-op when Web Speech API is unavailable

## 6. Screen Components — Home

- [x] 6.1 Create `src/components/screens/home-screen.tsx` with brand heading and instrument card grid
- [x] 6.2 Create instrument card using shadcn Card — shows icon, name, description; clicks call `goToSetup`

## 7. Screen Components — Setup

- [x] 7.1 Create `src/components/screens/setup-screen.tsx` with back button, instrument header, mode cards, sensitivity radio group, and "Session starten" button
- [x] 7.2 Refactor `FocusModeSelector` into shadcn Card-based selection for setup screen
- [x] 7.3 Refactor `SensitivitySelector` into shadcn RadioGroup for setup screen

## 8. Screen Components — Session (Fullscreen Mirror)

- [x] 8.1 Create `src/components/screens/session-screen.tsx` with fullscreen video + canvas overlay layout
- [x] 8.2 Create HUD overlay components: mode badge (top-left), session timer (top-right), tension progress (bottom-left), voice hint (bottom-right)
- [x] 8.3 Create translucent fallback buttons at bottom edge, visibility based on session phase
- [x] 8.4 Wire voice commands: kalibrieren → calibration, start → begin tracking, stop → end + navigate to results
- [x] 8.5 Integrate existing calibration, pose-detection, and canvas-rendering hooks into session screen
- [x] 8.6 Manage camera lifecycle — start `getUserMedia` on mount, stop tracks on unmount

## 9. Screen Components — Results

- [x] 9.1 Create `src/components/screens/results-screen.tsx` with session summary header
- [x] 9.2 Add donut chart (recharts PieChart via shadcn Chart) for zone distribution with layer colors
- [x] 9.3 Add area chart (recharts AreaChart via shadcn Chart) for tension timeline with layer-colored fill
- [x] 9.4 Add summary stats: duration, average tension, peak tension
- [x] 9.5 Add "Wiederholen" button → `goToSession()` with same config
- [x] 9.6 Add "Hauptmenü" button → `goHome()`

## 10. App Shell & Integration

- [x] 10.1 Rewrite `src/App.tsx` as screen router — render screen component based on `appScreen` store state
- [x] 10.2 Remove old single-page component imports from App (CameraView as top-level)
- [x] 10.3 Verify full flow: home → setup → session (calibrate, start, stop) → results → repeat/home
- [x] 10.4 Clean up unused components that were replaced by screen-specific implementations
