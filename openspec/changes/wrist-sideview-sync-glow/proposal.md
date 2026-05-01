## Why

Das Side-View-Feedback im Handgelenk-Modus ist aktuell nicht immer synchron und ruhig. Für klares, motivierendes Feedback soll die Linie exakt den Knick und die Richtung der Hauptlinie spiegeln und beim Reparieren einen Glow/Ankerpunkt zeigen.

## What Changes

- Die Side-View-Linie zeigt immer synchron den Knick und die Richtung wie die Hauptlinie.
- Im reparierten Zustand bleibt sie waagerecht und ruhig.
- Beim Korrigieren erscheint auch im Side-View der Glow/Ankerpunkt als Belohnung.

## Impact

- src/rendering/wrist-side-view.ts
- src/hooks/use-pose-detection.ts
- src/core/analysis/wrist-analyzer.ts
