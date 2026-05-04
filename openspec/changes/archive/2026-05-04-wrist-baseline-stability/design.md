## Context

Im Handgelenk-Modus wird die Abweichung des Handgelenks als 2D-Kollinearitätswinkel (`computeCollinearityAngle2D`) gemessen. Dieser Wert wird per Frame im Hook berechnet und direkt als `rawDeviation * 30` an den Renderer weitergereicht, wo ein lokaler `DEADZONE_DEG = 10` die Farbe bestimmt (Blau vs. Gelb). Probleme:

1. **Kein Nullpunkt**: `calib2DAngle` existiert optional im `WristMasterPrint`, wird aber bei der Kalibrierung nicht gesetzt und nicht von der Live-Messung abgezogen. Ergebnis: die Kalibrierungs-Haltung selbst hat bereits einen Winkel > 0° → sofort Gelb.
2. **Kein Grace-Puffer**: Mikrobewegungen beim Drücken der Speichern-Taste (Kalibrierung) verschieben die Landmark-Position gerade genug, um den Deadzone zu überschreiten.
3. **Symmetrische Schwelle**: Blau→Gelb und Gelb→Blau nutzen denselben `DEADZONE_DEG = 10`. Natürliches Handgelenk-Zittern um die Grenze verursacht Farbflackern.
4. **Renderer-lokale Entscheidung**: `wrist-lines.ts` und `wrist-side-view.ts` berechnen beide unabhängig `inDeadzone = angleDiff <= DEADZONE_DEG`. Das dupliziert Logik und macht zentrale Hysterese unmöglich.

## Goals / Non-Goals

**Goals:**
- Nach Kalibrierung ist die Abweichung exakt 0° (absoluter Nullpunkt)
- In den ersten 500 ms nach Kalibrierung verhindert ein 2° Grace-Puffer falsches Gelb
- Sticky-Blue-Hysterese: Gelb erst bei ≥ 8°, zurück auf Blau bei < 5°
- Eine zentrale Farbentscheidung im Analysis-Hook, die der Renderer nur noch liest

**Non-Goals:**
- Änderung der Tension-Berechnung oder Layer-Klassifizierung
- Änderung der Violin- oder Shoulder-Modi
- Änderung der Repair-Status-Logik (bleibt mit eigener 10°-Deadzone)
- Anpassung der Rail-Timer-Deadzone (bleibt bei 10°)

## Decisions

### 1. Baseline-Normalisierung über `calib2DAngle`

`calib2DAngle` wird beim Kalibrieren im `WristMasterPrint` gespeichert. Die Live-Abweichung wird als `Math.abs(currentAngle - masterPrint.calib2DAngle)` berechnet statt als roher `angleDiff2D`.

**Rationale**: Einfachste Änderung — ein Subtrahend. Alternativ: Offset in einem separaten Feld → mehr Indirection ohne Vorteil.

### 2. Grace Buffer als zeitbasierter Decay

`lastCalibrationAt` (Timestamp) wird im Store gespeichert. Im Hook wird geprüft: `if (now - lastCalibrationAt < 500) graceBuffer = 2`. Der Buffer wird zur Hysterese-Schwelle addiert.

**Rationale**: Zeitbasiert ist einfacher als ein frame-basierter Counter. 500 ms reichen, um die Hand nach dem Tastendruck zu stabilisieren. Alternative: Grace auf Basis von Deviations-Varianz → zu komplex für den Effekt.

### 3. Sticky-Blue als Factory-Closure (`createWristRailColor`)

Neue Factory-Funktion in `wrist-analyzer.ts`:
```ts
export function createWristRailColor(blueToYellowDeg = 8, yellowToBlueDeg = 5) {
  let isBlue = true
  return function update(angleDeg: number, graceBufferDeg = 0): boolean {
    if (isBlue) {
      if (angleDeg >= blueToYellowDeg + graceBufferDeg) isBlue = false
    } else {
      if (angleDeg < yellowToBlueDeg) isBlue = true
    }
    return isBlue
  }
}
```

**Rationale**: Gleicher Pattern wie `createWristRepairStatus` — Closure-State im `useRef`, reine Funktion, testbar. Alternative: State im Zustand-Store → unnötige Reaktivität für ein Frame-Level-Detail.

### 4. Renderer konsumiert `wristRailIsBlue` aus Store

Statt `const inDeadzone = angleDiff <= DEADZONE_DEG` in `wrist-lines.ts` und `wrist-side-view.ts` wird `state.wristRailIsBlue` gelesen. Der Hook schreibt den Wert per Frame in den Store.

**Rationale**: Single source of truth. Der Renderer soll keine Analyse-Entscheidungen treffen (Architektur-Regel: Rendering liest Store, berechnet nicht). Alternative: Event-basierter Ansatz → unnötige Komplexität für einen per-Frame-Wert.

## Risks / Trade-offs

- **[Store-Write pro Frame]** `wristRailIsBlue` wird jeden Frame geschrieben → Zustand batched ohnehin. Kein Render-Trigger, da Rendering via `getState()` liest, nicht via Selector-Subscription. → Kein Risiko.
- **[Grace-Buffer maskiert echte Abweichung]** 500 ms mit +2° könnte eine echte Fehlhaltung kurz unsichtbar machen → Bei 2° und 500 ms vernachlässigbar; die Tension-Berechnung läuft unverändert weiter.
- **[Bestehende Tests]** `wrist-repair-status.test.ts` nutzt eigene Deadzone (10°) und wird nicht geändert. `wrist-rail.test.ts` testet Timer, nicht Farbe. Neue Tests decken nur die neue `createWristRailColor` ab.
