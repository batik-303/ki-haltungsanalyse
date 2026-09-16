# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Live posture feedback for musicians (currently violin; extensible to other instruments). Runs entirely client-side in the browser via MediaPipe Pose Landmarker. Stack: React 18 + TypeScript + Vite, Zustand store, TailwindCSS v4, shadcn primitives.

## MCP Servers — Always Use

- **serena** — Use for all code navigation and symbol-level edits (`find_symbol`, `get_symbols_overview`, `find_referencing_symbols`, `replace_symbol_body`, `insert_after_symbol`). Before starting any coding task, call `mcp__serena__initial_instructions` once to load the Serena Instructions Manual. Prefer Serena symbol tools over plain Read/grep when navigating TypeScript.
- **context7** — Use for any library/framework API question (React, Zustand, MediaPipe Tasks Vision, TailwindCSS v4, Recharts, base-ui, idb-keyval, etc.) before answering or coding. Call `resolve-library-id` then `query-docs`. Use even for well-known libraries — training data lags real APIs.

## Commands

| Command | What |
|---------|------|
| `npm run dev` | Vite dev server with HMR; `--host` binds all interfaces (used for mobile/LAN testing over HTTPS via `@vitejs/plugin-basic-ssl`) |
| `npm run build` | Type-check + production build: `tsc -b && vite build` |
| `npm run lint` | ESLint across all files |
| `npm run preview` | Preview production build |
| `npx vitest` | Run all tests (no npm script — call directly) |
| `npx vitest run tests/wrist/anchor-stability.test.ts` | Run a single test file |
| `npx vitest -t "anchor"` | Run tests by name pattern |

Tests live in `tests/` (outside `src/`). They import directly from `../src/core/...` and exercise pure functions only — no React or DOM mocking.

## Architecture — Five Layers with Strict Boundaries

```
src/core/        Pure analysis logic. NO React. NO imports from components/hooks/rendering.
src/rendering/   Canvas drawing. Reads store via usePoseStore.getState() — never via React subscription.
src/components/  React UI. Reads store via usePoseStore((s) => s.field) selector subscriptions.
src/hooks/       rAF loop, MediaPipe glue. Bridges core ↔ store. Holds analysis state in useRef.
src/store/       Zustand flat store + pure selectors (separate file).
```

Analyzers are **factory functions with closure state**: `createViolinAnalyzer()`, `createWristAnalyzer()`, etc. returning `{ analyze, reset }`. They're held via `useRef` inside hooks — never instantiated as classes, never put in the store.

Entry: `src/main.tsx` → `initLayoutSystem()` runs **before** React mounts (so initial queries see correct viewport/orientation CSS props) → `<App />` → `App.tsx` switches between four screens (`home | setup | session | results`) driven by `usePoseStore((s) => s.appScreen)`, with a 200ms enter/exit page transition.

### ⚠️ Triple-State System — Choose the Right Layer

| Layer | Where | Use For |
|-------|-------|---------|
| **Zustand store** (`src/store/pose-store.ts`) | Module-level | React-visible UI state: session phase, calibration, navigation, live frame snapshot for UI |
| **`useRef` mutable** | Inside hooks (`src/hooks/`) | rAF-loop analysis state: filters, smoothers, timers, analyzer instances. **NEVER in React state.** |
| **Module-level vars** | Inside renderers (`src/rendering/`) | Canvas glow decay timers, adaptive baselines — visual continuity between frames |

**Analysis state never goes in Zustand.** It belongs in `useRef` inside hooks. Putting per-frame filter/smoother state in Zustand causes re-render storms.

### Data Flow per Frame (rAF loop in `use-pose-detection.ts`)

```
MediaPipe detect → analyzer.analyze() → updateFrame(data) → renderFrame(ctx)
                                       (conditional spread)   (reads getState())
```

- `updateFrame()` is the **only** write path from rAF to store. It uses conditional spread (`...(data.field !== undefined && { field: data.field })`) so undefined fields are not reset.
- Renderers (`canvas-renderer.ts` dispatches per `focusMode`: shoulder | wrist | violin) read fresh state via `usePoseStore.getState()` — never subscribe.
- When calibration changes, **all** rAF-loop refs must be reset via the `resetAnalysisState` callback — missing one corrupts the next session.

### Canvas CSS Mirror

The video/canvas is CSS-mirrored (selfie view). Drawing on the LEFT canvas edge appears on the RIGHT of the screen. Wrist side-view uses this: desktop draws on left canvas edge = right screen edge after mirror. Account for this in all coordinate math (`src/rendering/wrist-side-view.ts` is the reference).

### Types & Discriminated Unions

Central in `src/core/types.ts`. `MasterPrint` and analyzer outputs use `mode` / `kind` as discriminant — always narrow (`if (mp.mode === 'violin')`) before accessing mode-specific fields. `FocusMode = 'violin' | 'shoulder' | 'wrist'` drives both analyzer dispatch and render dispatch.

### Selectors

All store-derived values are pure functions in `src/store/selectors.ts` (`selectSessionPhase`, `selectStatusColor`, …). Session phase is **derived, not stored** — computed from `isCalibrating`, `masterPrint`, `distanceOk`, `sessionActive`. Components consume selectors; hooks/renderers use `getState()`.

### Layout Store

`src/store/layout-store.ts` is React-free: uses `matchMedia` listeners and writes CSS custom properties to `:root`. Initialized in `main.tsx` before React.

## Conventions

- **UI language: German** — all user-visible strings. **Code language: English** — identifiers, comments, types.
- **Feedback philosophy**: positive language only (no "wrong"/"bad"/"error"). Asymmetric tension — slow rise (penalty), fast decay (reward); the user should feel return-to-good-posture immediately. Layer names `flow → bewusst → achtung → limit` guide attention, they don't punish. See `src/core/analysis/layer-classifier.ts`.
- **UI principle**: canvas overlay is the primary feedback channel. UI chrome stays minimal and at screen edges. **No modals, popups, or central overlays during active sessions** — they block the view of the instrument.
- **Styling**: TailwindCSS v4, `cn()` from `@/lib/utils`, `sapphire` as brand color token, shadcn primitives in `@/components/ui/*`.
- **Naming**: `createXxxAnalyzer` factories, `computeXxx` pure functions, `drawXxx` renderers, `selectXxx` selectors, `useXxx` hooks, `SCREAMING_SNAKE_CASE` for thresholds.
- **Path alias**: `@/` → `./src/`.

## TypeScript — Extremely Strict

`tsconfig.app.json` enables `strict`, `noUncheckedIndexedAccess` (array indexing returns `T | undefined` — always guard), `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. Zero dead code tolerance — remove unused identifiers immediately, don't comment them out. Prefer `import type { ... }` for type-only imports.

## Adding a New Instrument (e.g. cello)

1. Extend `FocusMode` union in `src/core/types.ts`.
2. New analyzer as factory function in `src/core/analysis/`.
3. Add variant to `MasterPrint` discriminated union in `src/core/types.ts`.
4. Mode-specific layer labels/messages in `src/core/analysis/layer-classifier.ts`.
5. Update `FocusModeSelector` component.
6. Extend calibration in `src/core/calibration/master-print.ts`.
7. Add rendering modules in `src/rendering/` if needed; wire into `canvas-renderer.ts` dispatch.

Use the existing violin implementation as the reference.

## Layer-Specific Rules

Detailed per-layer rules live in `.github/instructions/*.instructions.md` (auto-attached via `applyTo` globs). Consult the matching file when touching a layer:
- `core.instructions.md` — pure functions, factories, import boundaries
- `hooks.instructions.md` — rAF loop, triple-state system, `getState()` not selectors
- `rendering.instructions.md` — canvas drawing, CSS mirror, dispatch order
- `components.instructions.md` — selector subscriptions, German strings, minimal chrome
- `store.instructions.md` — flat store, pure selectors, `updateFrame` conditional spread

## OpenSpec Workflow

This project uses spec-driven changes under `openspec/` (proposals in `openspec/changes/`, accepted specs in `openspec/specs/`, archives in `openspec/changes/archive/`). When asked to propose, apply, or archive a change, use the `.github/skills/openspec-*` skills.

## Agent skills

### Issue tracker

Issues live in the repo's GitHub Issues, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, each label equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
