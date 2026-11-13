# Research: DigitalOcean App Platform – statische Seite aus main

- **Ticket**: #158 (`wayfinder:research`)
- **Karte**: #154
- **Branch**: `research/digitalocean`
- **Datum der Abfrage**: 2026-11-13
- **Quellenpolitik**: Nur Primärquellen: docs.digitalocean.com (App Platform, App-Spec-Referenz, API/pydo, doctl), digitalocean.com/pricing, GitHub-Repo `digitalocean/app_action`, offizielle MediaPipe-Doku (developers.google.com) und der MediaPipe-Quellcode aus dem npm-Paket `@mediapipe/tasks-vision`. Alles, was dort nicht steht, ist als **„nicht in Primärquellen gefunden“** markiert.

## Forschungsfrage

Wie bringen wir unsere Vite-App (React 18 + TypeScript, Build `tsc -b && vite build`, Ausgabe `dist/`) als **Static Site Component** auf die DigitalOcean App Platform, so dass der Stand von `main` (Org-Repo `batik-303/ki-haltungsanalyse`) ausgeliefert wird, mit eigener Domain (blueanchormusic.com / .de), HTTPS, sinnvollen Headern und einer Rückfall-Möglichkeit (Rollback)?

## Kurzantwort

1. **Automatisch oder von Hand, beides geht.** Im App-Spec steht unter `github` das Feld `deploy_on_push`. Ist es `true`, baut DigitalOcean bei jedem Push auf `main` neu. Ist es `false`, deployt man von Hand (Knopf im Control Panel, `doctl apps create-deployment`) oder per GitHub Action `digitalocean/app_action/deploy@v2`.
2. **Ein bestimmter Tag oder Commit lässt sich nicht direkt auswählen.** Die Git-Quelle kennt nur `repo`, `branch`, `deploy_on_push`. Ein Deploy nimmt immer den neuesten Stand des Branches. Dafür gibt es **Rollback** auf eine der **zehn letzten erfolgreichen Deployments**; danach ist die App „angepinnt“ und nimmt keine neuen Deploys an, bis man den Rollback bestätigt (commit) oder zurücknimmt (revert).
3. **Build ist einfach.** Der Node-Buildpack führt selbst `npm ci` und das `build`-Script aus; `output_dir: dist` (wird sonst auch automatisch gefunden). Node-Version über `engines.node` in `package.json`, Standard ist Node 22.x.
4. **Eigene Domain mit HTTPS:** Zertifikate kommen von Let’s Encrypt bzw. Google Trust. DNS entweder komplett bei DigitalOcean (Nameserver umstellen) oder beim bisherigen Anbieter per CNAME; für die Hauptdomain ohne `www` (Apex) gibt es A-Records. Eine `www`→Apex-Weiterleitung geht über Redirect-Regeln (Control Panel „HTTP redirect rules“ bzw. `ingress.rules[].redirect`).
5. **Eigene HTTP-Header für statische Seiten gibt es nicht.** Im App-Spec hat `static_sites` kein Header-Feld. Standard: `Cache-Control` 24 h am CDN-Rand, 10 s im Browser; jeder Redeploy leert den Cache. HSTS setzt App Platform nicht.
6. **MediaPipe braucht keine Spezial-Header.** Weder die offizielle Web-Anleitung noch der Loader-Code (`vision_wasm_internal.js`, Versionen 0.10.18 und 0.10.35) verwenden `SharedArrayBuffer`; es ist ein Build ohne Threads. Also **kein COOP/COEP nötig**. Die `.wasm` kommt von jsDelivr mit `content-type: application/wasm`, nicht von DigitalOcean.
7. **SPA-Fallback ist aktuell unnötig.** Die App hat kein Client-Routing (Screens kommen aus dem Zustand-Store). `catchall_document: index.html` wäre trotzdem eine harmlose Absicherung.
8. **Kosten:** Bis zu **3 reine Static-Site-Apps kostenlos**, je App **1 GiB** ausgehender Datenverkehr pro Monat inklusive, darüber **0,02 $/GiB**; jede weitere Static-Site-App **3 $/Monat**. Build-Minuten werden auf der Preisseite nicht genannt; ein Build bricht nach 1 Stunde ab.

## Detailbefunde

### 1. Manuell vs. automatisch, GitHub-Anbindung

- App-Spec, Feld `static_sites[].github`: „`repo` (format `owner/repo`), `branch`, and `deploy_on_push` (Boolean …)“. Nur eine der Quellen `bitbucket`, `git`, `github`, `gitlab` darf gesetzt sein.
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- Im Control Panel entspricht das der Checkbox **Autodeploy**: „Clear the Autodeploy checkbox if you want to stop automatic redeploys when the repository changes.“
  > <https://docs.digitalocean.com/products/app-platform/how-to/create-apps/>
- **Rechte im GitHub-Repo**: „You must have an Owner or Maintainer permissions-role in any GitHub repository that you want to access from App Platform.“ Für uns heißt das: Wer die App anlegt, braucht im Org-Repo `batik-303/ki-haltungsanalyse` die Rolle Owner oder Maintainer (ein Fork reicht dafür nicht, die App muss auf das Org-Repo zeigen, da nur dort `main` per PR aktualisiert wird).
  > <https://docs.digitalocean.com/products/app-platform/how-to/create-apps/>
- Fork-Workflow: Speziell zu Forks: **nicht in Primärquellen gefunden** (die Seite zur Quell-Repo-Verwaltung behandelt Forks nicht).
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-source-repo/>
- **Manueller Deploy**: Control Panel, Activity-Seite, Menü **Actions**; der Deploy „pulls the latest code from the apps’s associated source repo …“.
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/>
- **GitHub Action**: `digitalocean/app_action/deploy@v2` liest standardmäßig `.do/app.yaml` (`app_spec_location`), braucht `token` (DigitalOcean-API-Token mit Lese-/Schreibrecht auf App Platform), optional `project_id`, `app_name`, `print_build_logs`, `print_deploy_logs`, `deploy_pr_preview`. Das Beispiel im Repo deployt bei `push` auf `main`. Variablen im Spec (`${NAME}`) werden aus der Action-Umgebung ersetzt. v1 wird nicht mehr weiterentwickelt.
  > <https://github.com/digitalocean/app_action>
  > <https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github-actions/>
- Wichtig: Laut DO-Doku muss das GitHub-Konto vorher einmal über Control Panel oder API mit App Platform verbunden werden, bevor die Action Git-basiert deployen kann.
  > <https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github-actions/>
- Ob man `deploy_on_push` abschalten soll, wenn die Action deployt: **nicht ausdrücklich in Primärquellen gefunden**. Logisch naheliegend, um Doppel-Deploys zu vermeiden; das Action-Beispiel nutzt `deploy_on_push` nicht.

### 2. Bestimmter Tag/Commit, Rollback, `doctl`, App-Spec, Action

- **Tag/Commit auswählen**: Die Git-Quelle hat nur `repo`, `branch`, `deploy_on_push`; ein Feld für Tag oder Commit-Hash gibt es nicht. `doctl apps create-deployment` hat ebenfalls kein Commit-Flag (Flags: `--force-rebuild`, `--wait`, `--wait-timeout`, `--format`, `--no-header`). Ergebnis: **nicht möglich laut Primärquellen**, Deploy nimmt immer den neuesten Stand des eingestellten Branches.
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
  > <https://docs.digitalocean.com/reference/doctl/reference/apps/create-deployment/>
  > <https://docs.digitalocean.com/reference/api/reference/apps/>
  - Mögliche Umwege (eigene Ableitung, nicht aus der Doku): eigener Release-Branch (z. B. `release`), der gezielt auf einen Tag gesetzt wird; oder die GitHub Action mit `actions/checkout` auf einen Tag. Achtung: Die Action deployt bei Git-Quellen trotzdem den Branch aus dem Spec, nicht den ausgecheckten Stand (die App Platform baut selbst aus GitHub). Nur bei Image-Quellen (Docker) lässt sich exakt ein Stand (`digest`) festnageln.
  > <https://github.com/digitalocean/app_action>
- **Rollback**:
  - „You can roll back to any of the ten most recent successful deployments.“ Bedingung: gleiche Region, gleiche Datenbank-Ressourcen und -Konfiguration (für uns ohne Datenbank irrelevant). Rollback stellt Code, Konfiguration und App-Spec wieder her.
    > <https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/>
  - Im Rollback-Fenster kann man **Automatically Deploy Code Changes** abwählen, um Auto-Deploys bis zur Klärung zu stoppen.
    > <https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/>
  - API: „The app will be pinned to the rollback deployment preventing any new deployments from being created“, das gilt auch für Auto-Deploy per Push. „To resume deployments, the rollback must be either committed or reverted.“ Mit `skip_pin: true` wird der Rollback sofort bestätigt und die App bleibt nicht angepinnt.
    > <https://docs.digitalocean.com/reference/pydo/reference/apps/create_rollback/>
  - Eine **Zeitgrenze** (wie lange zurück) wird nicht genannt, nur die Anzahl (10). Zeitliche Begrenzung: **nicht in Primärquellen gefunden**.
- **`doctl apps create-deployment <app-id>`**: Erzeugt ein neues Deployment; mit `--force-rebuild` wird neu gebaut, auch wenn ein alter Build wiederverwendbar wäre; `--wait` wartet auf das Ende.
  > <https://docs.digitalocean.com/reference/doctl/reference/apps/create-deployment/>
- **App-Spec im Repo** (`.do/app.yaml`): Standardpfad der Action (`app_spec_location`).
  > <https://github.com/digitalocean/app_action>

### 3. Build-Einstellungen

- `build_command`: optional. `output_dir`: „Location of built assets, relative to the build context. If unset, App Platform scans for `_static`, `dist`, `public`, and `build`.“ `environment_slug`: z. B. `node-js` oder `html`.
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- Node.js-Buildpack:
  - Version: „You can specify your desired Node.js version in the `engines` section of `package.json`.“ Standard: „`Node.js 22.x` by default“.
  - Installation: „If you use `npm`, it uses `npm ci` …“; Build: „By default, the `build` script in `package.json` is used to build the application.“
  - `dependencies` und `devDependencies` werden installiert (wichtig, da `typescript` und `vite` devDependencies sind); erst nach dem Build werden devDependencies entfernt.
  > <https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/>
- Folgerung für uns: `build_command: npm run build` reicht; `npm ci` macht der Buildpack schon. `npm ci && npm run build` als `build_command` würde die Installation doppelt ausführen (funktioniert, kostet Zeit). Ob `build_command` den automatischen `build`-Aufruf ersetzt: **nicht ausdrücklich in Primärquellen gefunden**.
- Aktueller Repo-Stand: `package.json` hat **kein** `engines`-Feld; CI (`.github/workflows/ci.yml`) nutzt `node-version: 20`; Vite `^6.0.0` verlangt `node ^18 || ^20 || >=22`. Empfehlung: `"engines": { "node": "22.x" }` setzen und CI auf 22 angleichen, damit Build-Umgebung und CI gleich sind.
- Grenzen: „Builds time out after 1 hour.“ Je Build 8 CPU-Kerne, 15 GiB RAM, 24 GiB Disk.
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- `vite.config.ts` nutzt `@vitejs/plugin-basic-ssl`; das betrifft nur Dev-/Preview-Server, nicht `vite build` (Projektbefund, kein Problem für den Deploy).

### 4. HTTPS und eigene Domain

- Zertifikate: „App Platform supports Let’s Encrypt and Google Trust as Certificate Authorities (CAs).“ Bei CAA-Records müssen **beide** eingetragen sein: `letsencrypt.org` und `pki.goog`, sonst kann die Domain-Einrichtung scheitern. Dass die Ausstellung vollautomatisch läuft, sagt die Seite nicht wörtlich; der Ablauf (Domain hinzufügen, DNS setzen, Status im Dashboard) legt es nahe.
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/>
- DNS bei DigitalOcean: Nameserver `ns1/ns2/ns3.digitalocean.com` beim Registrar eintragen; im Spec dann `zone` setzen („If the domain uses DigitalOcean DNS, set this to the account's domain name so App Platform can manage it“).
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/>
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- DNS extern: CNAME auf den angezeigten `…ondigitalocean.app`-Namen. Für die Apex-Domain (ohne `www`): falls der Anbieter kein CNAME-Flattening kann, „App Platform provides A records you can use instead“ (zwei öffentliche Ingress-IPs, kostenlos).
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/>
- Domains im Spec: `domains[]` mit `domain`, `type` (`PRIMARY` genau einmal, sonst `ALIAS`), `wildcard`, `zone`, `minimum_tls_version` (`"1.2"`/`"1.3"`). Bis zu 500 Domains je App.
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- HTTP→HTTPS: wird automatisch umgeleitet; **HSTS wird nicht gesetzt** („it does not set HTTP Strict-Transport-Security (HSTS) headers for apps“).
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- `www`-Weiterleitung: Control Panel → Networking → **HTTP redirect rules** (Codes 301/302/303/307/308). Im Spec: `ingress.rules[]` mit `match.authority` und `redirect` (`authority`, `scheme`, `redirect_code`, Standard 302). Ein eigenes Beispiel „www → Apex“ gibt es in der Doku **nicht**; ob Redirect-Regeln auch für reine Static-Site-Apps gelten, sagt die Redirect-Seite nicht ausdrücklich. Die Limits-Seite sagt zudem missverständlich „App Platform does not directly support adding `301` and `302` redirects“ (vermutlich veralteter Satz). **Vor dem Livegang testen.**
  > <https://docs.digitalocean.com/products/app-platform/how-to/url-rewrites/>
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- `.de` und `.com` gleichzeitig: beide als Domains derselben App eintragen (eine `PRIMARY`, die andere `ALIAS`) oder `.de` per Redirect auf `.com` leiten. Propagation „can take up to 72 hours“.
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/>

### 5. HTTP-Header (Cache, COOP/COEP, Permissions-Policy, CSP) und MediaPipe

**Was DigitalOcean anbietet**

- `static_sites` hat **kein Feld für eigene Response-Header**. Header-bezogen gibt es nur `cors` (veraltet, jetzt `ingress.rules[].cors`) und `ingress.secure_header` (blockiert Anfragen ohne bestimmten Request-Header, setzt keine Antwort-Header).
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- Statische Seiten werden über das **Spaces CDN** ausgeliefert; Standard-`Cache-Control`: „cache for 24 hours on CDN edge servers and 10 seconds in web browsers.“ „If you redeploy the app, any cached content is invalidated …“. Edge-Cache abschalten geht bei Static Sites **nicht**.
  > <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- Eigene `Cache-Control`-Werte für Static Sites: **nicht in Primärquellen gefunden**. Die Doku zeigt Header nur „in your app's code“ (also für Services).

**Braucht MediaPipe besondere Header?**

- Offizielle Web-Anleitung (Pose Landmarker, Web): lädt WASM per `FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")`; **kein Hinweis** auf `SharedArrayBuffer`, Cross-Origin-Isolation, COOP/COEP oder Server-Header.
  > <https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js>
- Quellcode-Prüfung (npm-Paket `@mediapipe/tasks-vision`):
  - In `wasm/vision_wasm_internal.js` von **0.10.18** (genau die Version, die `src/hooks/use-pose-detection.ts` per CDN lädt) und im lokal installierten **0.10.35** kommt `SharedArrayBuffer` **nicht vor**, ebenso kein `new Worker`. Der Code enthält den Emscripten-Kommentar „without pthreads a context is just an integer ID“, also ein Build **ohne Threads**.
    > <https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_wasm_internal.js>
  - Der Loader nutzt `WebAssembly.instantiateStreaming` und fällt bei Fehlern auf `instantiateArrayBuffer` zurück („falling back to ArrayBuffer instantiation“). `instantiateStreaming` braucht `Content-Type: application/wasm`, den jsDelivr liefert (`content-type: application/wasm`, `access-control-allow-origin: *`, `cross-origin-resource-policy: cross-origin`, per `curl -I` am 2026-11-13 geprüft).
  - Modelle von `storage.googleapis.com`: `content-type: application/octet-stream`, `access-control-allow-origin: *` (per `curl -I` geprüft).
- **Ergebnis: COOP/COEP sind nicht nötig.** Da die WASM- und Modelldateien von fremden Servern kommen, spielt der MIME-Typ, den DigitalOcean für `.wasm` setzt, heute keine Rolle.
- Falls COEP doch einmal nötig würde (z. B. für eine spätere Thread-Variante): Mit `require-corp` müssten alle fremden Ressourcen CORP- oder CORS-fähig sein. jsDelivr sendet `cross-origin-resource-policy: cross-origin`, Google Storage sendet CORS (`*`). MediaPipe lädt beides per `fetch`; das sähe also unkritisch aus. Das ist aber Ableitung, weil DO COOP/COEP für Static Sites sowieso nicht setzen kann.

**Kamera/Mikrofon (Permissions-Policy)**

- Ohne `Permissions-Policy`-Header gilt für `camera`/`microphone` laut Spezifikation der Standard `self`, also für unsere eigene Seite erlaubt. (Quelle: W3C Permissions Policy, außerhalb der vorgegebenen Quellenliste; für DO selbst irrelevant.) `getUserMedia` braucht HTTPS, das liefert App Platform.

**Optionen, falls wir eigene Header brauchen** (z. B. CSP, HSTS, lange Caches für gehashte Dateien)

- (a) **CSP per `<meta http-equiv="Content-Security-Policy">`** in `index.html` (geht ohne Server; `frame-ancestors` und Reporting gehen per Meta nicht; allgemeines Web-Wissen, nicht DO-Doku).
- (b) Statt Static Site eine **Service-Komponente** (z. B. kleiner Webserver/Container), die Header selbst setzt. DO empfiehlt Header „in your app's code“; kostet dann Service-Gebühren statt 0 $.
  > <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>
- (c) Für HSTS: Registrar-/DNS-seitig nicht möglich; nur über (b) oder einen vorgeschalteten Proxy (z. B. Cloudflare). Proxy-Variante **nicht in DO-Primärquellen** behandelt.

### 6. SPA-Fallback

- Felder: `index_document` (Standard `index.html`), `error_document` (Standard `404.html`, sonst liefert App Platform ein eigenes), `catchall_document` („Fallback document for requests to missing files“). **Nur eines** von `catchall_document` oder `error_document`.
  > <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- „For client-side routed apps, you can specify `index.html` as the catch-all document.“
  > <https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/>
- Projektbefund: In `src/` gibt es kein `react-router`, kein `history.push`, kein `location.pathname`. Die Screens (`home | setup | session | results`) kommen aus `usePoseStore((s) => s.appScreen)`. Es gibt also nur `/`. Ein Catch-all ist nicht nötig; mit `catchall_document: index.html` würden Tippfehler-URLs statt 404 die App zeigen. Nachteil: dann liefert auch `/fehlt.js` HTML mit Status 200 (Verhalten bzgl. Statuscode: **nicht in Primärquellen gefunden**). Empfehlung: zunächst weglassen (Standard-404).

### 7. Kosten

- „3 apps with static sites“ kostenlos; „1GiB data transfer allowance per app with static sites“; „Additional apps with staticsites only are charged at $3.00 per month“; „Outbound data transfer exceeding the allowance will be charged at $0.02 per GiB“. Static Sites innerhalb einer bezahlten App kosten 0 $, haben aber kein eigenes Freikontingent.
  > <https://www.digitalocean.com/pricing/app-platform>
  > <https://docs.digitalocean.com/products/app-platform/details/pricing/>
- Apps mit Service-, Worker-, Job- oder Function-Komponente fallen nicht unter das Freikontingent.
  > <https://docs.digitalocean.com/products/app-platform/details/pricing/>
- Build-Minuten: **nicht in Primärquellen gefunden** (keine Abrechnung genannt); nur Build-Timeout 1 h.
  > <https://docs.digitalocean.com/products/app-platform/details/limits/>
- Einordnung: Unser Bundle ist klein; die großen Dateien (WASM, Modelle) kommen von jsDelivr/Google und zählen **nicht** zu unserem DO-Traffic. 1 GiB/Monat reicht daher für viele Besuche (Größenmessung des `dist/` steht noch aus).

### 8. PWA-Relevantes

- Manifest und Service Worker sind normale Dateien in `dist/` und werden mit dem Standard-Header (24 h Edge, 10 s Browser) ausgeliefert. Jeder Redeploy leert den CDN-Cache, also ist ein neues `index.html`/`sw.js` nach dem Deploy sofort am Rand verfügbar.
  > <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>
- Gut für `index.html` und `sw.js`: nur 10 s Browser-Cache, Updates kommen schnell an.
- Weniger gut für gehashte Assets (`assets/*-[hash].js`): Sie könnten eigentlich `max-age=31536000, immutable` haben, bekommen aber auch nur 10 s; der Browser fragt also öfter nach. Abhilfe ohne eigene Header: Ein Service Worker (z. B. per `vite-plugin-pwa`) cached die gehashten Dateien selbst. Eigene Cache-Header je Pfad: **nicht in Primärquellen gefunden**.
- MIME-Typ für `.webmanifest` bzw. `.wasm` auf DO: **nicht in Primärquellen gefunden**. Für `.wasm` aktuell egal (kommt vom CDN); für das Manifest ggf. die Endung `.json` statt `.webmanifest` wählen oder nach dem ersten Deploy per `curl -I` prüfen.
- Aktuell hat das Projekt **kein** Manifest und keinen Service Worker (`public/` enthält nur `anchor-mark.svg`).

## Vorschlag: minimales `.do/app.yaml` (nur Beispiel, nicht angelegt)

```yaml
# Beispiel – noch nicht im Repo. Werte vor dem Einsatz prüfen.
name: blue-anchor-music
region: fra            # Frankfurt; Region-Slug vor dem Anlegen bestätigen
static_sites:
  - name: web
    github:
      repo: batik-303/ki-haltungsanalyse
      branch: main
      deploy_on_push: true      # false, wenn per GitHub Action oder von Hand deployt wird
    environment_slug: node-js
    build_command: npm run build   # npm ci führt der Node-Buildpack selbst aus
    output_dir: dist
    index_document: index.html
    # catchall_document: index.html   # erst nötig, wenn es Client-Routing gibt
domains:
  - domain: blueanchormusic.com
    type: PRIMARY
    zone: blueanchormusic.com       # nur, wenn DNS bei DigitalOcean liegt
    minimum_tls_version: "1.2"
  - domain: www.blueanchormusic.com
    type: ALIAS
    zone: blueanchormusic.com
  - domain: blueanchormusic.de
    type: ALIAS
    zone: blueanchormusic.de
ingress:
  rules:
    - match:
        authority:
          exact: www.blueanchormusic.com
        path:
          prefix: /
      redirect:
        authority: blueanchormusic.com
        redirect_code: 301
    - match:
        authority:
          exact: blueanchormusic.de
        path:
          prefix: /
      redirect:
        authority: blueanchormusic.com
        redirect_code: 301
    - match:
        path:
          prefix: /
      component:
        name: web
```

Dazu in `package.json`: `"engines": { "node": "22.x" }`.

Hinweis: Felder und Struktur stammen aus der App-Spec-Referenz; dass die Redirect-Regeln mit `match.authority` in einer reinen Static-Site-App so greifen, ist **nicht ausdrücklich belegt** und muss beim ersten Deploy geprüft werden. Region-Slug `fra`: **nicht in den gelesenen Quellen bestätigt**.

## Offene Punkte / Risiken für die Spec (`docs/spec/stabilisierung.md`)

1. **Kein Deploy nach Tag/Commit.** Wenn „Release = Tag“ gewünscht ist, braucht es einen Release-Branch oder einen Docker-/Image-Weg. Für V1 reicht vermutlich: `main` = live, Rollback (10 letzte Deploys) als Notbremse. Nach einem Rollback ist die App angepinnt; das Team muss wissen, dass danach „commit“ oder „revert“ nötig ist, sonst kommen keine neuen Deploys.
2. **Auto-Deploy vs. CI-Grün:** `deploy_on_push` baut bei jedem Push auf `main`, unabhängig vom GitHub-Check `build-and-test`. Da `main` nur per PR mit grüner CI geändert wird, ist das Risiko klein. Strenger: `deploy_on_push: false` + GitHub Action, die erst nach erfolgreichem `build-and-test` deployt (braucht DO-Token als Repo-Secret in `batik-303`).
3. **Keine eigenen Header** (kein HSTS, keine CSP per Header, keine langen Caches für gehashte Dateien). Entscheidung nötig: hinnehmen, CSP per `<meta>`, oder später Service-Komponente / Proxy.
4. **MediaPipe-Versionen passen nicht zusammen:** `package.json` hat `@mediapipe/tasks-vision ^0.10.34` (installiert 0.10.35), die WASM-Dateien kommen aber fest von `@0.10.18`. JS-Teil und WASM-Teil sollten dieselbe Version haben. Für die Spec: Version angleichen oder WASM + Modelle selbst ausliefern (dann zählen sie zum 1-GiB-Traffic und der `.wasm`-MIME-Typ bei DO müsste geprüft werden; der Loader hat zwar einen Rückfall ohne `application/wasm`, der ist aber langsamer).
5. **Abhängigkeit von fremden CDNs** (jsDelivr, Google Storage): Fällt eines aus, startet die Analyse nicht. Für einen öffentlichen Launch bewusst entscheiden.
6. **Node-Version** nicht festgelegt (`engines` fehlt; CI nutzt 20, DO-Standard 22).
7. **GitHub-Rechte:** Wer die DO-App anlegt, braucht Owner/Maintainer im Org-Repo `batik-303/ki-haltungsanalyse`.
8. **Domains/DNS:** Entscheidung DO-DNS vs. externer Anbieter; bei CAA-Records `letsencrypt.org` **und** `pki.goog` eintragen; `.de` als Alias oder Weiterleitung. `www`-Redirect vor Livegang testen.
9. **Traffic-Kontingent** 1 GiB/Monat je App: `dist/`-Größe messen und hochrechnen.
10. **PWA**: Manifest-MIME und Service-Worker-Update-Verhalten nach dem ersten Deploy mit `curl -I` prüfen.

## Quellen

- App-Spec-Referenz: <https://docs.digitalocean.com/products/app-platform/reference/app-spec/>
- Static Sites verwalten: <https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/>
- Apps anlegen (GitHub-Rechte, Autodeploy): <https://docs.digitalocean.com/products/app-platform/how-to/create-apps/>
- Quell-Repo verwalten: <https://docs.digitalocean.com/products/app-platform/how-to/manage-source-repo/>
- Deployments verwalten / Rollback: <https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/>
- pydo `create_rollback` (Pinning, `skip_pin`): <https://docs.digitalocean.com/reference/pydo/reference/apps/create_rollback/>
- API-Referenz Apps: <https://docs.digitalocean.com/reference/api/reference/apps/>
- doctl `apps create-deployment`: <https://docs.digitalocean.com/reference/doctl/reference/apps/create-deployment/>
- Deploy per GitHub Actions: <https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github-actions/>
- GitHub-Repo `digitalocean/app_action`: <https://github.com/digitalocean/app_action>
- Node.js-Buildpack: <https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/>
- Domains verwalten: <https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/>
- URL-Rewrites/Redirects: <https://docs.digitalocean.com/products/app-platform/how-to/url-rewrites/>
- Edge-Einstellungen (Cache): <https://docs.digitalocean.com/products/app-platform/how-to/configure-edge-settings/>
- Limits: <https://docs.digitalocean.com/products/app-platform/details/limits/>
- Preise (Doku): <https://docs.digitalocean.com/products/app-platform/details/pricing/>
- Preise (Website): <https://www.digitalocean.com/pricing/app-platform>
- MediaPipe Pose Landmarker Web-Anleitung: <https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js>
- MediaPipe-Loader 0.10.18 (Quellcode): <https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_wasm_internal.js>
- Header-Prüfung per `curl -I` (2026-11-13): `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_wasm_internal.wasm`, `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
