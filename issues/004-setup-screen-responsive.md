# 4 — Setup Screen Responsive

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Setup-Screen responsive machen: Modus-Karten (Violine, Handgelenk, Schulter) stapeln auf schmalen Screens.

- Mode-Karten: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- Container `max-w-2xl` bleibt, Karten zentriert
- Keine weiteren Änderungen an Empfindlichkeits-Radio-Buttons oder Session-Start-Button

## Acceptance criteria

- [ ] Auf Phone (<480px): Drei Mode-Karten untereinander, volle Container-Breite, Text+Icons lesbar
- [ ] Auf Tablet (≥480px): Drei Karten nebeneinander (bestehendes Layout)
- [ ] Ausgewählte Karte visuell hervorgehoben (ring + background) auf allen Größen
- [ ] Empfindlichkeits-Radio-Buttons unverändert auf allen Größen
- [ ] **Manueller Test**: Auf Phone Setup-Screen öffnen — alle drei Modi sichtbar ohne horizontal zu scrollen.

## Blocked by

- #1 Layout-System Foundation