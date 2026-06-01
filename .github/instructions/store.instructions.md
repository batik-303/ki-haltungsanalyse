---
description: "Use when working in src/store/ — Zustand flat store, selectors, layout system. Covers flat store pattern, selector purity, and updateFrame conditional spread."
applyTo: "src/store/**/*.ts"
---

# Store Layer Rules

## Flat Store Pattern
- Single `PoseState` store in `pose-store.ts` — all UI-visible state in one place
- Separate `layout-store.ts` for responsive layout (viewport, orientation, device class)
- Actions: `goToX` for navigation, `setX` for simple updates, `calibrate`/`startSession`/`endSession`/`reset` for complex transitions

## updateFrame Pattern
- Uses conditional spread: `...(data.field !== undefined && { field: data.field })`
- Undefined fields are **NOT** reset — this is intentional, only present fields update
- This is the **ONLY** write path from the rAF loop to the store

## Selectors
- All selectors in `selectors.ts` as pure functions: `(state: PoseState) => derivedValue`
- `selectXxx` prefix convention
- Session phase is derived, not stored: `selectSessionPhase()` computes from multiple fields
- Components use selectors; hooks use `getState()`

## Layout Store
- React-free: uses `matchMedia` listeners, writes CSS custom properties to `:root`
- Initialized **before React** in `main.tsx` via `initLayoutSystem()`
