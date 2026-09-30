# MediaPipe im Wrist-Modus — technische Referenz

Dieses Dokument erklärt, **wie** der Wrist-Modus MediaPipe nutzt: welche Modelle laufen, welche Punkte wir lesen, wie daraus Anker, Knick und Farbe entstehen, und wo die bekannten Grenzen liegen. Es richtet sich an Entwickler, die den Code verstehen und prüfen wollen, statt nur dem Ergebnis zu vertrauen.

**Stehende Regel** (Wegfindungs-Karte #71): Jede Ticket-Sitzung im Wrist-Modus ergänzt hier die MediaPipe-Technik, die sie berührt, mit Datei:Zeile-Verweisen, und hakt die Liste „Offene technische Punkte" ab.

Stand: `main` nach PR #80/#81 (26.09.2026), §2 und §5 aktualisiert mit #82 (ADR 0003), §4 und §6 mit #88 (27.09.2026). Zeilennummern in §4 und §6 beziehen sich auf den Stand nach #88, die übrigen auf den älteren Stand.

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

**Grau-Signal** (gebaut in #88): `computeAnchorVisibility` (`src/core/analysis/anchor-visibility.ts:22`). Alle vier müssen erfüllt sein, sonst sieht die Kamera das Handgelenk nicht sicher:
1. Linke Hand vorhanden (`pickLeftHandDetection`, `src/core/analysis/hand-landmarker.ts:17`, liefert Punkte **und** Handedness-Score)
2. `handedness score >= 0.6`
3. Hand-Punkt 0 im Bild (`0 <= x,y <= 1`)
4. `wristForeshorteningConfidence >= 0.5`

Die Zeit-Hysterese sitzt in der Anker-Farbe (§6): grau nach 250 ms ohne sichere Sicht; zurück nach 150 ms Neu-Messen.

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
5. **Farbe**: Der Tracker liefert neben dem geglätteten Wert (`effectiveKnickDiff`, Anzeige) auch den **ungeglätteten** `knickDiff`. Nur dieser geht in die Anker-Farbe (§6).

### Abnahme-Tests

- `tests/wrist/angle-orientation-drift.test.ts`: gute Haltung (5°) bei Armdrehung um sechs Achsen bis 80° bleibt ≤ 8° (reiner 2D-Winkel: bis ≈ 29°). Echter Knick 20°/40°/55° in der Bildebene exakt erkannt, durch Drehung höchstens ≈ 2,2° überhöht. Grenze Längsachse als Charakterisierung.
- `tests/wrist/knick-baseline.test.ts`: Baselines in derselben Größe wie die Laufzeit.
- `tests/wrist/knick-tracker.test.ts`: ganzer Ablauf von „Haltung speichern" bis Farbe (seit #88 über `createAnchorColorState` und `computeAnchorVisibility`), entsprechend dem Geigen-Test: Stillstand mit Pixelzittern 10 s blau; z-Werte ändern nichts; Armdrehung bis 70° bei guter Haltung nie gelb (stark verkürzt darf grau werden); 20° Knick gelb und zurück blau; stark verkürzter Unterarm hält kein Gelb fest; Pfadwechsel begrenzt auf 3°. Knick durch die Gerade in Gegenrichtung wird gelb (#91); gemittelte Kalibrierung hält Stillstand trotz Ausreißer im Erfassungs-Frame blau. Mutationsprobe: Wiedereinbau der Nur-steigen-Sperre oder eines z-Einflusses macht je einen Test rot.

## 6. Die periphere Leiste — Richtung aus der Knick-Seite (#94)

Entscheidung in #76, gebaut in #94. Eine **senkrechte** Leiste am linken Bildschirmrand, auf Laptop **und** Handy (der waagerechte Handy-Balken `drawWristMobileBar` ist entfallen): unten der **Arm** (immer blau), in der Mitte der **Anker = Gelenk**, oben die **Hand**, die am Anker kippt.

### Seite der Abweichung (`src/core/analysis/knick-tracker.ts:64`)

`measureKnickDeviation` liefert neben dem Betrag `knickDiff` die **Seite** `knickSide` (+1 / −1 / 0). Rechnung: vorzeichenbehafteter Knick (Seite aus dem 2D-Kreuzprodukt, `computeSignedKnick2D`) minus vorzeichenbehaftete gespeicherte Haltung (`calibKnickSide · calibKnick`). Ist die gespeicherte Seite unbekannt (`calibKnickSide = 0`), zählt die Seite des aktuellen Knicks. Der Pose-Fallback liefert 0 (grobe Punkte, Seite zu unsicher). Der Hook reicht sie als Store-Feld `wristKnickSide` weiter (`src/hooks/use-pose-detection.ts:385`).

Bis #94 kam die Kipprichtung aus dem Bend-Lock (`computePalmBendSign` → `lastBendForward`), der z von Pose und Hand mischt (§2). Er ist samt `updateBendLock` und `computeForearmLength3D` entfernt; `computePalmBendSign` bleibt nur noch für `flexBendDir` in der Kalibrierung und das Debug-Overlay.

### Kippwinkel, ruhige Richtung, Belohnung (`createWristBarTilt`, `src/core/analysis/wrist-bar.ts:39`)

- **Blau** → Kippwinkel 0: die gespeicherte Haltung ist „gerade" (kalibrierungsrelativ). **Grau** (#88) → ebenfalls 0, ohne sichere Sicht keine Richtung.
- **Gelb** → Kippwinkel = `knickDiff × 1,5`, höchstens 40° (`:21`), geglättet mit ≈ 150 ms Zeitkonstante (vorzeichenbehaftet: ein Seitenwechsel schwenkt hinüber, statt zu springen).
- **Ruhige Richtung** (`:31`): die Seite wechselt erst, wenn die andere Seite **300 ms ohne Unterbrechung** gemessen wird; Seite 0 zählt nicht und unterbricht nicht. So flackert der Strich nicht zwischen beiden Seiten. 300 ms < 500 ms bis Gelb → beim Gelbwerden zeigt die Hand schon zur richtigen Seite.
- **Bildschirm-Richtung** (`:27`): Seite +1 = Hand dreht im **ungespiegelten** Kamerabild im Uhrzeigersinn. Der CSS-Spiegel macht daraus gegen den Uhrzeigersinn → die Hand der Leiste kippt nach **links**. Die Leiste dreht sich also wie die echte Hand im Spiegelbild. Ob Hals = links: live mit Geige abzunehmen; falls umgekehrt, `SIDE_TO_SCREEN` umdrehen.
- **Belohnung** (`:33`): beim Wechsel gelb → blau leuchtet **nur der Anker** einmal 0,8 s (linear 1 → 0), danach Ruhe. Grau → blau leuchtet nicht (wieder Sicht ist keine Korrektur).

### Zeichnen (`src/rendering/wrist-side-view.ts:61`)

Gesamtlänge 50 % der Canvas-Höhe, Hand 36 %. Die Linienstärke rechnet in CSS-Pixel um (Canvas hat Videogröße, eingepasst per `object-contain`): Arm 16 px auf dem Handy, auf dem Laptop proportional bis 24 px. Auf dem gespiegelten Canvas ist „links auf dem Bildschirm" +x, daher `hx = cx − sin(tilt) · handLen` (`:82`). Der Zustand (`createWristBarTilt`) lebt modul-weit und wird mit `resetWristSideViewSmoothing` bei Kalibrier-Wechsel zurückgesetzt. Grau (#88): Anker und Hand grau, Hand steht gerade, kein Leuchten; die ausgearbeitete Grau-Darstellung folgt mit #92.

### Abnahme-Tests

- `tests/wrist/knick-tracker.test.ts` („Seite der Abweichung"): gespeichert 10°, −10°, 0,5° → Lehnen zu beiden Seiten ergibt die jeweilige Seite; durch die Gerade hindurch zählt als Gegenseite; Pose-Fallback → 0.
- `tests/wrist/wrist-bar.test.ts`: blau → gerade; gelb → ×1,5, max. 40°, sanft; Seite +1 links / −1 rechts; kurzes Flackern, 0,2 s Gegenseite und Seite 0 ändern die Richtung nicht, 1 s Gegenseite schon; Seitenwechsel ohne Sprung; Belohnung genau einmal pro Korrektur, nach 0,9 s Ruhe.

---

## 7. Die Anker-Farbe — ein Zustand blau/gelb/grau (#88)

Entscheidung in #75, gebaut in #88. **Ein** Zustand für Anker, periphere Leiste und Statistik: `createAnchorColorState` (`src/core/analysis/anchor-color.ts:60`), gehalten als `anchorColorRef` im Hook und pro Frame aufgerufen (`src/hooks/use-pose-detection.ts`). Store-Feld: `wristAnchorColor`. Ersetzt `createWristRailColor`, `createWristRepairStatus` und `wrist-visual-state.ts` (Sigmoid/Lila). Der Rutsch-Schutz (`createSlideShield`, #90/#93) bleibt und geht als `slideDamping` in die Farbe ein.

| Regel | Startwert (`ANCHOR_COLOR_DEFAULTS`) |
|---|---|
| Gelb entscheidet der **Durchschnitt** des ungeglätteten Knicks über … | 500 ms |
| rein (blau → gelb) über … | 8° |
| raus (gelb → blau) unter … | 5° |
| Haltedauer bis gelb | 500 ms |
| Haltedauer bis blau | 150 ms |
| ohne sichere Sicht bis grau | 250 ms |
| nach Grau neu messen | 150 ms |

- **Vibrato** um die gerade Haltung mittelt sich weg → blau. Vibrato um eine **geknickte** Haltung bleibt gelb. Schneller Lagenwechsel bleibt über Durchschnitt + Haltedauer blau.
- **Rutsch-Schutz** (#90/#93): rutscht das Handgelenk, zählt der Knick auf dem Weg nach Gelb nur gedämpft (Faktor 0,35). Der Weg nach Blau bleibt ungedämpft — Rutschen hält Blau, macht aber nie Blau (kein Pendeln bei Korrektur-Rucken).
- **Grau hat Vorrang.** Ohne sichere Sicht (§4) wird **nicht gemessen und nicht gezählt**, auch nicht über den Pose-Fallback. Die Farbe bleibt bis zum Grau stehen. Wieder sichtbar: 150 ms nur **neue** Werte sammeln, dann sofort die ehrliche Farbe (Durchschnitt ≥ 8° → gelb, sonst blau), ohne 500-ms-Haltedauer. Ohne Körper im Bild geht der Zustand ebenfalls auf grau (`use-pose-detection.ts`).
- **Darstellung**: binär, mit ca. 0,2 s Überblenden (`createAnchorColorFade`, `anchor-color.ts:135`; gezeichnet in `canvas-renderer.ts:235`). Gelb = Amber `#ffb800` (Glossar „gold"), grau = `#9e9e9e`. Die periphere Leiste zeigt grau ruhig in Grau-Tinte. Das Korrektur-Glühen kommt nur bei gelb → blau, nicht bei grau → blau. Die periphere Leiste (§6) liest denselben Zustand.
- **Statistik** zählt Blau-Zeit (Ankerpunkte, Meilenstein-Timer); grau zählt nicht als blau.
- **Vorübergehender Test-Schalter**: `parseAnchorColorOverrides` (`anchor-color.ts:172`) liest einmal beim Laden die URL, z. B. `?knickGelb=10&knickBlau=6&mittelMs=500&gelbMs=500&blauMs=150`. Kein sichtbarer Regler. Wieder ausbauen, sobald die Werte festgelegt sind.
- **Tests**: `tests/wrist/anchor-color.test.ts` (Lehnen, Vibrato, Korrektur, Ausreißer, Rutsch-Schutz, Grau, Test-Schalter, Überblenden), `tests/wrist/anchor-visibility.test.ts`, `tests/wrist/pick-left-hand.test.ts`.
- **Offen**: Live-Befund 30.09. (Abnahme #96): Richtung Hals wird erst bei stärkerem Knick und nach ≈ 1–2 s gelb, Richtung Schnecke direkt. Ziel: beide Seiten gleich, siehe #88-Kommentar. Zahlenanzeige und Spannung laufen während grau weiter über den Pose-Fallback; nur die Farbe pausiert.

---

## Offene technische Punkte

- [x] Anker-Quelle `handLandmarks[0]`, kein Pose-15-Seed (#73 → #79, PR #80)
- [x] Liefert der HandLandmarker Sichtbarkeit pro Punkt? → Nein (#74)
- [x] Ursache Dauergelb (#78) → 2D-Bildwinkel nicht rotationsinvariant + Nur-steigen-Sperre
- [x] **z-Nullpunkte mischen** beim Knick: erledigt, der Knick nutzt kein z mehr (#82, ADR 0003)
- [x] Bend-Lock mit gemischtem z für die Kipprichtung entfernt; die periphere Leiste nimmt die z-freie Knick-Seite (#94, §6)
- [ ] Live-Abnahme Kipprichtung: Hals = links, Schnecke = rechts (`SIDE_TO_SCREEN`, #94)
- [x] Geigen-Gegen-Check der Verkürzungs-Korrektur: „funktioniert schon ganz gut" (Nutzerin, 26.09.2026) (#82)
- [x] Seite des Knicks: Knick durch die Gerade in Gegenrichtung wird erkannt (#91, ADR 0003)
- [x] Grau-Signal: bei stark verkürztem Unterarm (Konfidenz < 0,5) jetzt grau statt blau (#88)
- [x] Grau-Signal `computeAnchorVisibility` gebaut (#88); Schwellen an echtem Spielmaterial prüfen (Geigen-Test)
- [x] Research-Notiz `mediapipe-hand-visibility.md` nach `main` geholt (Research-Branch danach gelöscht)
- [x] Schwellen/Zeitkonstanten der Farbe: Startwerte 8°/5°, 500/150 ms, Durchschnitt 500 ms (#75 → #88)
- [ ] Endwerte per Test-Schalter mit der Nutzerin (und 1–2 Schülern) festlegen, danach `parseAnchorColorOverrides` wieder ausbauen (#88)
