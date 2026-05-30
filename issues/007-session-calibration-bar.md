# 7 — Session Calibration Bottom Bar

> **Typ**: HITL | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Auf Phone (<480px) wird die Kalibrierung (3-Sekunden-Countdown) in die Bottom-Bar integriert, statt als Vollbild-Overlay.

- Während der Kalibrierung expandiert die Bottom-Bar temporär auf ~120px Höhe (300ms Transition)
- Inhalt: Countdown-Zahl (`text-3xl`) + Hilfetext ("Halte deine optimale Spielhaltung...") + Fortschrittsbalken
- Nach Abschluss (Erfolg/Fehler) kollabiert die Bar zurück auf normale Höhe
- Auf Desktop/Tablet (≥480px): CalibrationOverlay bleibt unverändert als zentrierter Vollbild-Overlay

## Acceptance criteria

- [x] Auf Phone: Bottom-Bar expandiert smooth (300ms) auf ~120px bei Kalibrierungsstart
- [x] Countdown-Zahl (3→2→1) ist in der expandierten Bar gut lesbar
- [x] Hilfetext ist sichtbar
- [x] Fortschrittsbalken zeigt verbleibende Zeit an
- [x] Nach Abschluss kollabiert die Bar zurück auf normale Höhe
- [x] Auf Desktop/Tablet: Kalibrierung erscheint wie bisher als zentrierter Overlay
- [x] **Manueller Test**: Kalibrierung auf Phone durchführen. Bar expandiert, Countdown sichtbar, Video bleibt frei. Kein ruckartiges Springen.

## Blocked by

- #6 Session Bottom Bar Layout (baut auf der Bottom-Bar auf)