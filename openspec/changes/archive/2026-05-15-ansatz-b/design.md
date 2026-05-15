## Context

Der aktuelle Wrist-Ankerpunkt (LEFT_WRIST, Landmark 15) driftet bei gestrecktem Arm (tiefe Lagen) sichtbar vom anatomischen Handgelenk ab. Dies ist ein bekanntes Problem bei MediaPipe Pose, da der Landmark-Algorithmus in diesen Perspektiven weniger zuverlässig ist. Die Nutzererfahrung leidet, da das visuelle Feedback nicht mehr der tatsächlichen Handposition entspricht.

## Goals / Non-Goals

**Goals:**
- Die Ankerposition soll auch bei starker Armverlängerung möglichst anatomisch korrekt bleiben
- Die Korrektur soll rein auf Pose-Landmarks basieren (keine Hand-Landmarker-Integration)
- Die Lösung muss konfigurierbar und robust gegenüber Messrauschen sein

**Non-Goals:**
- Keine Änderung an der Winkelberechnung oder Feedback-Logik
- Keine Integration zusätzlicher Modelle (z.B. Hand Landmarker)
- Keine Änderung an bestehenden API-Schnittstellen

## Decisions

- Die Offset-Korrektur wird als proportionaler Vektor entlang des Arms (Wrist → MCP) implementiert, aktiviert ab 10% Überschreitung der Kalibrier-Armlänge
- Der Korrekturfaktor ist konfigurierbar (z.B. 3–5%) und wird empirisch abgestimmt
- Die Korrektur erfolgt nach der One-Euro-Filterung, um Jitter zu vermeiden
- Die visuelle Rückmeldung (Anker, Glow, Linien) verwendet ausschließlich die korrigierte Position
- Keine zusätzliche Filterung oder Glättung für den Offset selbst (One-Euro reicht aus)
- Die Lösung bleibt rückwärtskompatibel: Bei normaler Haltung bleibt alles wie bisher

## Risks / Trade-offs

- [Risk] Zu starker Offset könnte bei bestimmten Haltungen zu anatomisch falscher Position führen → Mitigation: Korrekturfaktor konservativ wählen, User-Feedback einholen
- [Risk] Messrauschen bei Landmark-Detektion könnte zu Flackern führen → Mitigation: Offset erst ab signifikanter Armverlängerung aktivieren, Schwellenwert setzen
- [Risk] Lösung ist spezifisch für Violine und könnte bei anderen Instrumenten nicht passen → Mitigation: Korrektur nur im Violin-Modus aktivieren
