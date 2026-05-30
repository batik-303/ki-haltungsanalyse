# 2 — Typography Upgrade

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Schrift-Upgrade für die gesamte App:
- **Outfit** (Google Fonts, 400/500/600/700) als globale Sans-Serif via `@import` in `index.css` — ersetzt den System-Font-Stack
- **Geist Mono** (bereits in `package.json`) als `font-mono` für Timer, Prozentwerte, numerische Badges
- Geist Sans aus globaler Nutzung entfernen; Geist Mono verbleibt

Betroffene Elemente: Alle Texte, Headings, Badges, Buttons. Der Timer (`tabular-nums`) und die Tension-Prozentanzeige bekommen `font-mono`.

## Acceptance criteria

- [x] Outfit ist als globale Schrift sichtbar (alle Texte, Headings, Buttons)
- [x] Timer und Prozentwerte rendern in Geist Mono mit `tabular-nums`
- [x] Kein System-Font-Stack mehr sichtbar (kein San Francisco, Segoe UI, etc.)
- [ ] Kein FOUT (Flash of Unstyled Text) — Font-Loading-Strategie robust
- [ ] **Manueller Test**: Schrift wirkt elegant und präzise. Mono-Ziffern im Timer flackern nicht (gleiche Breite pro Ziffer)

## Blocked by

None — can start immediately (unabhängig von Layout-System).