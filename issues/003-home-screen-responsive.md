# 3 — Home Screen Responsive + Animation

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Home-Screen responsive machen und mit Staggered-Card-Entrance-Animation versehen.

- `lg:grid-cols-3` → `md:grid-cols-3` (Breakpoint-Migration)
- Instrument Cards erhalten CSS Staggered-Entrance: `animation-delay: calc(var(--index) * 80ms)` via `nth-child` Custom Property
- Entrance-Animation: `@keyframes card-enter` (fade + translateY) — einmalig beim Mount, nicht bei Re-Rendern

## Acceptance criteria

- [x] Auf Phone (<480px): Karten untereinander, eine pro Zeile, zentriert, gut lesbar
- [x] Auf Tablet (480-1023px): Zwei Karten pro Zeile
- [x] Auf Desktop (≥1024px): Drei Karten pro Zeile (wie vorher)
- [x] Karten erscheinen mit zeitversetzter Animation (ca. 80ms Abstand) beim ersten Laden
- [x] Animation läuft nur beim initialen Mount — nicht bei Navigation zurück zum Home
- [x] **Manueller Test**: Auf Phone, Tablet, Desktop testen. Animation fühlt sich smooth und willkommen-heißend an.

## Blocked by

- #1 Layout-System Foundation