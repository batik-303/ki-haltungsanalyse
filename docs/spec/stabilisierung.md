# Spec: Aufräumen, Stabilisieren und Deployen (bis DigitalOcean)

Stand: 13.11.2026 · Karte [#154](https://github.com/batik-303/ki-haltungsanalyse/issues/154) · Ticket [#165](https://github.com/batik-303/ki-haltungsanalyse/issues/165)

Diese Spec fasst die Entscheidungen der Karte #154 zusammen. Sie verhandelt nichts neu. Details stehen in den verlinkten Tickets und unter `docs/research/`.

## 1. Ziel

Die App wird zu einer **stabilen PWA**, die als statische Seite aus `main` auf der **DigitalOcean App Platform** läuft. Der Weg dorthin:

1. **Aufräumen** (erledigt, #155, #156)
2. **Regeln** für Git, Tags und Release (#157)
3. **Architektur und Testabdeckung** mit strengem TDD (#162, #163)
4. **Preview-Testumgebung**: Cloudflare-Tunnel und Diagnose-Logs (#160, #161)
5. **PWA** mit selbst ausgelieferten MediaPipe-Dateien (#159)
6. **Deployment** auf DigitalOcean (#158)

Das Verhalten der App bleibt beim Umbau gleich. Neue Funktionen (Karte #71) und die Landingpage (Karte #133, pausiert) warten, bis diese Spec umgesetzt ist.

## 2. Ausgangslage nach dem Aufräumen

- **Triage (#155):** „Später“ heißt **blockiert durch**, es gibt keine neuen Labels. #71 und #133 sind blockiert durch #154. Blockiert durch #154 sind auch #113, #120, #126, #131, #144–#148. #122 (Stellschrauben-Datei) ist blockiert durch #163. #130 ist geschlossen, der Eimer-Weg verworfen.
- **Branches (#156):** Übrig sind `main`, die Research-Branches dieser Karte, `prototype/landingpage-design` und zwei Landingpage-Recherchen (nur auf GitHub).

## 3. Regeln: Git, Tags, Release (#157)

Die Regeln stehen in `CLAUDE.md` (Abschnitt Git-Workflow) und in `docs/agents/issue-tracker.md` (Herdr-Steuerung). Kurzfassung:

| Thema | Regel |
|---|---|
| `main` | linear, Änderungen nur per Squash-PR, 1 Approval von @baxt5878 |
| Agent-Sitzung | eigener Worktree aus `origin/main`, nie im Haupt-Clone |
| Remote | nur `origin` → `batik-303/ki-haltungsanalyse`, `upstream` entfällt |
| Testen vor Release | `vite preview` über den Cloudflare-Tunnel, die Nutzerin übt damit auf dem Gerät |
| „Stabil“ | entscheidet allein die Nutzerin |
| Tag | Semver `vMAJOR.MINOR.PATCH`, nur auf Ansage „taggen“; der Agent setzt den Tag auf `main` und pusht ihn |
| Deploy | `deploy_on_push` aus; Deploy und Rollback macht die Nutzerin in DigitalOcean |
| Herdr | Orchestrator-Sitzung + je Ticket ein Tab „#n Kurzname“; Meldungen per herdr-link: `WARTET`, `FERTIG`, `HÄNGT` |

## 4. Architektur und TDD-Reihenfolge (#162, #163)

### Ausgangslage

Testabdeckung gesamt 24 % Zeilen. Der Handgelenk-Kern ist fast vollständig getestet, `core/signal`, Session-Tracker, Hooks und Rendering stehen bei 0 %. Das Zusammenspiel pro Bild steckt ungetestet in `use-pose-detection.ts` (648 Zeilen, ~15 `useRef`-Bausteine, `resetAnalysisState` setzt sie von Hand zurück).

### Zielbild

- **Hauptnaht** zwischen MediaPipe und `src/core/`: Über die Naht gehen nur Punkte und Zeit (`frame = { pose, world?, hand?, handednessScore?, nowMs, aspect }`). Kein Video, kein Canvas, kein Store. Die Zeit kommt immer von außen.
- **Zwei tiefe Module**, eins je Lebenszyklus:
  - **Kalibrier-Ablauf** `createCalibrationFlow()` mit `step(frame)`: schluckt Abstand, Bereitschafts-Tor, Speicher-Ablauf und Proben-Sammeln.
  - **Haltungs-Auswertung** `createPostureAnalyzer({ focusMode, masterPrint, sensitivity })` mit `step(frame) → FrameResult`: schluckt Knick-Tracker, Rutsch-Schutz, Grau-Tor, Leiste, Spannung, Ebene, Glättung, Sitzungs-Zähler und die Moduswahl.
- **Kein `reset()`**: Neu starten = neue Instanz. `resetAnalysisState` entfällt.
- **Hook = dünner Adapter** (Ziel unter ~150 Zeilen, keine Rechenlogik), abgesichert über den Gerätetest.
- **Ohne Unit-Test bleiben bewusst**: `session-db.ts`, `layout-system.ts`, Komponenten, `use-voice-control.ts` (außer `humanizeError`, das nach `core/` wandert). Store: Selektoren bekommen Tests, Setter nicht.
- **Testdaten** sind künstliche Punktfolgen aus einem Test-Helfer (`frameWithKnick({ deg: 25, side: 'hals' })`, `frameHandMissing()`, `frameSlide()`), keine Bild- oder Videoauswertung.
- **Kein Prozent-Ziel**: Jede benutzte Logik in `src/core/` ist getestet. Die Abdeckung wird gemessen, aber nicht in der CI erzwungen.
- Beim ersten Umsetzungs-Ticket: ADR für Naht und Module, Glossar-Einträge **Kalibrier-Ablauf** und **Haltungs-Auswertung** in `CONTEXT.md`.

### TDD bei bestehendem Code

„Rot zuerst“ heißt hier **Charakterisierungs-Test**: Der Test hält das heutige Verhalten fest, wird einmal rot gesehen (z. B. mit absichtlich falscher Erwartung) und dann grün. Erst danach wird Code verschoben.

### Reihenfolge

0. Toten Code löschen: `wrist-visual-state.ts`, `computeWristAngle`, `computeWristBendDirection`, `checkDistanceDrift`, `selectStatusColor`.
1. Fehlende Baustein-Tests: `signal/*`, `distance-check`, `classifyLayer`, `session-tracker`, `shoulder-analyzer`, restliche Selektoren.
2. Kalibrier-Ablauf per TDD bauen und im Hook einsetzen.
3. Haltungs-Auswertung, Handgelenk-Pfad, Szenario für Szenario: gerade → blau · großer Knick → gelb · Hand fehlt → grau, Timer steht · Rutsch-Schutz dämpft · Leisten-Timer zählt · Sitzungs-Zähler. Dann einsetzen, `resetAnalysisState` löschen.
4. Haltungs-Auswertung: Geige und Schulter.
5. Hook verschlanken, Gerätetest.
6. `wrist-analyzer.ts` vertiefen, doppelte Tests ersetzen.
7. Reine Mathe aus Rendering und Voice nach `core/` (`computeSideRailLayout`, `lerpColor`/`getTensionColor`, `humanizeError`).

## 5. PWA und MediaPipe selbst ausliefern (#159)

Details: `docs/research/pwa-vite-mediapipe-selbst-ausliefern.md`.

- **Keine fremden Domains mehr** (zu #150):
  - WASM beim Build aus `node_modules` nach `mediapipe/wasm/<version>/` kopieren. Damit passen WASM und JS-Paket immer zusammen (heute: WASM 0.10.18, Paket 0.10.35). Beide Ladestellen nutzen eine Konstante.
  - Modelle versioniert unter `public/models/…/float16/1/` mit Apache-2.0-Lizenzhinweis.
  - Schrift Outfit über `@fontsource-variable/outfit`, Google-Fonts-Links raus.
  - Abnahme: Der Netzwerk-Tab zeigt keine Anfrage an eine fremde Domain.
- **PWA**: `vite-plugin-pwa` 2.x, `generateSW`, `registerType: 'prompt'`. Manifest und Icons aus der Anker-SVG.
- **Offline** (zu #54): Precache mit `.wasm`/`.task`, Limit ~12 MiB je Datei, `nosimd`-Dateien nur per Runtime-Cache. Erster Besuch lädt ~25 MB.
- **Update-Hinweis**: Eine neue Version wartet still. Der Hinweis erscheint **nur auf dem Home-Screen**, klein am Rand, nie während einer Session. Die Entscheidung ist ein reiner Selektor (`selectShowUpdateHint`) und damit per TDD testbar.

## 6. Preview, Tunnel und Diagnose-Logs (#160, #161)

Details: `docs/research/cloudflare-tunnel-preview-logs.md`.

- **Tunnel**: Quick Tunnel `cloudflared tunnel --url http://localhost:4173`, ohne Konto und ohne Domain. Die Adresse ist bei jedem Start neu.
- **Vite**: `basic-ssl` nur noch für `dev`. Für `preview`: `preview.host: true`, `preview.allowedHosts: ['.trycloudflare.com']`. HTTPS liefert der Tunnel.
- **Ein Startskript** baut mit `VITE_DIAGNOSE=1`, startet `vite preview` und den Tunnel und gibt den Link aus.
- **Log-Empfänger**: Vite-Plugin mit `configurePreviewServer`, nur im Preview aktiv, `POST /__log` → `logs/device-*.ndjson` (in `.gitignore`). Größenlimit ≤ 64 KiB je Anfrage. **Kein Token, kein Schalter, keine Aufräum-Automatik** (#161 ersetzt hier den Token-Vorschlag aus #160).
- **Diagnose an/aus**: Nur ein Build mit `VITE_DIAGNOSE=1` enthält den Logger. Der Produktions-Build für DigitalOcean enthält ihn nicht.
- **Was ins Log kommt**: Fehler (`onerror`, `unhandledrejection`, `console.error/warn`), Modell-Ladezeit, Bildrate, Gerät einmal je Sitzung, Ablauf-**Wechsel** (Kalibrierung gespeichert, blau/gelb/grau mit Winkel und Seite, Moduswechsel, Abstand ok/nicht ok). Die Wechsel kommen aus dem `FrameResult` und werden im Hook-Adapter geloggt, nicht im Kern.
- **Nie im Log**: Kamerabilder, Video, Punkte je Bild, Personendaten.

## 7. Gerätetest (#164)

- Keine Checkliste, keine Wiederholungs-Runden. Der Test ist **normales Üben** mit dem Preview-Link. Pflicht-Geräte über den Release hinweg: **Handy und Tablet**.
- Die Fakten liefern die Diagnose-Logs. Die Nutzerin sagt nur kurz, was ihr auffiel.
- Gezielt geprüft wird nur Neues, einmal (z. B. bei der ersten PWA: installieren, Offline, Update-Hinweis; auf iOS die Kamera in der installierten App).
- Abnahme: Die Nutzerin sagt „stabil“ oder „da hakt was“. Vor „taggen“ meldet der Agent in einem Satz das Log-Ergebnis.

## 8. Deploy und Rollback auf DigitalOcean (#158, #157)

Details: `docs/research/digitalocean-app-platform-static-site.md`.

- **Static Site** aus `batik-303/ki-haltungsanalyse`, Branch `main`, `build_command: npm run build`, `output_dir: dist`. App-Spec als `.do/app.yaml` im Repo, **`deploy_on_push: false`**.
- **Deploy**: Die Nutzerin startet das Deployment in DigitalOcean, gebaut wird der aktuelle `main`. Ein Tag lässt sich nicht gezielt deployen; der Tag dokumentiert den getesteten Stand.
- **Rollback**: Die Nutzerin wählt eines der 10 letzten erfolgreichen Deployments. Danach ist die App angepinnt, bis der Rollback bestätigt oder zurückgenommen wird.
- **Header**: Eigene Header sind nicht möglich und nicht nötig (MediaPipe braucht kein COOP/COEP). Cache fest: 10 s Browser, 24 h CDN, ein Deploy leert das CDN.
- **Kosten**: 3 Static Sites kostenlos, je 1 GiB Verkehr/Monat.
- **Nach dem ersten Deploy** per `curl -sI` prüfen: `Cache-Control` von `sw.js`/`index.html`, `Content-Type` von `.wasm` und `.task`.
- **Node-Version**: `engines.node` in `package.json` festlegen (DO-Standard 22.x, CI heute 20), CI auf dieselbe Version.

### Offen, im jeweiligen Umsetzungs-Ticket klären

- Domain und DNS (`blueanchormusic.com`/`.de`, DNS bei DO oder extern, www-Weiterleitung).
- Wer die DO-App anlegt (braucht Owner/Maintainer im Org-Repo).
- Umstieg auf `@mediapipe/tasks-vision` 1.x: eigenes Ticket, nicht Teil dieser Spec.

## 9. Reihenfolge der Umsetzungs-Tickets (für `/to-tickets`)

Jedes Ticket = eigener Worktree, eigener PR, Verhalten unverändert (außer PWA/Diagnose).

| # | Ticket | Blockiert durch |
|---|---|---|
| U1 | Toten Code löschen (Schritt 0) | – |
| U2 | Baustein-Tests: `signal/*`, `distance-check`, `classifyLayer`, `session-tracker`, `shoulder-analyzer`, Selektoren (darf in mehrere Tickets zerfallen) | U1 |
| U3 | Preview-Umgebung: basic-ssl nur `dev`, `allowedHosts`, Startskript mit Tunnel | – |
| U4 | Diagnose-Logs, Technik-Teil: Log-Plugin, Client-Logger nur bei `VITE_DIAGNOSE=1` | U3 |
| U5 | Kalibrier-Ablauf `createCalibrationFlow` + ADR + Glossar | U2 |
| U6 | Haltungs-Auswertung, Handgelenk-Pfad, `resetAnalysisState` weg | U5 |
| U7 | Haltungs-Auswertung, Geige und Schulter | U6 |
| U8 | Hook verschlanken + Ablauf-Wechsel ins Diagnose-Log + Gerätetest | U7, U4 |
| U9 | Drittanbieter raus: WASM kopieren, Modelle ins Repo, Fontsource | – |
| U10 | PWA-Grundgerüst + Offline-Precache | U9 |
| U11 | Update-Hinweis auf dem Home-Screen | U10 |
| U12 | DigitalOcean: `.do/app.yaml`, `engines.node`, CI-Node, App anlegen, erster Deploy, `curl`-Prüfung | U10 |
| U13 | `wrist-analyzer.ts` vertiefen, doppelte Tests ersetzen | U8 |
| U14 | Rendering-/Voice-Mathe nach `core/` | U8 |

Danach: Release-Ablauf aus Abschnitt 3 (Preview-Test → „stabil“ → „taggen“ → Deploy), dann werden #122 und die App-Tickets der Karte #71 wieder frei.
