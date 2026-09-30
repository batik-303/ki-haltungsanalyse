# MediaPipe im Wrist-Modus — technische Referenz

Dieses Dokument erklärt, **wie** der Wrist-Modus MediaPipe nutzt: welche Modelle laufen, welche Punkte wir lesen, wie daraus Anker, Knick und Farbe entstehen, und wo die bekannten Grenzen liegen. Es richtet sich an Entwickler, die den Code verstehen und prüfen wollen, statt nur dem Ergebnis zu vertrauen.

**Stehende Regel** (Wegfindungs-Karte #71): Jede Ticket-Sitzung im Wrist-Modus ergänzt hier die MediaPipe-Technik, die sie berührt, mit Datei:Zeile-Verweisen, und hakt die Liste „Offene technische Punkte" ab.

Stand: `main` nach PR #80/#81 (26.09.2026), §2 und §5 aktualisiert mit #82 (ADR 0003). Zeilennummern beziehen sich auf diesen Stand.

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
2. **Die z-Werte von Pose und Hand haben verschiedene Nullpunkte.** Ein Vektor „Pose-Ellbogen → Hand-Handgelenk" hat damit eine z-Komponente ohne echte Bedeutung (Hand-z ≈ 0 minus Ellbogen-Tiefe relativ zur Hüfte). Das tun weiterhin `computePalmBendSign` und `computeForearmLength3D` (Bend-Lock, nur **Vorzeichen** bzw. Toleranz-Maßstab). Der **Knick** nutzt seit #82 gar kein z mehr (siehe §5).
3. Die z-Werte sind **Schätzungen** aus einem einzigen Kamerabild, keine gemessene Tiefe. Sie rauschen stärker als x/y. Beim Geigen-Test von #82 sprang eine z-basierte Knick-Messung schon im Stillstand (§5).

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

## 5. Der Knick — 2D-Winkel mit Verkürzungs-Korrektur (#82)

Diagnose in #78. Begriff **Knick**: siehe `CONTEXT.md`. Entscheidung: ADR `docs/adr/0003-knick-2d-mit-verkuerzungs-korrektur.md` (löst ADR 0002 ab).

### Vorgeschichte in drei Schritten

1. **Reiner 2D-Winkel** (bis #82): `computeCollinearityAngle2D(poseElbow13, hand[0], hand[9], aspect)` minus Baseline. Im Stillstand ruhig. Beim Lagenwechsel dauerhaft gelb: Dreht sich der Arm aus der Bildebene, läuft der projizierte Winkel weg (Modell: echte 5° → bis ≈ 29° im Bild; Videos zeigten 98–132°). Die „nur-steigen"-Sperre bei `foreConf < 0.7` hielt den hohen Wert fest.
2. **3D im Bezugssystem der Hand** (ADR 0002, erster Versuch in #82): Knick = asin(Unterarm · Handflächen-Normale) aus den z-Werten. Im synthetischen Test exakt drehinvariant. Beim Geigen-Test sprang der Anker aber **schon im Stillstand**, bei jeder Kameraperspektive. Einzige neue Zutat war z. Geometrie: Die Handebene kommt aus drei Punkten mit ca. 0,06 Bildbreite Abstand; ein z-Fehler von 0,01 Bildbreite kippt sie um ≈ 9,5° (Farbschwelle: 8°). Verworfen.
3. **2D + Verkürzungs-Korrektur** (ADR 0003, heute): siehe unten.

### Messung (`src/core/analysis/wrist-analyzer.ts`)

```
Winkel2D = computeCollinearityAngle2D(Ellbogen, Handgelenk, Mittelfinger-MCP, aspect)
r        = computeArmLength2D(Pose 13, Pose 15, aspect) / calibArmLength2D   (≈ cos α)
Knick    = computeCorrectedKnick(Winkel2D, r)
         = acos( cos(Winkel2D) · r² + (1 − r²) )
```

- **Idee**: Wird der Unterarm im Bild kürzer, hat er sich um α aus der Bildebene geneigt. Macht die Hand diese Neigung mit, ist das die Formel für den echten Winkel. Nur x/y, **kein z**.
- **r ≥ 1** (keine Verkürzung): Knick = Winkel2D, also genau die im Stillstand ruhige alte Messung.
- **Rauschen**: Längenrauschen wirkt quadratisch; 2 % → < 0,5° bei 10°.
- **Nur senken**: Die Korrektur verkleinert den Wert, sie vergrößert ihn nie.
- **Grenze**: Drehung um die **Unterarm-Längsachse** verkürzt den Arm nicht und bleibt unkorrigiert. Ein echter Knick kann dann kleiner erscheinen (Richtung blau, nicht gelb).
- `computeArmLength2D` misst jetzt mit `aspect`, sonst hinge das Verhältnis von der Armrichtung im Bild ab.

### Ablauf pro Frame (`createKnickTracker`, `src/core/analysis/knick-tracker.ts`)

Der Hook `use-pose-detection.ts` ruft pro Frame nur `knickTrackerRef.current.update(...)` auf. Der ganze Ablauf ist eine reine Funktion und damit testbar:


1. **Knick** je Pfad: Hand-Pfad mit `hand[0]`/`hand[9]`, Pose-Fallback mit Pose-`worldLandmarks` 13/15/MCP(17,19). Beide mit demselben `r` aus Pose-Bildkoordinaten.
2. **Baseline**: `|Knick − calibKnick|` bzw. `|Knick − calibKnickFallback|`, gespeichert bei „Haltung speichern" (`master-print.ts`, dort r = 1).
3. **Pfadwechsel**: erster Frame nach Wechsel Hand ↔ Pose max. ±3° Sprung (unverändert).
4. **Glättung**: EMA 0,25. Keine Nur-steigen-Sperre, kein Z-Boost mehr.
5. **Farbe**: `createWristRailColor` unverändert (blau → gelb bei > 8° für 8 Frames, gelb → blau bei < 5° für 4 Frames). Schwellen auf der neuen Größe: #75.

### Abnahme-Tests

- `tests/wrist/angle-orientation-drift.test.ts`: gute Haltung (5°) bei Armdrehung um sechs Achsen bis 80° bleibt ≤ 8° (reiner 2D-Winkel: bis ≈ 29°). Echter Knick 20°/40°/55° in der Bildebene exakt erkannt, durch Drehung höchstens ≈ 2,2° überhöht. Grenze Längsachse als Charakterisierung.
- `tests/wrist/knick-baseline.test.ts`: Baselines in derselben Größe wie die Laufzeit.
- `tests/wrist/knick-tracker.test.ts`: ganzer Ablauf von „Haltung speichern" bis Farbe, entsprechend dem Geigen-Test: Stillstand mit Pixelzittern 10 s blau; z-Werte ändern nichts; Armdrehung bis 70° bei guter Haltung blau; 20° Knick gelb und zurück blau; stark verkürzter Unterarm hält kein Gelb fest; Pfadwechsel begrenzt auf 3°. Knick durch die Gerade in Gegenrichtung wird gelb (#91); gemittelte Kalibrierung hält Stillstand trotz Ausreißer im Erfassungs-Frame blau. Mutationsprobe: Wiedereinbau der Nur-steigen-Sperre oder eines z-Einflusses macht je einen Test rot.

---

## Offene technische Punkte

- [x] Anker-Quelle `handLandmarks[0]`, kein Pose-15-Seed (#73 → #79, PR #80)
- [x] Liefert der HandLandmarker Sichtbarkeit pro Punkt? → Nein (#74)
- [x] Ursache Dauergelb (#78) → 2D-Bildwinkel nicht rotationsinvariant + Nur-steigen-Sperre
- [x] **z-Nullpunkte mischen** beim Knick: erledigt, der Knick nutzt kein z mehr (#82, ADR 0003)
- [ ] Bend-Lock (`computePalmBendSign`, `computeForearmLength3D`) mischt für das **Vorzeichen** weiterhin Pose-Ellbogen und Hand-Handgelenk; bei Bedarf auf ein z-freies Vorzeichen umstellen, z. B. `computeBendDirection2D` (#76, periphere Kipprichtung)
- [x] Geigen-Gegen-Check der Verkürzungs-Korrektur: „funktioniert schon ganz gut" (Nutzerin, 26.09.2026) (#82)
- [x] Seite des Knicks: Knick durch die Gerade in Gegenrichtung wird erkannt (#91, ADR 0003)
- [ ] Grau-Signal fehlt noch: nach Wegfall der Nur-steigen-Sperre läuft der Knick bei schlechter Sicht frei weiter; bei stark verkürztem Unterarm (r → 0) liefert die Korrektur ≈ 0, also blau statt grau (#74)
- [ ] Grau-Signal `computeAnchorVisibility` bauen; Schwellen an echtem Spielmaterial prüfen. Beim Spielen tritt voller Handverlust selten auf, grau hängt eher an `foreConf` (#74-Kommentar)
- [x] Research-Notiz `mediapipe-hand-visibility.md` nach `main` geholt (Research-Branch danach gelöscht)
- [ ] Schwellen/Zeitkonstanten der Farbe auf der neuen Messgröße festlegen (#75)
