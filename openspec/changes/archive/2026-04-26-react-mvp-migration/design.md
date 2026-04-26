## Context
Blue Anchor prototype is 1335-line monolithic HTML. Needs React+TS migration.

## Goals / Non-Goals
**Goals:** Platform-independent core/, shadcn UI, Zustand store, canvas visualization, mobile-ready architecture
**Non-Goals:** React Native build, new features, server-side, PWA

## Decisions
1. Vite + React 18 + TypeScript
2. Zustand (getState() for hot-path canvas reads)
3. Canvas for visualization, shadcn for UI controls
4. Core layer with zero platform dependencies
5. Dark theme from day one (#0a1628)
6. MediaPipe via npm

## Risks / Trade-offs
- MediaPipe WASM bundle size (~4MB)
- Canvas rendering not shared with mobile (core/ is shared)
- Zustand 30fps performance (use getState, not hooks in render loop)
