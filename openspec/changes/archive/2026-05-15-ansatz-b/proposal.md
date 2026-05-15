## Why

Der aktuelle Wrist-Ankerpunkt (Landmark 15, LEFT_WRIST) driftet in tiefen Lagen (Arm Richtung Schnecke gestreckt) sichtbar vom anatomischen Handgelenk ab. Dies führt zu ungenauem Feedback und kann die Nutzererfahrung beeinträchtigen. Eine systematische Korrektur ist nötig, um die Ankerposition auch bei starker Armverlängerung stabil und anatomisch sinnvoll zu halten.

## What Changes

- Einführung einer Offset-Korrektur für den Wrist-Anker basierend auf der relativen Armverlängerung (2D-Länge vs. Kalibrierung)
- Optional: Konfigurierbarer Korrektur-Faktor (z.B. 3–5% des Vektors Richtung MCP)
- Keine Änderung an der Winkelberechnung oder den Feedback-Layern
- Keine Abhängigkeit von Hand-Landmarks außerhalb von Pose (keine Hand-Landmarker-Integration)

## Capabilities

### New Capabilities
- `wrist-anchor-offset`: Korrigiert die Position des Wrist-Ankers bei gestrecktem Arm durch einen proportionalen Offset entlang des Arms, um perspektivische Drift zu kompensieren.

### Modified Capabilities
- `wrist-visual-feedback`: Die visuelle Rückmeldung wird durch die stabilere Ankerposition präziser, aber die Requirements der bestehenden Spezifikation bleiben unverändert.

## Impact

- Betroffene Dateien: src/hooks/use-pose-detection.ts, src/rendering/canvas-renderer.ts, ggf. core/analysis/
- Keine Breaking Changes, keine API-Änderungen
- Keine neuen externen Abhängigkeiten
- Verbesserte Nutzererfahrung in tiefen Lagen (Violine)
