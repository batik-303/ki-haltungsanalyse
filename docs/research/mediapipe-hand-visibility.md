# Research: MediaPipe HandLandmarker — Sichtbarkeits-Konfidenz pro Landmark für Grau-Zustand

- **Ticket**: #74 (`wayfinder:research`)
- **Branch**: ursprünglich `research/mediapipe-hand-visibility`, später per Doku-PR nach `main` übernommen
- **Bibliothek**: `@mediapipe/tasks-vision` (im Repo verwendet: `@0.10.18`, siehe `src/hooks/use-pose-detection.ts` Z. 195)
- **Datum**: 2026-09-21
- **Quellenpolitik**: Nur Primärquellen (offizielle MediaPipe-`.d.ts`-Typen, Calculator-Quellcode, offizielle Solution-Docs), abgefragt über context7.

## Forschungsfrage

Liefert der **HandLandmarker** (Web/JS) ein verwertbares Signal, ob **Landmark 0** (Handgelenk, `HandLandmark.WRIST = 0`) aktuell zuverlässig sichtbar ist — als Grundlage für einen „Grau-Zustand" des Ankers, wenn die Kamera das Gelenk nicht sieht?

## Kurzantwort

**Nein — es gibt kein per-Landmark-Sichtbarkeitssignal für Hände.** Der HandLandmarker liefert je Landmark **nur `x, y, z`**, **kein `visibility`** und **kein `presence`**. Anders als der PoseLandmarker (dessen Modell Visibility mitliefert) gibt das Hand-Modell diese Felder nicht aus. Ein „Grau-Zustand" muss daher aus **anderen Signalen** zusammengesetzt werden: Vorhandensein einer verwertbaren linken Hand für den Frame, `handedness`-Score, Lage von Landmark 0 im Bildausschnitt und der bereits vorhandenen Foreshortening-Konfidenz aus der Pose.

## Detailbefunde

### 1. Result-Struktur — kein `visibility`/`presence` pro Landmark

Die offizielle Web-Typdefinition (`tasks/web/vision/hand_landmarker/hand_landmarker_options.d.ts`):

```typescript
export declare interface HandLandmarkerResult {
  landmarks: NormalizedLandmark[][];      // pro Hand: 21 normalisierte Landmarks (x,y,z)
  worldLandmarks: Landmark[][];           // pro Hand: 21 metrische Landmarks (relativ zum Handgelenk)
  handednesses: Category[][];             // pro Hand: Links/Rechts-Klassifikation (Alt-Name)
  handedness: Category[][];               // pro Hand: Links/Rechts-Klassifikation
}
```

> Quelle: <https://github.com/google-ai-edge/mediapipe/blob/master/tasks/web/vision/hand_landmarker/hand_landmarker_options.d.ts>

Es existiert **kein** Feld mit Konfidenz je Landmark. Zwar hat der geteilte `NormalizedLandmark`-Typ optionale `visibility`/`presence`-Felder (vom PoseLandmarker genutzt), aber das **Hand-Modell befüllt sie nicht**. Mechanik im Quellcode:

- `TensorsToLandmarksCalculator` setzt `visibility` **nur wenn** die Tensor-Dimension je Landmark `> 3` ist und `presence` nur wenn `> 4`. Das Hand-Modell gibt nur `x,y,z` (3 Dimensionen) aus → beide bleiben ungesetzt (`std::nullopt` / im Web `undefined`).
  > Quelle: <https://github.com/google-ai-edge/mediapipe/blob/master/calculators/tensor/tensors_to_landmarks_calculator.cc>
- Dasselbe ist für das Face-Modell per Unit-Test explizit festgehalten (`visibility`, `presence`, `name` == `std::nullopt`) — gleiches Muster wie Hand.
  > Quelle: <https://github.com/google-ai-edge/mediapipe/blob/master/tasks/cc/vision/face_landmarker/face_landmarker_result_test.cc>

**Konsequenz fürs Repo**: `pickLeftHand` castet nicht ohne Grund `as unknown as Landmark[]` — das interne `Landmark`-Interface verlangt `visibility: number` (`src/core/types.ts` Z. 44–49), aber bei Hand-Landmarks ist dieser Wert **nicht aussagekräftig** (0/undefined). Deshalb darf `hand[0].visibility` **nicht** als Sichtbarkeitssignal genutzt werden.

### 2. Vorhandene Konfidenz-Felder und ihre Bedeutung

| Feld / Option | Ort | Bedeutung |
|---|---|---|
| `handedness[i][0].score` (`Category.score`) | **Result** | Konfidenz der **Links/Rechts-Klassifikation** je Hand (0..1), **nicht** Sichtbarkeit. Nützlich als Zusatzfilter: niedriger Score = unsichere Zuordnung der Greifhand. |
| `minHandDetectionConfidence` | Option (Default 0.5) | Minimalkonfidenz, damit eine Hand-**Detektion** (Palm-Detector) als erfolgreich gilt. Greift, wenn (noch) kein Tracking läuft. |
| `minHandPresenceConfidence` | Option (Default 0.5) | Minimalkonfidenz des **Presence-Scores** des Hand-Landmark-Modells. Fällt der Score darunter, verwirft der Task die Hand für diesen Frame und triggert im nächsten Frame erneut die Palm-Detektion. **Dieser Schwellwert wird intern konsumiert und nicht im Result nach außen gereicht.** |
| `minTrackingConfidence` | Option (Default 0.5) | Minimalkonfidenz fürs **Tracking** zwischen Frames (nur `VIDEO`/`LIVE_STREAM`). Darunter → Neu-Detektion. Höhere Werte = robuster, aber mehr Latenz/Aussetzer. |

> Quellen: `hand_landmarker_options.d.ts` (oben) und `docs/solutions/hands.md`
> <https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/hands.md>

**Wichtig**: `minHandPresenceConfidence`/`minTrackingConfidence` sind **Eingabe-Schwellwerte**, keine auslesbaren Frame-Signale. Ihr Effekt ist ausschließlich beobachtbar über **das Verschwinden der Hand aus `result.landmarks`** — genau das fängt `pickLeftHand` bereits ab (gibt `null` zurück). Das ist damit das robusteste „nicht sichtbar"-Signal, das der Task nach außen gibt.

### 3. Landmark 0 = Handgelenk

`HandLandmark.WRIST = 0` (von 21 Landmarks; `THUMB…`, `INDEX_FINGER…` usw.).
> Quelle: <https://github.com/google-ai-edge/mediapipe/blob/master/tasks/python/vision/hand_landmarker.py>

Die `z`-Koordinate ist die Tiefe **relativ zum Handgelenk** (kleiner = näher an der Kamera); `x,y` sind auf `[0.0, 1.0]` bezogen auf die Bildabmessungen normalisiert — Werte können bei Verlassen des Bildes **außerhalb `[0,1]`** liegen bzw. das Modell extrapoliert.
> Quelle: `docs/solutions/hands.md` (Output `multi_hand_landmarks`).

## Empfehlung: Grau-Bedingung + Hysterese

Da kein direktes Per-Landmark-Signal existiert, wird der Grau-Zustand aus **vier robusten Frame-Signalen** kombiniert. Alle liegen im rAF-Loop bereits vor bzw. sind billig ableitbar:

**Rohsignal „Handgelenk verlässlich sichtbar" (`rawVisible`) pro Frame — wahr, wenn ALLE gelten:**

1. **Hand vorhanden**: `pickLeftHand(handResults) !== null` (fängt `minHandPresence`/`minTracking`-Aussetzer + falsche Handedness ab).
2. **Handedness sicher genug**: `handedness[i][0].score >= 0.6` (Klassifikation stabil). Optional, da `pickLeftHand` bereits nur „Left" nimmt; senkt Flackern bei Zweideutigkeit.
3. **Landmark 0 im Bild**: `0 <= wrist.x <= 1 && 0 <= wrist.y <= 1` (kein Extrapolieren am Rand). Ggf. mit kleinem Rand-Puffer, z. B. `-0.02..1.02`.
4. **Nicht stark verkürzt**: `wristForeshorteningConfidence >= 0.5` (Arm zeigt nicht in die Kamera; existiert bereits als `computeForeshorteningConfidence`). Verhindert „scheinbar sichtbar", wenn das Gelenk zwar detektiert, aber die Tiefe unbrauchbar ist.

**Hysterese (Entprellen, kein Flackern):**

Nicht direkt `rawVisible` an die Anzeige geben, sondern über eine zeitbasierte Bestätigung. Zwei bewährte Varianten:

- **Zeitfenster (empfohlen)**: sichtbar → grau erst nach **≥ 250–300 ms** ununterbrochen `rawVisible === false`; grau → sichtbar bereits nach **≥ 100–150 ms** ununterbrochen `rawVisible === true`. **Asymmetrie passt zur Feedback-Philosophie** des Projekts (langsamer Verfall ins Negative, schnelle Erholung — vgl. CLAUDE.md „Asymmetric tension"): Rückkehr zu „sichtbar/aktiv" fühlt sich sofort an, kurzer Detektions-Aussetzer graut den Anker nicht.
- **Alternativ Schwellwert-Hysterese** auf einem geglätteten Konfidenzwert (EMA über `rawVisible ? 1 : 0`): grau bei `conf < 0.35`, wieder sichtbar bei `conf > 0.6` (getrennte Ein-/Ausschalt-Schwellen = klassische Hysterese-Bandlücke).

Empfohlen ist die **Zeitfenster-Variante** — sie ist deterministisch testbar (reine Funktion über `dt`) und deckt sich mit dem bereits im Code genutzten Muster von Shield-/Grace-Timern.

## Saubere Andockstelle (Architektur-konform)

Die Grau-Logik gehört als **reine Funktion nach `src/core/analysis/`** (keine React-, keine DOM-Abhängigkeit — Import-Grenze aus CLAUDE.md), mit Zustandshaltung als `useRef` im Hook und einem Store-Feld nur fürs UI/Rendering.

Vorschlag (Umsetzung ist **nicht** Teil dieses Research-Tickets):

1. **Neue reine Funktion**, z. B. `computeAnchorVisibility(...)` in einer neuen Datei `src/core/analysis/anchor-visibility.ts` (analog zu `analysis-path.ts`):
   - Eingaben: `hand: Landmark[] | null` (bereits von `pickLeftHand` gefiltert), `handednessScore: number | undefined`, `foreshorteningConfidence: number`, plus **vorheriger Hysterese-Zustand** `{ visible: boolean; sinceMs: number }` und `dtMs`.
   - Ausgabe: neuer Hysterese-Zustand `{ visible: boolean; sinceMs: number }`.
   - Rein und ohne Frameworks → per Vitest testbar (`tests/wrist/…`), wie vom TDD-Workflow verlangt.
2. **`selectAnalysisPath` bleibt getrennt**: Es beantwortet „welcher Analysepfad", nicht „Anker grau". Beide teilen aber die Signal-Quelle (`hand === null`), also gut nebeneinander nutzbar.
3. **Hook** (`use-pose-detection.ts`, Wrist-Zweig ~Z. 357–520): den Hysterese-Zustand in einem `useRef` halten (Triple-State-Regel: Analyse-/Timer-State **nie** in Zustand), pro Frame `computeAnchorVisibility` aufrufen. Die `handedness[i][0].score` müsste `pickLeftHand` zusätzlich zurückgeben (kleine Signaturerweiterung) oder separat aus `handResults` gelesen werden.
   - **Reset**: neues Ref im `resetAnalysisState`-Callback mit zurücksetzen (sonst korrumpiert es die nächste Session — CLAUDE.md-Hinweis).
4. **Store/Rendering**: ein neues Feld, z. B. `wristAnchorVisible: boolean` (analog `wristForeshorteningConfidence`), via `updateFrame` (Conditional-Spread) schreiben; der Wrist-Renderer (`src/rendering/wrist-side-view.ts` / `canvas-renderer.ts` ~Z. 299 nutzt bereits `wristForeshorteningConfidence`) zeichnet den Anker grau, wenn `false`.

## Referenzierte Code-Stellen im Repo

- `src/core/analysis/hand-landmarker.ts` — `pickLeftHand` (liefert linke Hand oder `null`; `as unknown as Landmark[]`-Cast wegen fehlender Visibility begründet).
- `src/core/analysis/analysis-path.ts` — `selectAnalysisPath` (Muster für neue reine Funktion; teilt `hand === null`-Signal).
- `src/core/analysis/wrist-analyzer.ts` — `computeForeshorteningConfidence` (Z. 101, liefert Signal 4).
- `src/hooks/use-pose-detection.ts` — HandLandmarker-Setup (Z. 189–241), `detectForVideo` + `pickLeftHand` (Z. 271–282), Wrist-Analysezweig + `wristForeConf` (Z. 332, 357–520), Store-Write `updateFrame` (Z. 592–601).
- `src/store/pose-store.ts` — `wristForeshorteningConfidence` (Z. 86–87, 215, 459) als Vorlage fürs neue Grau-Feld.
- `src/core/types.ts` — `Landmark` (Z. 44–49) mit Pflichtfeld `visibility` (bei Hand-Landmarks unzuverlässig).

## Fazit

Kein Per-Landmark-Sichtbarkeitssignal von MediaPipe für Hände. Der Grau-Zustand des Ankers wird am zuverlässigsten aus **(1) `pickLeftHand !== null`**, optional **(2) `handedness.score`**, **(3) Landmark 0 innerhalb `[0,1]`** und **(4) `wristForeshorteningConfidence`** kombiniert, entprellt über eine **asymmetrische Zeit-Hysterese (grau nach ~250–300 ms nicht-sichtbar, zurück nach ~100–150 ms sichtbar)**. Umsetzung als reine Funktion in `src/core/analysis/` mit `useRef`-Hysterese im Hook und einem Boolean-Store-Feld fürs Rendering.
