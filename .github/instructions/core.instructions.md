---
description: "Use when working in src/core/ — pure analysis logic, no React, no side effects. Covers factory functions, closure state, Discriminated Unions, and import boundaries."
applyTo: "src/core/**/*.ts"
---

# Core Layer Rules

## Import Boundaries
- **NEVER** import from `react`, `components/`, `hooks/`, or `rendering/`
- Only import from other `src/core/` modules and `src/core/types`
- Core must be testable with pure Vitest — no DOM, no React Testing Library

## Patterns
- **Factory functions with closure state**: `createXAnalyzer()` returns `{ analyze, reset }` — mutable state lives in closure, not in objects/classes
- **Discriminated Unions**: `MasterPrint`, `AnalyzerOutput` use `mode`/`kind` as discriminant — always narrow with `if (data.mode === 'violin')` before accessing mode-specific fields
- **Pure computation functions**: `computeXxx()` prefix, no side effects, deterministic
- **Constants**: `SCREAMING_SNAKE_CASE` for thresholds (e.g., `WRIST_SLIDE_DAMPING = 0.35`)

## TypeScript Strictness
- `noUncheckedIndexedAccess: true` — array indexing returns `T | undefined`, always guard
- `noUnusedLocals` + `noUnusedParameters` — remove dead code immediately
- Prefer `import type { ... }` for type-only imports

## Testing
- Tests live in `tests/` (outside `src/`), import directly from `../src/core/...`
- Test pure functions only — no mocking of React or browser APIs
