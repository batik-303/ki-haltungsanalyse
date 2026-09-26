---
Status: accepted
Supersedes: 0002
---

# Knick als 2D-Bildwinkel mit Verkürzungs-Korrektur statt 3D im Bezugssystem der Hand

Der **Knick** (siehe `CONTEXT.md`) wird aus dem **2D-Bildwinkel** Ellbogen → Handgelenk → Mittelfinger-Grundgelenk gemessen und um die **Verkürzung des Unterarms** korrigiert:

```
r = 2D-Unterarmlänge / kalibrierte 2D-Unterarmlänge   (≈ cos α)
cos(Knick) = cos(Winkel2D) · r² + (1 − r²)
```

Es wird **keine geschätzte Tiefe (z)** verwendet. Die Kalibrier-Baseline ist der 2D-Winkel bei „Haltung speichern" (dort ist r = 1). Die „nur-steigen"-Sperre und der Z-Boost entfallen.

## Kontext

ADR 0002 hatte den Knick im Bezugssystem der Hand gemessen: 3D-Unterarm gegen die Handebene aus den MediaPipe-z-Werten. Im synthetischen Test war das exakt drehinvariant. Beim Test mit Geige (26.09.2026) sprang der Anker aber **schon im Stillstand** zwischen blau und gelb, bei jeder Kameraperspektive. Die alte 2D-Messung war im Stillstand ruhig. Einzige neue Zutat war z; daher sehr wahrscheinlich die Ursache (aus Code und Beobachtung geschlossen, das z-Rauschen selbst wurde nicht gemessen).

MediaPipe schätzt z aus einem einzigen Kamerabild. Die Handebene wird aus drei eng beieinander liegenden Punkten gebildet. Bei ca. 0,06 Bildbreite Abstand kippt ein z-Fehler von 0,01 Bildbreite die Ebene schon um ≈ 9,5°, also über die Farbschwelle von 8°. Das ist Geometrie, kein Programmierfehler: Ohne Tiefe ist Armdrehung von Knick nicht zu unterscheiden, und die Tiefe aus einer normalen Kamera ist zu unruhig.

## Considered Options

- **2D + Verkürzungs-Korrektur** (gewählt): nutzt nur x/y, die im Stillstand ruhig sind. Die Verkürzung des Unterarms zeigt, wie weit er sich aus der Bildebene geneigt hat. Unter der Annahme, dass die Hand diese Neigung mitmacht, ergibt sich die Formel oben. Bei r = 1 ist sie identisch mit dem alten 2D-Winkel. Längenrauschen wirkt nur quadratisch (2 % Rauschen → < 0,5° bei 10°).
- **3D im Bezugssystem der Hand** (ADR 0002): im Stillstand unruhig wegen z-Rauschen. Verworfen.
- **2D behalten, bei Armdrehung aussetzen oder grau zeigen**: ruhig, aber beim Lagenwechsel oft ohne Feedback. Verworfen.
- **z stark glätten**: ruhiger, aber träge, und der Erfolg ist ungewiss. Verworfen.

## Consequences

- **Abnahme** (`tests/wrist/angle-orientation-drift.test.ts`): Gute Haltung (5°) bleibt bei Armdrehung um sechs Achsen bis 80° unter 8°, also blau. Der reine 2D-Winkel steigt dabei bis ≈ 29°. Ein echter Knick in der Bildebene (20°/40°/55°) wird ohne Drehung exakt erkannt und durch Drehung höchstens ≈ 2,2° überhöht.
- **Grenze**: Dreht sich der Arm um die **eigene Längsachse**, wird er im Bild nicht kürzer. Dann gibt es nichts zu korrigieren; ein echter Knick kann kleiner erscheinen (Richtung blau, nicht gelb). Ohne Tiefe nicht lösbar.
- **Grenze Vorzeichen**: Der Bildwinkel hat kein Vorzeichen. Ist die gespeicherte Haltung schon gebeugt (z. B. 10°) und knickt die Hand durch die Gerade hindurch in die Gegenrichtung (−10°), misst sich derselbe Betrag, die Abweichung ist 0. Geschützt durch einen Charakterisierungstest in `tests/wrist/knick-tracker.test.ts`; Fix-Kandidat: Vorzeichen per 2D-Kreuzprodukt (`computeBendDirection2D`).
- Die Korrektur **senkt** den Wert nur, sie erhöht ihn nie. Falsches Gelb durch Armdrehung wird dadurch kleiner. Der Preis: Ein echter Knick bei stark verkürztem Unterarm wird schwächer gemeldet.
- `calibArmLength2D` wird jetzt mit Seitenverhältnis gemessen (sonst verfälscht die Bildbreite das Längenverhältnis je nach Armrichtung).
- `calibKnick`/`calibKnickFallback` in der `MasterPrint` ersetzen `calib2DAngle`/`calib2DAngleFallback`.
- Farb-Schwellen und Zeitkonstanten (#75) werden auf dieser Größe festgelegt.

Herkunft: Wegfindungs-Karte #71, Diagnose #78, Umsetzung und Geigen-Test #82.
