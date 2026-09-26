---
Status: accepted
---

# Knick-Messung rotationsinvariant im Bezugssystem der Hand statt als 2D-Bildwinkel

Der **Knick** (siehe `CONTEXT.md`) wird nicht mehr als 2D-Winkel im Kamerabild gemessen (`computeCollinearityAngle2D`), sondern im **Bezugssystem der Hand**: 3D-Unterarm-Richtung gegen die Handebene (Handflächen-Normale aus den HandLandmarker-Punkten). Gewertet wird nur die **Beuge-/Streck-Achse**. Die Kalibrier-Baseline wird in **derselben Größe** gespeichert. Die „nur-steigen"-Sperre bei geringer Foreshortening-Konfidenz entfällt; schlechte Sicht zeigt der Anker als **grau**.

## Kontext

Beim echten Geigespielen blieb der Anker dauerhaft gelb (Diagnose #78). Ursache: Ein 2D-projizierter Winkel ist nicht invariant, wenn sich der Arm aus der Bildebene dreht, was beim Lagenwechsel ständig passiert. Eine skalare Baseline kann eine orientierungsabhängige Größe nicht ausgleichen. Die Anforderung „Lagenwechsel bleibt blau" war damit strukturell verletzt.

## Considered Options

- **Bezugssystem der Hand** (gewählt): nutzt dieselben präzisen Handpunkte wie der Anker; Bausteine (`computePalmNormal`, `computePalmBendSign`) existieren. Risiko: Hand-z ist eine Schätzung aus einem Bild und rauscht.
- **3D-Winkel aus Pose-`worldLandmarks`**: echte Meter-Einheiten, aber die Pose kennt die Hand nur grob (Zeigefinger-/Kleinfinger-Punkt). Bleibt **Fallback**, falls die Hand-z-Werte zu stark rauschen.
- **2D behalten, bei Armdrehung pausieren (grau)**: kleinster Umbau, aber beim Lagenwechsel ständig grau, also genau beim Spielen kein Feedback. Verworfen.
- **Auch seitliches Abknicken (radial/ulnar) werten**: meldet mehr, erzeugt aber falsches Gelb bei Vibrato und Lagenwechsel. Verworfen.

## Consequences

- `calib2DAngle`/`calib2DAngleFallback` in der `MasterPrint` werden durch eine Baseline in der neuen Größe abgelöst. Alte Kalibrierungen sind nicht übertragbar; die Kalibrierung ist ohnehin nur in-memory (V0.1).
- **Achtung Koordinatensysteme**: Pose- und Hand-`z` haben verschiedene Nullpunkte (Hüftmitte vs. Handgelenk). Unterarm und Handebene müssen als **Richtungen** aus je einem konsistenten System verglichen werden, nicht als gemischte Punkte (Detail: `docs/mediapipe-wrist-modus.md`).
- Abnahme per TDD: `tests/wrist/angle-orientation-drift.test.ts`, `maxDrift <= 10°` bei reiner Armdrehung.
- Farb-Schwellen und Zeitkonstanten (#75) werden erst auf der neuen Größe festgelegt.

Herkunft: Wegfindungs-Karte #71, Diagnose #78, Umsetzung #82.
