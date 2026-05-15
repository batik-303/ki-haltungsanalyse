## 1. Offset-Korrektur vorbereiten

- [x] 1.1 Korrekturfaktor und Schwellenwert als Konstante(n) definieren
- [x] 1.2 Zugriff auf Kalibrier-Armlänge und aktuelle 2D-Armlänge sicherstellen

## 2. Offset-Berechnung implementieren

- [x] 2.1 Vektor Wrist → MCP (Midpoint Pinky/Index) berechnen
- [x] 2.2 Proportionalen Offset bei >10% Armverlängerung berechnen
- [x] 2.3 Offset nach One-Euro-Filterung anwenden

## 3. Rendering und Feedback anpassen

- [x] 3.1 Anker-Rendering auf korrigierte Position umstellen
- [x] 3.2 Visuelles Feedback (Glow, Linien) auf korrigierte Position umstellen

## 4. Tests und Feinschliff

- [ ] 4.1 Unit-Tests für Offset-Berechnung und Aktivierungsschwelle schreiben
- [x] 4.2 Visuelle Tests in tiefen Lagen durchführen
- [x] 4.3 Korrekturfaktor ggf. anpassen (User-Feedback)
