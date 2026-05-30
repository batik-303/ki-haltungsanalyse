# 5 — Page Transitions

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Sanfte Screen-Übergänge (Fade + Slide) bei Navigation zwischen Home, Setup, Session und Results.

- `App.tsx` bekommt Transition-Logik: bei `appScreen`-Wechsel → ausgehender Screen faded out (200ms), eingehender Screen faded in mit leichtem Slide (200ms)
- CSS-Only wo möglich, kein JavaScript-Timer außer zur Koordination von Unmount
- Keine Transition beim initialen Laden (nur bei Screen-Wechseln)

## Acceptance criteria

- [x] Home→Setup: Smooth Fade+Slide (200ms)
- [x] Setup→Session: Smooth Fade+Slide (200ms)
- [x] Session→Results: Smooth Fade+Slide (200ms)
- [x] Zurück-Navigation (Results→Home, Setup→Home) ebenso smooth
- [x] Initiales App-Laden hat KEINE Transition (kein leerer Flash)
- [x] Transition blockiert nicht — Buttons sind sofort nach Transition klickbar
- [x] **Manueller Test**: Durch alle Screens navigieren. Kein Ruckeln, kein Flash, fühlt sich poliert an.

## Blocked by

- #1 Layout-System Foundation