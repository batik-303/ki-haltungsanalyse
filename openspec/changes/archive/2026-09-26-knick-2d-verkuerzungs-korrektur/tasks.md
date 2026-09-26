## 1. Specs nachziehen

- [x] 1.1 `wrist-z-smoothing`: Z-Boost-Rampe und z-Filter entfernen, EMA ohne Sperre festhalten
- [x] 1.2 `wrist-baseline-stability`: Baseline auf `calibKnick` und korrigierten Knick umstellen
- [x] 1.3 `wrist-flexion-tracking`: Kalibrier-Felder, Z-Boost entfernen, Verkürzungs-Korrektur ergänzen
- [x] 1.4 `openspec validate --strict` grün; Deltas von Hand übertragen und archiviert (`openspec archive` bricht ab, weil alle bestehenden Specs noch im Delta-Format liegen)
