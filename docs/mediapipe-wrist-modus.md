# MediaPipe im Wrist-Modus — technische Referenz

Dieses Dokument erklärt, **wie** der Wrist-Modus MediaPipe nutzt: welche Modelle laufen, welche Punkte wir lesen, wie daraus Anker, Knick und Farbe entstehen, und wo die bekannten Grenzen liegen. Es richtet sich an Entwickler, die den Code verstehen und prüfen wollen, statt nur dem Ergebnis zu vertrauen.

**Stehende Regel** (Wegfindungs-Karte #71): Jede Ticket-Sitzung im Wrist-Modus ergänzt hier die MediaPipe-Technik, die sie berührt, mit Datei:Zeile-Verweisen, und hakt die Liste „Offene technische Punkte" ab.

Stand: `main` nach PR #80/#81 (26.09.2026), §2 und §5 aktualisiert mit #82. Zeilennummern beziehen sich auf diesen Stand.

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
2. **Die z-Werte von Pose und Hand haben verschiedene Nullpunkte.** Ein Vektor „Pose-Ellbogen → Hand-Handgelenk" hat damit eine z-Komponente ohne echte Bedeutung (Hand-z ≈ 0 minus Ellbogen-Tiefe relativ zur Hüfte). Das tun weiterhin `computePalmBendSign` und `computeForearmLength3D` (Bend-Lock, nur **Vorzeichen** bzw. Toleranz-Maßstab). Für den **Knick-Betrag** ist es seit #82 gelöst: Unterarm und Handebene werden als **Richtungen** aus je einem System verglichen (siehe §5).
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

## 5. Der Knick — Messung im Bezugssystem der Hand (#82)

Diagnose in #78. Begriff **Knick**: siehe `CONTEXT.md`. Entscheidung: ADR `docs/adr/0002-knick-rotationsinvariant-statt-2d.md`. Umgesetzt in #82.

### Warum die alte 2D-Messung beim Spielen dauerhaft gelb wurde

- Früher: `computeCollinearityAngle2D(poseElbow13, hand[0], hand[9], aspect)`, also der **2D-Bildwinkel** im Dreieck Ellbogen → Handgelenk → Mittelfinger-Grundgelenk, minus Skalar-Baseline `calib2DAngle`.
- Ein **2D-projizierter Winkel ist nicht invariant**, wenn sich der Arm aus der Bildebene dreht (Lagenwechsel). Gemessen an einer starren Arm+Hand, nur gedreht (θ = 0…90°): echte Flexion 20° → 0…26°; 40° → 180…40°; 55° → 180…111…55°. Die Videos zeigten 98–132°.
- Die Skalar-Baseline gleicht das nicht aus; die „nur-steigen"-Sperre bei `foreConf < 0.7` hielt den hochgelaufenen Wert zusätzlich fest.
- `computeCollinearityAngle2D` bleibt nur noch als Vergleich im Drift-Test (`@deprecated`).

### Neue Messung (`src/core/analysis/wrist-analyzer.ts`)

**Idee**: Bei gerader Hand liegt der Unterarm in der Handebene. Beugen/Strecken kippt die Handebene um ihre Querachse. Der Knick ist daher der **Winkel zwischen Unterarm-Richtung und Handebene**:

```
knick = asin( (f · n) / (|f| · |n|) )     // Grad, vorzeichenbehaftet
f = Unterarm-Richtung, n = Handflächen-Normale
```

- **Rotationsinvariant**: Dreht sich der ganze Arm vor der Kamera, drehen sich `f` und `n` gemeinsam. Ein Skalarprodukt ändert sich dabei nicht.
- **Nur Beuge-/Streck-Achse**: Seitliches Abknicken (radial/ulnar) dreht die Hand um ihre eigene Normale; `n` bleibt gleich, der Knick auch.
- **Vorzeichen**: Beugung und Streckung haben entgegengesetzte Vorzeichen. Welches positiv ist, hängt an der Händigkeit; durch die Baseline-Differenz egal.

**Koordinatensysteme — nie mischen** (§2):

| Pfad | Unterarm `f` | Handebene `n` | Funktion |
|---|---|---|---|
| Hand | Pose 13 → 15 in **Bildkoordinaten** mit `aspect` | `computePalmNormal(hand, aspect)`: Hand 0→5 × 0→17 | `computeHandKnick` |
| Pose-Fallback | Pose 13 → 15 aus `worldLandmarks` (sonst Bild mit `aspect`) | Pose 15→19 × 15→17 (grobe Handebene), gleiche Quelle | `computePoseKnick` |

`f` und `n` sind jeweils **Differenzen innerhalb eines Systems**, deshalb fallen die verschiedenen z-Nullpunkte (Hüftmitte vs. Handgelenk) heraus. Im Hand-Pfad kommen beide Richtungen bewusst aus **Bildkoordinaten**: Pose-Bild und Hand-Bild haben dieselbe Konvention (x/y normiert, z im Maßstab von x). Pose-`worldLandmarks` (Meter) hier zu mischen, würde zwei verschiedene z-Maßstäbe vermengen; schon ein Maßstabsfehler bei z bricht die Drehinvarianz. Für normierte Bildkoordinaten werden x **und z** mit `aspect = W/H` skaliert.

### Ablauf pro Frame (`use-pose-detection.ts`, Wrist-Zweig)

1. **Knick** je Pfad: `computeHandKnick` bzw. `computePoseKnick`.
2. **Baseline**: `|knick − calibKnick|` (Hand) bzw. `|knick − calibKnickFallback|` (Pose). Beide werden bei „Haltung speichern" in `createMasterPrint` mit **denselben** Funktionen gespeichert (`src/core/calibration/master-print.ts`).
3. **Pfadwechsel**: erster Frame nach Wechsel Hand ↔ Pose max. ±3° Sprung (unverändert).
4. **Glättung**: EMA 0,25. **Keine** Nur-steigen-Sperre mehr; schlechte Sicht soll grau zeigen (#74), nicht festgehaltenes Gelb.
5. **Farbe**: `createWristRailColor` unverändert (blau → gelb bei > 8° für 8 Frames, gelb → blau bei < 5° für 4 Frames). Schwellen auf der neuen Größe: #75.

Entfallen: `calib2DAngle`, `calib2DAngleFallback`, `computeZBoost` samt z-Filtern (der Z-Boost glich nur die Tiefenblindheit der 2D-Messung aus und war selbst orientierungsabhängig).

### Abnahme-Test

`tests/wrist/angle-orientation-drift.test.ts`: starre Arm+Hand mit 20°/40°/55° Flexion, gedreht um die Unterarm-Längsachse, die senkrechte Bildachse und eine schräge Achse (θ = 0…90°). Zusicherung `maxDrift <= 10°` (tatsächlich ≈ 0°). Außerdem: seitliches Abknicken ignoriert, z-Nullpunkt-Versatz egal, Seitenverhältnis korrigiert. Kontrolle: die alte 2D-Messung driftet > 10°. Baseline-Gleichheit Kalibrierung ↔ Laufzeit sowie Drehtest für `computeHandKnick` mit MediaPipe-typischer Normierung (x/W, y/H, z/W, verschiedene z-Nullpunkte): `tests/wrist/knick-baseline.test.ts`.

---

## Offene technische Punkte

- [x] Anker-Quelle `handLandmarks[0]`, kein Pose-15-Seed (#73 → #79, PR #80)
- [x] Liefert der HandLandmarker Sichtbarkeit pro Punkt? → Nein (#74)
- [x] Ursache Dauergelb (#78) → 2D-Bildwinkel nicht rotationsinvariant + Nur-steigen-Sperre
- [x] **z-Nullpunkte mischen** beim Knick: Unterarm aus Pose 13→15 (`worldLandmarks`), Handebene aus Handpunkten, verglichen als Richtungen (#82)
- [ ] Bend-Lock (`computePalmBendSign`, `computeForearmLength3D`) mischt für das **Vorzeichen** weiterhin Pose-Ellbogen und Hand-Handgelenk; bei Bedarf auf das Vorzeichen von `knick − calibKnick` umstellen (#76, periphere Kipprichtung)
- [ ] Rauschen der Hand-z-Werte und Maßstab Pose-Bild-z ↔ Hand-Bild-z am echten Spielmaterial prüfen (Geigen-Gegen-Check #82); ggf. HandLandmarker-`worldLandmarks` + Pose-`worldLandmarks` oder Hand-Pfad ganz auf `computePoseKnick`
- [ ] Grau-Signal fehlt noch: nach Wegfall der Nur-steigen-Sperre läuft der Knick bei schlechter Sicht frei weiter (#74)
- [ ] Grau-Signal `computeAnchorVisibility` bauen; Schwellen an echtem Spielmaterial prüfen. Beim Spielen tritt voller Handverlust selten auf, grau hängt eher an `foreConf` (#74-Kommentar)
- [x] Research-Notiz `mediapipe-hand-visibility.md` nach `main` geholt (Research-Branch danach gelöscht)
- [ ] Schwellen/Zeitkonstanten der Farbe auf der neuen Messgröße festlegen (#75)
