# Research: PWA mit Vite und MediaPipe selbst ausliefern (offline, ohne Google/jsDelivr)

- **Ticket**: #159 (`wayfinder:research`)
- **Branch**: `research/pwa`
- **Bezug**: #54 (echte Offline-Fähigkeit, Cache-Invalidierung bei Modell-Update), #150 (Modelle selbst bereitstellen, DSGVO)
- **Bibliotheken**: `vite@6.4.2`, `@mediapipe/tasks-vision@0.10.35` (installiert über `^0.10.34`), `vite-plugin-pwa@2.0.0` (noch nicht installiert, nur untersucht)
- **Datum**: 2026-11-13
- **Quellenpolitik**: Nur Primärquellen: offizielle Doku (vite-pwa-org.netlify.app, developer.chrome.com/docs/workbox, developers.google.com/edge/mediapipe, MDN, web.dev, webkit.org, docs.digitalocean.com), Quellcode und `.d.ts` aus `node_modules` bzw. aus dem npm-Paket, npm-Registry, HTTP-Header der Modell-Dateien. Unsicheres ist mit **(unsicher)** markiert.

## Forschungsfrage

Wie wird die App mit Vite zu einer installierbaren **PWA** (Progressive Web App: Webseite, die man wie eine App auf den Startbildschirm legen kann und die offline läuft), die **MediaPipe-WASM und die Modelle selbst ausliefert**, also ohne Aufrufe an jsDelivr, Google Storage und Google Fonts? Wie verhält sich ein Update nach dem Deploy, wie setzt man Caching auf DigitalOcean App Platform (Static Site), und wie cached man die großen Dateien (~25 MB) offline?

## Kurzantwort

Mit **`vite-plugin-pwa` 2.0.0** (passt zu Vite 6, braucht Node ≥ 20.19) wird die App zur PWA: Das Plugin erzeugt Manifest und Service Worker (ein Hintergrund-Skript im Browser, das Dateien zwischenspeichert). Für diese App passt **`registerType: 'prompt'`**: Eine neue Version wartet still, bis die Nutzerin sie bestätigt. Den Hinweis zeigen wir **nur auf dem Home-Screen**, nie während einer Session. Im Browser braucht MediaPipe nur **zwei** WASM-Dateien (`vision_wasm_internal.js` 0,3 MB und `vision_wasm_internal.wasm` 11,2 MB). Die beiden Modelle sind 5,8 MB (Pose lite) und 7,8 MB (Hand) groß und laut Model Card **Apache 2.0** lizenziert, dürfen also selbst ausgeliefert werden. Weil die WASM-Datei größer als das Workbox-Standardlimit (2 MiB) ist, muss `maximumFileSizeToCacheInBytes` angehoben werden. Auf DigitalOcean kann man für Static Sites **keine eigenen Cache-Header** setzen (fest: 10 s Browser, 24 h CDN, Deploy leert das CDN). Das ist für die PWA aber unkritisch, weil der Service Worker selbst cached und `sw.js` ohnehin am HTTP-Cache vorbei geprüft wird. Nebenbei: Der Code lädt heute WASM **0.10.18** vom CDN, das JS-Paket ist aber **0.10.35**. Dieser Versions-Schiefstand verschwindet automatisch, wenn die WASM-Dateien beim Build aus `node_modules` kommen.

## Detailbefunde

### 1. `vite-plugin-pwa`: Version, Kompatibilität, Grundkonfiguration

- Aktuelle Version **2.0.0** (npm, veröffentlicht 2026-10-03). Peer-Dependencies: `vite: ^3.1.0 || ^4 || ^5 || ^6 || ^7 || ^8`, `workbox-build ^7.4.1`, `workbox-window ^7.4.1`, `@vite-pwa/assets-generator ^1 || ^2` (Quelle: `npm view vite-plugin-pwa peerDependencies`).
- README von 2.0.0: „From v2.0.0, `vite-plugin-pwa` requires **Node 20.19.0 or above**“; `package.json` → `"engines": { "node": ">=20.19.0" }` (Quelle: npm-Paket `vite-plugin-pwa-2.0.0.tgz`, `README.md` und `package.json`). Unsere CI nutzt `node-version: 20` (`.github/workflows/ci.yml` Z. 26); `actions/setup-node` nimmt dabei die neueste 20.x, das genügt. Release-Notes nennen für 2.0.0 keine API-Brüche außer Node-Version und Assets-Generator v2 (Quelle: <https://github.com/vite-pwa/vite-plugin-pwa/releases>).
- Strategien (Quelle: `dist/index.d.ts` im Paket und <https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors.html>):
  - **`generateSW`** (Standard): Das Plugin erzeugt den Service Worker komplett (Workbox). Konfiguration über `workbox: { ... }`.
  - **`injectManifest`**: Man schreibt den Service Worker selbst, das Plugin fügt nur die Liste der vorab zu speichernden Dateien ein. Nur nötig für Sonderlogik (z. B. Push, eigene Fetch-Regeln).
  - Für uns reicht **`generateSW`**.
- `registerType` (Quelle: `dist/index.d.ts`, JSDoc): `'prompt'` (Standard) = „you will need to show a popup/dialog to the user to confirm the reload“; `'autoUpdate'` = neuer Service Worker aktualisiert die Caches und **lädt alle offenen Tabs automatisch neu**. Ein automatisches Neuladen mitten im Üben würde Kamera und Kalibrierung abbrechen, deshalb **`'prompt'`**.
- React-Anbindung: `virtual:pwa-register/react` exportiert `useRegisterSW(options)` mit `needRefresh: [boolean, setter]`, `offlineReady: [boolean, setter]` und `updateServiceWorker(reloadPage?)` (Quelle: `react.d.ts` im Paket). Optionen (`types/index.d.ts`): `onNeedRefresh`, `onOfflineReady`, `onRegisteredSW(swUrl, registration)` (empfohlen; `onRegistered` ist `@deprecated`), `onRegisterError`, neu seit 1.3.0 `onNeedReload` („to defer reload until the next SPA navigation“).
- TS-Typen: `"vite-plugin-pwa/client"` bzw. `"vite-plugin-pwa/react"` in `compilerOptions.types` oder `/// <reference types="vite-plugin-pwa/react" />` in einer `.d.ts` (Quelle: <https://vite-pwa-org.netlify.app/frameworks/react.html>).
- `injectRegister` (Standard `'auto'`): Wird `virtual:pwa-register/*` importiert, fügt das Plugin kein eigenes Registrier-Skript ein (Quelle: `dist/index.d.ts`).

### 2. Manifest und Installierbarkeit

- Chrome-Installierbarkeit (Quelle: <https://web.dev/articles/install-criteria>): HTTPS, `name` oder `short_name`, Icons **192 px und 512 px**, `start_url`, `display` ∈ `fullscreen | standalone | minimal-ui | window-controls-overlay`, `prefer_related_applications` fehlt oder `false`. Ob Chrome noch einen Fetch-Handler im Service Worker verlangt, sagt die Seite nicht **(unsicher, irrelevant: Workbox hat ohnehin einen)**.
- vite-pwa-Mindestanforderungen (Quelle: <https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html>): `name`, `short_name`, `description`, Icons 192/512, dazu „better to add 2 icons with `any` and `maskable` purposes“ (maskable = Icon mit Sicherheitsrand, das Android rund/eckig zuschneiden darf); `theme_color` im Manifest **muss** mit `<meta name="theme-color">` in `index.html` übereinstimmen; im `<head>`: viewport, title, description, favicon, `apple-touch-icon`, `mask-icon`, `theme-color`.
- Vorschlag für unsere Werte: `name: 'Blue Anchor Music'`, `short_name` kurz, `start_url: '/'`, `display: 'standalone'`, `orientation` **nicht** festlegen (Handy hoch, Tablet/Laptop quer werden genutzt), `theme_color`/`background_color` aus dem `sapphire`-Token.
- Icons: `@vite-pwa/assets-generator` (aktuell **2.0.0**, npm) erzeugt aus einer SVG (z. B. `public/anchor-mark.svg`) mit Preset **`minimal-2023`**: `favicon.ico` (48), `favicon.svg`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` (weißer Hintergrund) und `apple-touch-icon-180x180.png` (Quelle: <https://vite-pwa-org.netlify.app/assets-generator/>). CLI-Aufruf und die Plugin-Option `pwaAssets` sind auf der Übersichtsseite nicht beschrieben → Unterseiten lesen **(unsicher, im Bau-Ticket nachschlagen)**.

### 3. iOS/Safari-Besonderheiten

- **apple-touch-icon** (180×180) wird von iOS statt der Manifest-Icons benutzt (vite-pwa-Mindestanforderungen, s. o.).
- **Kamera in der Startbildschirm-App** (`display: standalone`): Lange kaputt (WebKit Bug 185448, Bug 180551); laut WebKit-Entwickler Youenn Fablet (Jan. 2021) ist `getUserMedia` „now supported everywhere for http/https with SecureContext“. Danach gab es weitere gemeldete Fehler im Standalone-Modus: Stream stoppt bei Routenwechsel (Bug 212040), Kamera-Recht wird bei Hash-Wechsel entzogen (Bug 215884), nach Neustart vom Home-Screen kein Zugriff (Bug 252465), iOS 17.4.1 auf manchen Geräten kein Stream (Bug 273938). Quellen: <https://bugs.webkit.org/show_bug.cgi?id=185448>, <https://bugs.webkit.org/show_bug.cgi?id=180551>, <https://bugs.webkit.org/show_bug.cgi?id=212040>, <https://bugs.webkit.org/show_bug.cgi?id=215884>, <https://lists.webkit.org/pipermail/webkit-unassigned/2024-May/1164571.html>. **(unsicher)**: Aktueller Stand für iOS 26 ist nicht offiziell dokumentiert → **auf echtem iPhone/iPad testen**. Unsere App wechselt Screens über den Store, nicht über URL/Hash (`App.tsx`), das umgeht die Bugs 212040/215884 wahrscheinlich.
- **Speicher-Löschung**: Safari löscht „all of a website's script-writable storage“ inklusive „Service Worker registrations and cache“ nach 7 Tagen Safari-Nutzung ohne Besuch der Seite. Startbildschirm-Apps haben einen eigenen Zähler; „We do not expect the first-party in such a web application to have its website data deleted“ (Quelle: <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>). Ab Safari 17: Quota pro Origin bis 60 % der Festplatte (Browser-App) bzw. 15 % (andere Apps); `navigator.storage.persist()` wird unterstützt, WebKit gewährt es „based on heuristics like whether the website is opened as a Home Screen Web App“ (Quelle: <https://webkit.org/blog/14403/updates-to-storage-policy/>). Folge: **Im Safari-Tab** kann der ~25-MB-Offline-Cache nach Nicht-Nutzung verschwinden; **installiert** ist er praktisch sicher.

### 4. Update-Verhalten nach einem Deploy

- Erkennung: Beim Build bekommt jede vorab gespeicherte Datei eine Revision („just a `MD5` hash of the asset content“). Ändert sich eine Datei, ändert sich `sw.js`, der Browser findet beim nächsten Update-Check einen neuen Service Worker und installiert ihn im Hintergrund (Quelle: <https://vite-pwa-org.netlify.app/guide/prompt-for-update.html>). Mit `'prompt'` **wartet** er danach („waiting“), bis `updateServiceWorker()` aufgerufen wird oder alle Tabs zu sind. Alte Caches räumt `cleanupOutdatedCaches` auf (bei `generateSW` im Plugin standardmäßig an, ebd.; in Workbox selbst Standard `false`: <https://developer.chrome.com/docs/workbox/modules/workbox-build>).
- Wann prüft der Browser? Beim Laden/Navigieren und über `registration.update()`. vite-pwa zeigt ein stündliches Muster mit `onRegisteredSW` + `setInterval(…, 60*60*1000)` und `fetch(swUrl, { cache: 'no-store' })` vor `r.update()` (Quelle: context7 `/vite-pwa/docs`, `guide/periodic-sw-updates.md`).
- `sw.js` selbst: Mit `updateViaCache: 'imports'` wird „the main script … always updated from the network“ (Quelle: <https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register>). Dass `'imports'` der Standard ist, steht dort nicht explizit **(unsicher, laut Service-Worker-Spezifikation aber so)**.
- **Was die Nutzerin sieht**: Mit `'prompt'` zunächst nichts; die laufende Session arbeitet mit der alten Version weiter. Erst wenn wir `needRefresh === true` anzeigen, sieht sie einen Hinweis. Empfehlung: kleiner, ruhiger Hinweis am Rand des **Home-Screens** („Neue Version bereit, jetzt laden“), kein Modal; Klick → `updateServiceWorker()`. Während `appScreen === 'session'` (und `setup`) wird er nicht gezeigt. Option zusätzlich: beim Wechsel zum Home-Screen ohne Klick still aktualisieren (Reload ist dort harmlos) **(Produktentscheidung)**.

### 5. Caching-Header auf DigitalOcean App Platform (Static Site)

- Die App-Spec-Referenz hat für `static_sites` **kein Feld für eigene Response-Header** (nur CORS über `ingress.rules.cors`); Felder: `build_command`, `output_dir`, `index_document`, `error_document`, `catchall_document` (nur eines von beiden), `envs`, … (Quelle: <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>).
- Fest vorgegeben: „App Platform deploys static sites with the Cache-Control header set to cache for 24 hours on CDN edge servers and 10 seconds in web browsers.“ „You cannot turn off edge caching for apps with static sites.“ „If you redeploy the app, any cached content is invalidated across the web and CDN servers.“ (Quelle: <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>). Wer eigene Header braucht, muss die Seite als **Service-Komponente** ausliefern (ebd.).
- vite-pwa rät: keine lange Cache-Dauer, „especially `immutable`“, für `/`, `/sw.js`, `/index.html`, `/manifest.webmanifest` (Quelle: <https://vite-pwa-org.netlify.app/deployment/>). Bei DO sind das ohnehin nur 10 s im Browser, und der Deploy leert das CDN → **passt ohne Zusatzaufwand**.
- Nachteil: Gehashte Assets bekommen auch nur 10 s statt `immutable`. Mit Service Worker ist das egal (Dateien kommen aus dem SW-Cache). Ohne SW (erster Besuch) lädt der Browser nach 10 s ggf. neu; bei 25 MB spürbar, aber nur bis der SW aktiv ist.
- Für SPA-Routing: `catchall_document: index.html` setzen (wir nutzen zwar keine URL-Routen, aber es schadet nicht) **(Annahme)**.

### 6. Precache-Größenlimit

- Workbox: `maximumFileSizeToCacheInBytes`, Standard **2097152** (2 MiB) (Quelle: <https://developer.chrome.com/docs/workbox/modules/workbox-build>). vite-pwa: Seit 0.20.2 **bricht der Build ab**, wenn Dateien das Limit überschreiten (Quelle: context7 `/vite-pwa/docs`, `guide/faq.md`). Unsere größte Datei ist `vision_wasm_internal.wasm` mit 11 153 617 Byte → Limit z. B. auf **12 MiB** setzen, oder die großen Dateien gezielt aus dem Precache nehmen (s. Befund 9).
- Standard-`globPatterns` ist nur `**/*.{js,css,html}` (Quelle: <https://vite-pwa-org.netlify.app/guide/static-assets.html>); `.wasm`, `.task`, Fonts, Icons müssen explizit ergänzt werden.

### 7. Welche MediaPipe-WASM-Dateien braucht der Browser?

Inhalt von `node_modules/@mediapipe/tasks-vision/wasm/` (Version 0.10.35, gemessen mit `ls -la`):

| Datei | Größe |
|---|---|
| `vision_wasm_internal.js` | 322 044 B (0,3 MB) |
| `vision_wasm_internal.wasm` | 11 153 617 B (11,2 MB) |
| `vision_wasm_nosimd_internal.js` | 321 847 B |
| `vision_wasm_nosimd_internal.wasm` | 10 481 398 B |
| `vision_wasm_module_internal.js` | 322 082 B |
| `vision_wasm_module_internal.wasm` | 11 153 641 B |

- Auswahl-Logik im Bundle (`vision_bundle.mjs`, minifiziert): Dateiname = `${basePath}/vision_wasm${useModule ? '_module' : ''}${simd ? '' : '_nosimd'}_internal.{js,wasm}`; SIMD wird geprüft, indem ein kleines Test-Modul mit `WebAssembly.instantiate` übersetzt wird. Bei `useModule` gilt SIMD immer als vorhanden (auch `vision.d.ts` Z. 716–717: „for ES6 Modules, SIMD is assumed to be always supported“).
- Wir rufen `forVisionTasks(basePath)` **ohne** `useModule` auf → geladen werden **`vision_wasm_internal.js` + `.wasm`**; die `nosimd`-Variante nur auf Browsern ohne WASM-SIMD (sehr alte Geräte). Die `module`-Variante nie.
- Wie geladen wird (`vision_bundle.mjs`): Der Loader `.js` wird im Fenster per `<script src crossOrigin="anonymous">` eingefügt (im Worker per `importScripts`). Die `.wasm` holt der Emscripten-Loader per `fetch(binaryFile, { credentials: 'same-origin' })` und `WebAssembly.instantiateStreaming`; bei falschem MIME-Typ fällt er auf ArrayBuffer zurück (`wasm/vision_wasm_internal.js` Z. 336–349). Modelle lädt MediaPipe per `fetch(modelAssetPath)` → `arrayBuffer()` (`vision_bundle.mjs`). **Alle drei Wege laufen über den Service Worker** und lassen sich also cachen.
- `FilesetResolver.forVisionTasks(basePath)`: Der Pfad darf relativ/same-origin sein, z. B. `'/mediapipe/wasm'`. JSDoc (`vision.d.ts` Z. 700–708): „The returned filesets require that the Wasm files are published **without renaming**. If this is not possible, you can invoke the MediaPipe Tasks APIs using a manually created `WasmFileset`.“ `WasmFileset` = `{ wasmLoaderPath, wasmBinaryPath, assetLoaderPath?, assetBinaryPath? }` (`vision.d.ts` Z. 2734–2743). Dazu passt `FilesetResolver.isSimdSupported()`.
- Die offizielle Web-Anleitung zeigt nur das CDN (`@latest`) und sagt nichts zum Selbst-Hosten (Quelle: <https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js>).

### 8. Wege, die WASM-Dateien mitzuliefern

Das Paket exportiert die WASM-Dateien einzeln in seiner `exports`-Map (z. B. `"./vision_wasm_internal.wasm": "./wasm/vision_wasm_internal.wasm"`, Quelle: `node_modules/@mediapipe/tasks-vision/package.json`). `package.json` selbst ist **nicht** exportiert.

- **(a) Beim Build kopieren** nach `dist/mediapipe/wasm/<version>/` mit `vite-plugin-static-copy` (aktuell 4.1.1, Peer `vite ^6 || ^7 || ^8`, MIT; npm) oder einem kleinen eigenen Vite-Plugin. Die Version liest `vite.config.ts` per `fs` aus `node_modules/@mediapipe/tasks-vision/package.json` und reicht sie über `define` (z. B. `__MEDIAPIPE_VERSION__`) an den Code. Vorteile: Dateinamen unverändert → `forVisionTasks` funktioniert wie heute; Version im Pfad = automatische Cache-Invalidierung; JS-Bundle und WASM stammen immer aus demselben Paket. Nur die `simd`- und ggf. `nosimd`-Dateien kopieren, `module` weglassen.
- **(b) Vite-Asset-Import** über die `exports`-Map: `import wasmUrl from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'` (analog Loader-`.js`) und ein selbst gebautes `WasmFileset`. Vite hängt einen Hash an den Dateinamen → perfekt versioniert, keine Zusatz-Abhängigkeit. Nachteil: SIMD-Auswahl selbst bauen; ob Vite eine `.js` aus `node_modules` mit `?url` unverändert ausgibt, **nicht geprüft (unsicher)**.
- **Nicht empfohlen**: Dateien ins Repo unter `public/` einchecken (22 MB je Update, Versions-Schiefstand wie heute möglich).

### 9. Modelle (`.task`) selbst ausliefern

Gemessen per `curl -sI` (2026-11-13):

| Modell | URL (Version 1) | Größe | Last-Modified |
|---|---|---|---|
| Pose lite float16 | `storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` | 5 777 746 B (5,8 MB) | 27.04.2023 |
| Hand float16 | `storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` | 7 819 105 B (7,8 MB) | 26.04.2023 |

- `…/float16/latest/…` liefert für Pose dieselbe Datei (gleiches ETag `04a75ddf…`). Die Modelle haben sich seit 2023 nicht geändert. Google liefert sie mit `cache-control: public, max-age=3600`.
- **Lizenz**: Beide Model Cards sagen „LICENSED UNDER Apache License, Version 2.0“ (Quellen: <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf>, <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf>; Text mit PDFKit extrahiert). Weitergabe ist erlaubt; Apache 2.0 verlangt Lizenztext + Hinweis bei Weitergabe (→ `LICENSE`/`NOTICE` neben die Dateien oder auf eine Lizenz-Seite). Das npm-Paket `@mediapipe/tasks-vision` ist ebenfalls Apache-2.0.
- **Ins Repo oder beim Build laden?**
  - *Ins Repo* (`public/models/pose_landmarker_lite/float16/1/…`, `public/models/hand_landmarker/float16/1/…`): 13,6 MB einmalig, Änderung selten, Build ohne Netzzugriff zu Google, reproduzierbar, CI testet genau das, was ausgeliefert wird. Version steckt im Pfad → Invalidierung beim Wechsel automatisch.
  - *Beim Build laden* (Skript mit `curl` + SHA-256-Prüfung): Repo bleibt klein, aber Build hängt von Google ab. DSGVO ist dabei kein Thema (der Build-Server lädt, nicht die Nutzerin).
  - Git LFS: Ob DO App Platform LFS-Dateien beim Build auscheckt, ist **nicht geprüft (unsicher)** → vermeiden.
  - Empfehlung: **ins Repo, versioniert im Pfad**.

### 10. Offline-Caching der großen Dateien: Precache oder Runtime-Cache?

- **Precache** (Dateiliste im `sw.js`, wird bei der Installation komplett geladen): Offline garantiert, sobald der SW installiert ist; Invalidierung automatisch über MD5-Revision je Datei; nur geänderte Dateien werden neu geladen; alte Versionen räumt `cleanupOutdatedCaches` weg. Nachteil: Jede Erst-Besucherin lädt sofort ~25 MB (App + 11,2 MB WASM + 13,6 MB Modelle), auch wenn sie den Hand-Modus nie öffnet. Da Wrist-Modus der Launch-Modus ist und die App ohne MediaPipe nichts tut, ist das hier vertretbar.
- **Runtime-Cache** (`runtimeCaching` mit `handler: 'CacheFirst'`, eigener `cacheName` z. B. `mediapipe-0.10.35`, `expiration`, `cacheableResponse`; Quelle: <https://developer.chrome.com/docs/workbox/modules/workbox-build>, Beispiel context7 `/vite-pwa/docs` `workbox/generate-sw.md`): Dateien werden erst beim ersten echten Gebrauch gespeichert. Mit Version im Pfad ist die Invalidierung sauber, alte Cache-Namen muss man aber selbst löschen (`expiration.maxEntries` hilft nur innerhalb eines Caches).
- **Wichtige Falle beim Runtime-Cache**: Beim allerersten Besuch steuert der neue SW die Seite noch nicht (ohne `clientsClaim`), also werden die MediaPipe-Abrufe des ersten Besuchs **nicht** gecached. Offline klappt erst nach einem zweiten Online-Start in jedem Modus. Für #54 („Flugmodus“) ist das zu unzuverlässig.
- **Erst-Aufruf beim Precache**: Die Seite lädt MediaPipe selbst, parallel installiert der SW und lädt die Precache-Liste. Weil DO Browsern nur 10 s Cache erlaubt, können die großen Dateien beim ersten Besuch **doppelt** übers Netz gehen **(unsicher, im Netzwerk-Tab messen)**. Akzeptabel einmalig; alternativ MediaPipe erst nach `offlineReady` laden (verzögert den ersten Start, nicht empfohlen).
- MIME-Typ: `instantiateStreaming` braucht `Content-Type: application/wasm`, sonst Rückfall auf ArrayBuffer (langsamer, funktioniert). Was DO für `.wasm` und `.task` sendet, ist **nicht geprüft (unsicher)** → nach erstem Deploy mit `curl -sI` prüfen.
- Range-Requests (`rangeRequests`) sind unnötig: MediaPipe lädt die Dateien komplett.

### 11. Google Fonts (Outfit)

- `index.html` Z. 7–9 lädt `fonts.googleapis.com`/`fonts.gstatic.com` → Google sieht die IP-Adresse (dieselbe DSGVO-Frage wie #150) und offline fehlt die Schrift. Lösung: `@fontsource-variable/outfit` (5.3.0, OFL-1.1; npm) installieren und wie `geist`/`manrope` per Import einbinden; die `<link>`-Zeilen entfernen. Die Font-Dateien landen dann gehasht im Build und im Precache (`globPatterns` um `woff2` ergänzen).

## Empfehlung für die Spec

Input für `docs/spec/stabilisierung.md` (Reihenfolge = sinnvolle Ticket-Schnitte):

1. **Drittanbieter raus (DSGVO, #150)**
   - WASM beim Build aus `node_modules` nach `mediapipe/wasm/<version>/` kopieren (Weg 8a), nur `vision_wasm_internal.*` und `vision_wasm_nosimd_internal.*`. Version per `define` in den Code; `forVisionTasks(`/mediapipe/wasm/${__MEDIAPIPE_VERSION__}`)`. Beide Stellen in `use-pose-detection.ts` auf **eine** Konstante/Funktion umstellen (behebt Schiefstand 0.10.18 ↔ 0.10.35).
   - Modelle versioniert ins Repo: `public/models/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, `public/models/hand_landmarker/float16/1/hand_landmarker.task`, plus Apache-2.0-Lizenzhinweis. Pfade als Konstanten in `src/core/config/` (TDD: reine Funktion, die Basis-Pfad + Version zusammensetzt, ist testbar).
   - Outfit über `@fontsource-variable/outfit`, Google-Fonts-Links aus `index.html` entfernen.
   - Abnahme: Netzwerk-Tab zeigt keine Anfragen an fremde Domains.
2. **PWA-Grundgerüst**
   - `vite-plugin-pwa@^2.0.0` als devDependency, `strategies: 'generateSW'`, `registerType: 'prompt'`, `injectRegister: false` (Registrierung über `useRegisterSW`).
   - Manifest: `name`, `short_name`, `description`, `start_url: '/'`, `display: 'standalone'`, `theme_color` = `<meta name="theme-color">`, `background_color`; Icons per `@vite-pwa/assets-generator` (`minimal-2023`) aus der Anker-SVG: 64/192/512, maskable 512, apple-touch 180, favicon.
   - `tsconfig.app.json`: `"vite-plugin-pwa/react"` in `types`.
3. **Offline (#54)**
   - `workbox.globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm,task}']`, `maximumFileSizeToCacheInBytes: 12 * 1024 * 1024`, `cleanupOutdatedCaches: true` (Standard). `nosimd`-Dateien per `globIgnores` aus dem Precache nehmen und nur per Runtime-CacheFirst cachen (spart 10,5 MB für fast alle).
   - Nach erfolgreicher Installation `navigator.storage.persist()` anfragen (iOS gewährt es v. a. für Startbildschirm-Apps).
   - Abnahme: App einmal online öffnen, Flugmodus an, App neu starten → Pose- und Wrist-Modus laufen.
4. **Update-Hinweis**
   - Hook (z. B. `useAppUpdate`) um `useRegisterSW`: `needRefresh` in den Store spiegeln; stündlicher Update-Check nach vite-pwa-Muster (`onRegisteredSW`).
   - Anzeige nur auf `home` (kleiner Randhinweis, positive Sprache, kein Modal); nie in `setup`/`session`. Klick → `updateServiceWorker()`.
   - Entscheidungslogik „Hinweis zeigen?“ als reiner Selektor (`selectShowUpdateHint(appScreen, needRefresh)`) → TDD-fähig.
5. **Deploy auf DO**
   - Static Site, `build_command: npm run build`, `output_dir: dist`. Keine eigenen Header nötig (und nicht möglich). Nach Deploy per `curl -sI` prüfen: `Cache-Control` von `sw.js`/`index.html` (erwartet kurz), `Content-Type` von `.wasm` (`application/wasm`?) und `.task`.
6. **Gerätetest** auf iPhone/iPad als Startbildschirm-App: Kamera-Freigabe, Neustart der App, Offline-Start.

## Offene Punkte

- **iOS-Kamera in Standalone-PWA**: aktueller Stand für iOS 26 nicht offiziell belegt → Gerätetest Pflicht. Ob die Kamera-Freigabe in der installierten App bei jedem Start neu abgefragt wird, ist offen.
- **DO-Header real**: 10 s/24 h stammen aus der Doku; tatsächliche Header und MIME-Typ für `.wasm`/`.task` nach dem ersten Deploy messen.
- **Doppel-Download beim ersten Besuch** (Seite + Precache) messen; falls störend, Ladereihenfolge überdenken.
- **Weg 8b** (`?url`-Import mit gehashten Namen) ist eleganter, aber nicht ausprobiert; ggf. kurzer Prototyp.
- **MediaPipe 1.x**: npm-`latest` ist `@mediapipe/tasks-vision@1.2.3` (11.11.2026); `^0.10.34` bleibt auf 0.10.x. Ein Wechsel ist ein eigenes Ticket (Änderungen nicht untersucht). Dank Version im Pfad wäre die Cache-Invalidierung dann automatisch.
- **Precache vs. Datenvolumen**: ~25 MB beim ersten Besuch auf Mobilfunk. Produktentscheidung, ob die Landingpage darauf hinweist.
- **Assets-Generator v2**: CLI-Optionen und `pwaAssets`-Integration im Bau-Ticket auf den Unterseiten nachlesen.
- **Chrome-Fetch-Handler-Pflicht**: nicht geprüft, für uns egal (Workbox hat einen).

## Quellen

- vite-plugin-pwa: <https://vite-pwa-org.netlify.app/guide/>, <https://vite-pwa-org.netlify.app/guide/prompt-for-update.html>, <https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors.html>, <https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html>, <https://vite-pwa-org.netlify.app/guide/static-assets.html>, <https://vite-pwa-org.netlify.app/deployment/>, <https://vite-pwa-org.netlify.app/frameworks/react.html>, <https://vite-pwa-org.netlify.app/assets-generator/>, <https://github.com/vite-pwa/vite-plugin-pwa/releases>
- vite-plugin-pwa 2.0.0 Paketinhalt (`npm pack`): `README.md`, `package.json`, `react.d.ts`, `types/index.d.ts`, `dist/index.d.ts`
- context7 `/vite-pwa/docs`: `guide/faq.md` (maximumFileSizeToCacheInBytes), `guide/periodic-sw-updates.md`, `workbox/generate-sw.md`
- Workbox: <https://developer.chrome.com/docs/workbox/modules/workbox-build>
- web.dev: <https://web.dev/articles/install-criteria>
- MDN: <https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register>
- WebKit: <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>, <https://webkit.org/blog/14403/updates-to-storage-policy/>, Bugs 185448, 180551, 212040, 215884, 273938 (Links in Befund 3)
- DigitalOcean: <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>, <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>
- MediaPipe: <https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker>, <https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js>, <https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker>, Model Cards (Links in Befund 9)
- Lokal: `node_modules/@mediapipe/tasks-vision/{package.json,vision.d.ts,vision_bundle.mjs,wasm/vision_wasm_internal.js}`, `src/hooks/use-pose-detection.ts` (Z. 129–134, 188–193), `index.html` (Z. 7–9), `.github/workflows/ci.yml` (Z. 26)
- npm-Registry: `vite-plugin-pwa`, `@vite-pwa/assets-generator`, `@mediapipe/tasks-vision`, `vite-plugin-static-copy`, `@fontsource-variable/outfit`
- HTTP-Header: `curl -sI` auf die Modell-URLs (2026-11-13)
