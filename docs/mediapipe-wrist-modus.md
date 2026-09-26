# MediaPipe im Wrist-Modus — technische Referenz

Dieses Dokument erklärt, **wie** der Wrist-Modus MediaPipe nutzt: welche Modelle laufen, welche Punkte wir lesen, wie daraus Anker, Knick und Farbe entstehen, und wo die bekannten Grenzen liegen. Es richtet sich an Entwickler, die den Code verstehen und prüfen wollen, statt nur dem Ergebnis zu vertrauen.

**Stehende Regel** (Wegfindungs-Karte #71): Jede Ticket-Sitzung im Wrist-Modus ergänzt hier die MediaPipe-Technik, die sie berührt, mit Datei:Zeile-Verweisen, und hakt die Liste „Offene technische Punkte" ab.

Stand: `main` nach PR #80/#81 (26.09.2026). Zeilennummern beziehen sich auf diesen Stand.

---

## 1. Zwei Modelle pro Frame

Im Wrist-Modus laufen **zwei** MediaPipe-Tasks aus `@mediapipe/tasks-vision` (WASM `0.10.18`), beide mit `runningMode: 'VIDEO'` und `delegate: 'GPU'`:

| Task | Modell | Erzeugt in | Liefert |
|---|---|---|---|
| `PoseLandmarker` | `pose_landmarker_lite` (float16) | `src/hooks/use-pose-detection.ts:138` | 33 Körperpunkte, **mit** `visibility`, plus `worldLandmarks` |
| `HandLandmarker` | `hand_landmarker` (float16), `numHands: 2` | `src/hooks/use-pose-detection.ts:197` | 21 Handpunkte je Hand, **ohne** `visibility`, plus `handedness` |

Der HandLandmarker wird **nur im Wrist-Modus** geladen (Lazy Load, `loadHandLandmarker`). Beide Modelle bekommen **dasselbe Videobild mit demselben Zeitstempel** (`detectForVideo(video, now)`, `use-pose-detection.ts:263` bzw. `:274`), damit Pose- und Handpunkte zeitlich zusammenpassen.

### Welche Hand?

`pickLeftHand` (`src/core/analysis/hand-landmarker.ts:11`) nimmt die Hand, deren `handedness[i][0].categoryName === 'Left'` ist, also die **linke Hand der Geigerin** (Griffhand). Die Spiegelung der Selfie-Kamera ist in der MediaPipe-Handedness bereits berücksichtigt. Gibt es keine linke Hand, ist das Ergebnis `null`.

### Welcher Analysepfad?

`selectAnalysisPath` (`src/core/analysis/analysis-path.ts:16`) entscheidet pro Frame:
- `'hand'`: Handpunkte vorhanden → präziser Pfad.
- `'pose-fallback'`: keine Hand → grobe Pose-Punkte (13/15/17/19), wenn möglich aus `worldLandmarks`.

Beim Pfadwechsel wird der Winkel auf höchstens 3° Änderung pro Frame begrenzt (`use-pose-detection.ts:428–432`), damit nichts springt.

---

## 2. Koordinatensysteme — die wichtigste Falle

MediaPipe liefert **drei verschiedene** Koordinatensysteme. Wer sie mischt, bekommt falsche Winkel.

| Quelle | x, y | z (Tiefe) | Einheit |
|---|---|---|---|
| Pose `landmarks` | normiert auf Bildbreite bzw. -höhe `[0,1]` | Nullpunkt = **Hüftmitte**, kleiner = näher zur Kamera | ungefähr Maßstab von x |
| Pose `worldLandmarks` | Meter | Meter, Nullpunkt = Hüftmitte | isotrop (echte 3D-Einheiten) |
| Hand `landmarks` | normiert auf Bildbreite bzw. -höhe `[0,1]` | Nullpunkt = **Handgelenk (Punkt 0)**, kleiner = näher | ungefähr Maßstab von x |

Quelle: offizielle MediaPipe-Doku (Hands/Pose „Output"). Wichtige Folgen:

1. **x und y sind unterschiedlich normiert** (Breite vs. Höhe). Für Winkel im Bild muss x mit dem Seitenverhältnis `aspect = W/H` skaliert werden. Das macht `computeCollinearityAngle2D` (`src/core/analysis/wrist-analyzer.ts:283`).
2. **Die z-Werte von Pose und Hand haben verschiedene Nullpunkte.** Ein Vektor „Pose-Ellbogen → Hand-Handgelenk" hat damit eine z-Komponente ohne echte Bedeutung (Hand-z ≈ 0 minus Ellbogen-Tiefe relativ zur Hüfte). Genau das tun heute `computePalmBendSign` (`wrist-analyzer.ts:481`) und `computeForearmLength3D` (`:496`). Für ein **Vorzeichen** reicht das meist, für einen **Winkel-Betrag** nicht. → Offener Punkt für das Ticket „Knick unabhängig von der Armdrehung messen" (#82).
3. Die z-Werte sind **Schätzungen** aus einem einzigen Kamerabild, keine gemessene Tiefe. Sie rauschen stärker als x/y.

---

## 3. Der Anker (`handLandmarks[0]`)

Entschieden in #73, gebaut in #79 (PR #80).

- **Quelle**: ausschließlich Hand-Punkt 0 (Handgelenk, am Ulna-Höcker). Kein Pose-Punkt 15 mehr: Der liegt beim Kippen der Hand deutlich daneben (Belege in #73).
- **Reine Funktion**: `resolveWristAnchor` (`src/core/analysis/wrist-anchor.ts:33`), Tests in `tests/wrist/anchor-resolve.test.ts`.
  - Erste Hand-0 → Anker **genau dort** (kein Nachlauf).
  - Danach Glättung (EMA) mit **geschwindigkeits-abhängigem** Gewicht: `ANCHOR_POS_ALPHA = 0.6` im Stillstand bis `ANCHOR_POS_MAX_ALPHA = 0.9` ab 40 px Bewegung pro Frame (`src/rendering/canvas-renderer.ts:33–38`). Ruhig im Stillstand, kein Hinterherhängen beim Lagenwechsel.
  - Hand fehlt → letzte Position **einfrieren**, kein Rückfall auf Pose-15.
- **Vor der Kalibrierung** gibt es keinen Anker (Vorschau-Zweig entfernt).
- Aufruf: `canvas-renderer.ts:166–178`.
- Debug-Overlay (Taste **D**, `state.debugLandmarks`): zeichnet alle 21 Handpunkte in Magenta (`src/rendering/debug-hand-landmarks.ts`). Der „weiße Kreis" ist der Kern des Saphir-Ankers selbst (`sapphire-anchor.ts`), kein Hilfspunkt.

---

## 4. Sichtbarkeit — warum „grau" selbst gebaut werden muss

Ergebnis von #74. Ausführlich mit Primärquellen: [`docs/research/mediapipe-hand-visibility.md`](research/mediapipe-hand-visibility.md).

- Der HandLandmarker liefert pro Punkt **nur x, y, z**, **kein** `visibility`/`presence` (anders als Pose). Das Hand-Modell gibt nur 3 Werte je Punkt aus. Deshalb der Cast `as unknown as Landmark[]` in `pickLeftHand`; `hand[0].visibility` ist `undefined` und darf **nicht** als Signal genutzt werden.
- `minHandDetectionConfidence` / `minHandPresenceConfidence` / `minTrackingConfidence` sind **Eingabe-Schwellen**. Man sieht ihre Wirkung nur daran, dass die Hand aus dem Ergebnis verschwindet.
- `handedness[i][0].score` ist die Sicherheit der **Links/Rechts-Einordnung**, nicht der Sichtbarkeit.

**Geplantes Grau-Signal** (noch nicht gebaut): alle vier müssen erfüllt sein, sonst grau:
1. `pickLeftHand(...) !== null`
2. `handedness score >= 0.6`
3. Hand-Punkt 0 im Bild (`0 <= x,y <= 1`)
4. `wristForeshorteningConfidence >= 0.5`

Dazu asymmetrische Zeit-Hysterese: grau erst nach ~250–300 ms, zurück nach ~100–150 ms. Andockstelle: `computeAnchorVisibility` in `src/core/analysis/anchor-visibility.ts`.

**Verkürzung (Foreshortening)**: `computeForeshorteningConfidence` (`wrist-analyzer.ts:101`) vergleicht die 2D-Unterarmlänge (Pose 13→15) mit der Länge bei der Kalibrierung. Verhältnis ≥ 0,7 → 1,0; ≤ 0,3 → 0; dazwischen linear. Zeigt der Arm zur Kamera, sinkt der Wert.

---

## 5. Der Knick — heutige Messung und warum sie scheitert

Diagnose in #78. Begriff **Knick**: siehe `CONTEXT.md`. Entscheidung: ADR `docs/adr/0002-knick-rotationsinvariant-statt-2d.md`.

### Heutiger Ablauf pro Frame (`use-pose-detection.ts:355–470`)

1. **Rohwinkel** (Hand-Pfad): `computeCollinearityAngle2D(poseElbow13, hand[0], hand[9], aspect)` (`:393`), also der **2D-Bildwinkel** am Handgelenk im Dreieck Ellbogen → Handgelenk → Mittelfinger-Grundgelenk. 0° = gerade.
2. **Baseline**: `|Winkel − calib2DAngle|` (`:413`). `calib2DAngle` wird bei „Haltung speichern" in `createMasterPrint` gespeichert (`src/core/calibration/master-print.ts:74`).
3. **Z-Boost**: `computeZBoost` (`wrist-analyzer.ts:331`) hebt kleine 2D-Winkel (< 3°) an, wenn die Pose-World-z-Differenz Zeigefinger↔Handgelenk auf einen Knick in die Tiefe hindeutet.
4. **Glättung**: EMA 0,25. **Sperre** bei `foreConf < 0.7`: der Wert darf nur steigen, Abfall nur ×0,995 pro Frame (`:438–446`).
5. **Farbe**: `createWristRailColor` (`wrist-analyzer.ts:36`): blau → gelb bei > 8° für 8 Frames, gelb → blau bei < 5° für 4 Frames. Während schneller Lagenwechsel wird der Winkel gedämpft (Slide-Shield).

### Warum das beim Spielen dauerhaft gelb wird

- Ein **2D-projizierter Winkel ist nicht invariant**, wenn sich die Achse aus der Bildebene dreht. Beim Lagenwechsel dreht bzw. verkürzt sich der Unterarm vor der Kamera. Der Bildwinkel läuft weg, obwohl das Handgelenk gleich steht.
- Gemessen (synthetische starre Arm+Hand, nur gedreht, θ = 0…90°): echte Flexion 20° → 0…26°; 40° → 180…40°; 55° → 180…111…55°. Die Videos zeigten 98–132°.
- Die **Skalar-Baseline** kann das nicht ausgleichen: Ist die Armorientierung eine andere als bei der Kalibrierung, stimmt der Versatz nicht mehr.
- Die **Nur-steigen-Sperre** hält den hochgelaufenen Wert fest, weil der Unterarm beim Spielen oft teilweise zur Kamera zeigt.
- Dass der Ausgang von Durchgang zu Durchgang wechselt (mal Dauergelb, mal normal), ist der Fingerabdruck einer nicht-invarianten Messgröße.

### Entschiedene Richtung (Umsetzung: #82)

- Knick im **Bezugssystem der Hand** messen: 3D-Unterarm gegen die Handebene (Handflächen-Normale aus `computePalmNormal`, `wrist-analyzer.ts:453`: Kreuzprodukt Handgelenk→Zeigefinger-Grundgelenk × Handgelenk→Kleinfinger-Grundgelenk).
- Nur die **Beuge-/Streck-Achse** zählt; seitliches Abknicken (radial/ulnar) nicht.
- Baseline in **derselben Größe** in der `MasterPrint`.
- Nur-steigen-Sperre entfernen; schlechte Sicht → grau.
- Abnahme: `tests/wrist/angle-orientation-drift.test.ts` mit `maxDrift <= 10°` bei reiner Armdrehung.
- Fallback, falls Hand-z zu stark rauscht: 3D-Winkel aus Pose-`worldLandmarks`.

---

## Offene technische Punkte

- [x] Anker-Quelle `handLandmarks[0]`, kein Pose-15-Seed (#73 → #79, PR #80)
- [x] Liefert der HandLandmarker Sichtbarkeit pro Punkt? → Nein (#74)
- [x] Ursache Dauergelb (#78) → 2D-Bildwinkel nicht rotationsinvariant + Nur-steigen-Sperre
- [ ] **z-Nullpunkte mischen**: Unterarm-Vektor aus Pose-Ellbogen und Hand-Handgelenk hat eine bedeutungslose z-Komponente. Für den neuen Knick eine konsistente Quelle wählen, z. B. Unterarm-Richtung aus Pose (13→15, beide gleiches z-System, besser `worldLandmarks`) und Handebene aus Handpunkten, verglichen als **Richtungen**, nicht als gemischte Punkte (#82)
- [ ] Rauschen der Hand-z-Werte am echten Spielmaterial prüfen; ggf. Fallback auf Pose-World (#82)
- [ ] Grau-Signal `computeAnchorVisibility` bauen; Schwellen an echtem Spielmaterial prüfen. Beim Spielen tritt voller Handverlust selten auf, grau hängt eher an `foreConf` (#74-Kommentar)
- [x] Research-Notiz `mediapipe-hand-visibility.md` nach `main` geholt (Research-Branch danach gelöscht)
- [ ] Schwellen/Zeitkonstanten der Farbe auf der neuen Messgröße festlegen (#75)
