---
description: "Use when working in src/components/ — React UI, Zustand selector subscriptions, screen components. Covers selector pattern, minimal UI chrome, and German UI strings."
applyTo: "src/components/**/*.tsx"
---

# Components Layer Rules

## Store Access
- **ALWAYS** use selector subscriptions: `usePoseStore((s) => s.field)` — never `getState()`
- Selectors from `src/store/selectors.ts` for derived values: `selectSessionPhase`, `selectStatusColor`, etc.
- Never put analysis state in components — they only read from the store

## UI Principles
- Canvas overlay is the **primary feedback channel** — not the React UI
- UI chrome minimal, positioned at screen edges
- **No modals, popups, or central overlays** during active sessions
- All visible strings in **German** (UI language)
- Use `cn()` from `@/lib/utils` for class merging
- Use `@/components/ui/*` shadcn primitives (button, card, badge, progress, radio-group)

## Screen Structure
- Screens live in `src/components/screens/` (Home, Setup, Session, Results)
- Navigation via Zustand actions: `goHome`, `goToSetup`, `goToSession`, `goToResults`
- Session phase is derived (not stored): `selectSessionPhase()` computes from `isCalibrating`, `masterPrint`, `distanceOk`, `sessionActive`

## Styling
- TailwindCSS v4 with `sapphire` brand color token
- `components.json` config: base-nova style, neutral base color
- Custom CSS tokens defined in `src/index.css`
