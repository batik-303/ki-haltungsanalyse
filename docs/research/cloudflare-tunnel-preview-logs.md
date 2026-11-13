# Research: `vite preview` über Cloudflare-Tunnel auf echten Geräten + Log-Rückkanal

- **Ticket**: #160 (`wayfinder:research`)
- **Branch**: `research/tunnel-logs`
- **Werkzeuge im Repo**: `vite` (package.json `^6.0.0`, installiert **6.4.2**), `@vitejs/plugin-basic-ssl` **1.2.0**; `npm run preview` = `vite preview`; `cloudflared` lokal **nicht installiert** (macOS)
- **Datum**: 2026-11-13
- **Quellenpolitik**: Nur Primärquellen: offizielle Cloudflare-Doku (developers.cloudflare.com), Vite-Doku (vite.dev) und der **installierte Vite-Quellcode** (`node_modules/vite/dist/node/...`, Version 6.4.2), Vite-Sicherheitshinweis auf GitHub, MDN, Chrome-for-Developers-Doku, Tailscale-Doku. Was nicht aus einer dieser Quellen belegt ist, steht als **„nicht verifiziert"** im Text.

## Forschungsfrage

1. Wie wird `vite preview` (fertiger Build) über einen **Cloudflare-Tunnel per HTTPS** für echte Geräte (Handy, Tablet) erreichbar, und wie geht man dabei mit dem heutigen `@vitejs/plugin-basic-ssl` um?
2. Was muss in Vites Host-Prüfung (`preview.allowedHosts`) eingetragen werden?
3. Wie kann ein kleiner **Empfänger im Preview-Server** Logs vom Gerät annehmen und lokal in eine Datei schreiben, und welche Alternativen gibt es?

## Kurzantwort

- **Tunnel**: Für Tests reicht ein **Quick Tunnel** (`cloudflared tunnel --url …`), ohne Konto und ohne Domain, mit zufälliger `*.trycloudflare.com`-Adresse, die sich bei jedem Start ändert. Grenzen: kein Uptime-Versprechen, höchstens 200 gleichzeitige Anfragen, kein Server-Sent-Events. Ein **Named Tunnel** liefert eine feste Adresse und lässt sich mit **Cloudflare Access** schützen, braucht aber ein Cloudflare-Konto **und eine eigene Domain auf Cloudflare**.
- **basic-ssl**: Zwei Wege funktionieren. **(A)** Preview bleibt HTTPS (basic-ssl) und der Tunnel zeigt auf `https://localhost:4173` mit `--no-tls-verify`. **(B)** Preview läuft ohne HTTPS (basic-ssl im Preview-Modus abschalten), der Tunnel zeigt auf `http://localhost:4173`, HTTPS kommt allein vom Tunnel. Cloudflare empfiehlt `noTLSVerify` nur als vorübergehende Notlösung, deshalb ist **(B) der sauberere Weg**.
- **Host-Prüfung**: Vite 6.4.2 prüft den `Host`-Header im Preview-Server **nur, wenn `preview.https` nicht gesetzt ist** (Quellcode). Bei Weg (B) muss also `preview.allowedHosts: ['.trycloudflare.com']` (bzw. die eigene Domain) gesetzt werden, sonst antwortet Vite mit `403 Blocked request`.
- **Log-Rückkanal**: Ein kleines Vite-Plugin mit `configurePreviewServer` hängt eine Connect-Middleware `POST /__log` ein, die JSON-Zeilen an `logs/device-*.ndjson` anhängt (`logs` steht schon in `.gitignore`). Im Browser sammelt ein Mini-Logger `console`-Ausgaben, `window.onerror` und `unhandledrejection`, bündelt sie und schickt sie per `fetch(..., { keepalive: true })` bzw. `navigator.sendBeacon` (beide 64-KiB-Grenze). Nur aktiv mit Flag, nur im Preview, **nie Kamerabilder**, Endpoint mit Token und Größenlimit absichern, weil er über den Tunnel öffentlich erreichbar ist.

## Detailbefunde

### 1. Secure Context: warum überhaupt HTTPS

`getUserMedia()` gibt es nur im Secure Context; in unsicherem Kontext ist `navigator.mediaDevices` `undefined`, der Aufruf wirft `TypeError`. Secure Context = HTTPS, `file:///` oder `localhost`.
> Quelle: MDN `getUserMedia` (Abschnitte „Privacy and security", „Encryption based security", „Exceptions")

Folge: Ein Handy im LAN über `http://192.168.x.y:4173` bekommt **keine Kamera**. Heute löst das Repo das mit `@vitejs/plugin-basic-ssl` (selbstsigniertes Zertifikat, Warnung im Browser muss bestätigt werden). Ein Cloudflare-Tunnel liefert stattdessen ein öffentlich vertrauenswürdiges Zertifikat auf der Tunnel-Adresse.

### 2. Cloudflare Quick Tunnel (TryCloudflare)

- Start: `cloudflared tunnel --url http://localhost:8080`; `cloudflared` druckt die Adresse aus.
- **Kein Konto, keine Domain nötig**: „You do not need a Cloudflare account or domain."
- Adresse unter `trycloudflare.com`; „The hostname changes each time you create a Quick Tunnel." Die Adresse stirbt, wenn der `cloudflared`-Prozess endet.
- **Grenzen**: „Quick Tunnels have no uptime guarantee."; „Each Quick Tunnel supports up to 200 in-flight requests." (darüber `429`); „Quick Tunnels do not support Server-Sent Events (SSE)."
- Zweck: „Quick Tunnels are for testing and development." Für Produktion wird ein normaler Tunnel empfohlen.
- **Zugangsschutz**: Laut Seite gibt es ein Flag `--allowed-mail`, das Besucher eine E-Mail eingeben und einen Einmal-PIN bestätigen lässt (wiederholbar, kommagetrennt oder mit Wildcard `*@example.com`); es funktioniert nicht mit nicht-interaktiven Clients.
> Quelle: Cloudflare-Doku „Quick Tunnels" (TryCloudflare)

Hinweis zum `--allowed-mail`-Flag: Die Aussagen stammen aus der aktuellen TryCloudflare-Seite. Ob der PIN-Schutz mit `sendBeacon`/`fetch` aus der App zusammenspielt (Cookie nach Login) ist **nicht verifiziert**; vorsichtshalber gilt: nach erfolgreichem Login im selben Browser sollten Anfragen an dieselbe Adresse durchgehen, das ist aber nicht getestet.

Installation macOS: `brew install cloudflared`. Cloudflare unterstützt nur Versionen, die höchstens ein Jahr hinter dem neuesten Release liegen.
> Quelle: Cloudflare-Doku „Downloads"

Für die App bedeutet „kein SSE": egal, denn `vite preview` hat kein HMR und der Log-Rückkanal ist reines `POST` vom Gerät zum Rechner.

### 3. Cloudflare Named Tunnel (feste Adresse) + Cloudflare Access

Voraussetzung: eigene Domain, deren Nameserver auf Cloudflare zeigen. Befehle (lokal verwalteter Tunnel):

```sh
cloudflared tunnel login                       # Browser-Login, erzeugt cert.pem
cloudflared tunnel create <NAME>               # UUID + Credentials-Datei
cloudflared tunnel route dns <NAME> preview.<domain>   # CNAME auf <UUID>.cfargotunnel.com
cloudflared tunnel run <NAME>                  # mit config.yml im .cloudflared-Ordner
```
> Quelle: Cloudflare-Doku „Create a locally-managed tunnel"

Konfigurationsdatei mit Ingress-Regeln: am Ende ist eine Auffangregel `service: http_status:404` Pflicht; prüfen mit `cloudflared tunnel ingress validate`. `noTLSVerify` sitzt dort unter `originRequest`.
> Quelle: Cloudflare-Doku „Configuration file" (lokal verwalteter Tunnel), per Suchergebnis zusammengefasst; die Seite selbst konnte unter der geratenen URL nicht geladen werden (404), Inhalt daher **nur über die Suche verifiziert**.

**Cloudflare Access** (Schutz vor fremden Besuchern):
- Anwendung anlegen unter Zero Trust > Access controls > Applications > „Self-hosted and private", öffentlichen Hostnamen wählen, Allow-Policy und Login-Methode festlegen. „All Access applications are deny by default."
- Empfehlung: **erst** die Access-Anwendung, **dann** die Tunnel-Route anlegen, sonst ist die Seite kurz offen für alle.
- Optional „Protect with Access" im Tunnel, damit `cloudflared` den Access-Token prüft.
- **Voraussetzung**: „An active domain on Cloudflare" (Full- oder Partial-Setup).
> Quelle: Cloudflare-Doku „Add a self-hosted application"

Ob „One-time PIN" als Login-Methode im kostenlosen Zero-Trust-Plan verfügbar ist, steht auf der Seite nicht: **nicht verifiziert**.

### 4. HTTPS-Origin (basic-ssl) hinter dem Tunnel

- Cloudflare-Origin-Parameter `noTLSVerify`: „When `true`, TLS verification is disabled. This will allow any certificate from the origin to be accepted."
> Quelle: Cloudflare-Doku „Origin parameters"
- CLI-Flag: „The `--origin-ca-pool` and `--no-tls-verify` command-line flags apply only when you define a single origin with `--url`." Bei unbekannter Zertifizierungsstelle (`x509 … unknown authority`) nennt die Seite das Abschalten der Prüfung als kurzfristige Notlösung.
> Quelle: Cloudflare-Doku „Troubleshoot tunnels"
- „Use `noTLSVerify: true` only as a temporary last resort while you fix certificate trust or the origin name." Und: „Do not point an HTTPS `Service URL` at an HTTP listener." Ohne HTTPS-Listener soll eine HTTP-Service-URL wie `http://127.0.0.1:80` genutzt werden.
> Quelle: Cloudflare-Doku „Troubleshoot HTTPS origins"

Die Strecke Gerät → Cloudflare ist in beiden Fällen HTTPS mit gültigem Zertifikat; die Strecke `cloudflared` → `localhost` bleibt auf dem eigenen Rechner. Ein HTTP-Origin auf `localhost` ist deshalb für diesen Testzweck unkritisch (eigene Einschätzung, keine Cloudflare-Aussage).

### 5. Vite: Preview-Optionen und Host-Prüfung (Version 6.4.2)

**Sicherheitsfix**: GHSA-vg6x-rcgg-rjx6 / CVE-2025-24010 (20.01.2025): ohne Prüfung des `Host`-Headers konnten fremde Webseiten per DNS-Rebinding Anfragen an den Dev-Server schicken. Behoben in **6.0.9**, 5.4.12, 4.5.6 mit der neuen Option `server.allowedHosts`; wer über Reverse-Proxy oder fremde Domain zugreift, muss den Hostnamen eintragen.
> Quelle: GitHub Security Advisory GHSA-vg6x-rcgg-rjx6
Die installierte Version 6.4.2 enthält den Fix.

**Doku** (vite.dev): `server.allowedHosts` Standard `[]`; erlaubt sind immer `localhost`, `*.localhost` und alle IP-Adressen. „If a string starts with `.`, it will allow that hostname without the `.` and all subdomains under the hostname." `true` erlaubt alles und wird wegen DNS-Rebinding nicht empfohlen. **„When using HTTPS, this check is skipped."** Zusätzliche Hosts auch per Umgebungsvariable `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`. `preview.allowedHosts`: „The hostnames that Vite is allowed to respond to."; `preview.host`: `0.0.0.0` oder `true` für alle Adressen.
> Quellen: vite.dev „Server Options", „Preview Options"

**Quellcode 6.4.2** (`node_modules/vite/dist/node/chunks/dep-Dq2t6Dq0.js`) bestätigt das für den Preview-Server:

```js
// resolvePreviewOptions: Preview erbt von server.*, wenn nicht gesetzt
allowedHosts: preview2?.allowedHosts ?? server.allowedHosts,
https: preview2?.https ?? server.https,

// preview(): Host-Prüfung nur ohne HTTPS
const { allowedHosts } = config.preview;
if (allowedHosts !== true && !config.preview.https) {
  app.use(hostCheckMiddleware(config, true));
}
```

Abweisung: `403` mit Text „Blocked request. This host (…) is not allowed. To allow this host, add … to `preview.allowedHosts` in vite.config.js." Standard-Port Preview: **4173** (`DEFAULT_PREVIEW_PORT`, `dist/node/constants.js`).

**basic-ssl 1.2.0** (`node_modules/@vitejs/plugin-basic-ssl/dist/index.mjs`) setzt in `configResolved` sowohl `config.server.https` als auch `config.preview.https`, sofern diese `undefined` oder truthy sind.

Folgen für das Projekt:
- **Weg A** (basic-ssl bleibt aktiv): `preview.https` ist gesetzt → Host-Prüfung entfällt → `*.trycloudflare.com` wird ohne `allowedHosts` bedient. Tunnel muss auf `https://localhost:4173` zeigen und braucht `--no-tls-verify` (selbstsigniert).
- **Weg B** (basic-ssl nur für `dev`): `preview.https` leer → Host-Prüfung aktiv → `preview.allowedHosts: ['.trycloudflare.com']` (bzw. eigene Domain) nötig.

Dass `cloudflared` den ursprünglichen `Host` (die Tunnel-Adresse) an den Origin weiterreicht, steht so **nicht** in der Cloudflare-Doku (`httpHostHeader` „Sets the HTTP `Host` header on requests sent to the local service", Standard leer): **nicht verifiziert**, aber genau deshalb ist der Eintrag in `allowedHosts` nötig. Notfalls zeigt die 403-Meldung von Vite, welcher Host ankommt.

Plugin abhängig vom Preview-Modus: Der Typ `ConfigEnv` in Vite 6.4.2 hat `isPreview?: boolean` (`dist/node/index.d.ts`), und `preview()` löst die Konfiguration mit `command: 'serve'`, Modus `production`, `isPreview: true` auf (Quellcode). Die Plugin-Doku zeigt `apply` als `'build' | 'serve'` oder Funktion `apply(config, { command })`; `isPreview` im zweiten Argument ist **nur über Typen/Quellcode belegt**, nicht in der Plugin-Doku.

Skizze Weg B (nicht getestet, kein Produktionscode):

```ts
// vite.config.ts (Skizze)
export default defineConfig(({ isPreview }) => ({
  plugins: [react(), tailwindcss(), ...(isPreview ? [] : [basicSsl()]), deviceLogPlugin()],
  preview: { host: true, allowedHosts: ['.trycloudflare.com'] },
}))
```

### 6. Log-Empfänger als Vite-Plugin (`configurePreviewServer`)

Doku: `configurePreviewServer` ist „Same as `configureServer` … but for the preview server" und wird „before other middlewares are installed" aufgerufen; eine zurückgegebene Funktion läuft **nach** den internen Middlewares.
> Quelle: vite.dev „Plugin API"

Quellcode 6.4.2 bestätigt die Reihenfolge: zuerst alle `configurePreviewServer`-Hooks, **danach** CORS, Host-Prüfung, Proxy, Kompression, statische Dateien (`sirv`), SPA-Fallback. Wichtige Folge: **eine direkt im Hook registrierte Middleware läuft vor der Host-Prüfung**, ist also davon nicht geschützt. Der Endpoint braucht seine eigene Absicherung (Token, Größenlimit).

Zusätzlich: `vite preview` bricht ab, wenn `dist/` fehlt, **außer** ein Plugin implementiert `configurePreviewServer` (Quellcode, Kommentar „error if no plugins implement `configurePreviewServer`"). Also trotzdem immer erst `npm run build`.

Skizze (nicht getestet):

```ts
// Skizze: nur im Preview aktiv, nie im Produktions-Build
function deviceLogPlugin(): Plugin {
  return {
    name: 'device-log',
    apply: (_config, env) => env.isPreview === true,
    configurePreviewServer(server) {
      const token = process.env.DEVICE_LOG_TOKEN       // z. B. beim Start gesetzt
      server.middlewares.use('/__log', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        // Token aus Query (?t=…), weil sendBeacon keine eigenen Header kann
        // Body lesen, bei > 64 KiB abbrechen (413), JSON prüfen,
        // je Eintrag eine Zeile an logs/device-<datum>.ndjson anhängen (fs.appendFile)
        res.statusCode = 204; res.end()
      })
    },
  }
}
```

`logs` ist in der vorhandenen `.gitignore` bereits ausgeschlossen (Zeile `logs`), Log-Dateien landen also nicht im Repo (geprüft im Worktree).

Da `vite build` das Plugin wegen `apply` nicht anwendet und die Middleware nur im Node-Prozess von `vite preview` existiert, landet **serverseitig nichts** im statischen Build für DigitalOcean. Die **Client-Seite** (Logger im Browser) muss dagegen eigens ausgeschlossen werden, siehe unten.

### 7. Client-Seite: Mini-Logger im Browser

Bausteine (alle MDN):
- `navigator.sendBeacon(url, data)`: asynchroner kleiner `POST`, gedacht für Analyse/Diagnose; Rückgabe `true` heißt nur „in Warteschlange", nicht „angekommen"; Gesamtgröße der Warteschlange **64 KiB**; keine eigenen Header (für mehr Kontrolle `fetch` mit `keepalive`). Empfohlen: beim Wechsel auf `visibilityState === 'hidden'` senden, nicht auf `unload`/`beforeunload`/`pagehide` verlassen (auf Mobilgeräten oft nicht ausgelöst).
> Quelle: MDN `Navigator.sendBeacon()`
- `fetch(..., { keepalive: true })`: Anfrage überlebt das Schließen der Seite, erlaubt eigene Header und Antwort; Body-Grenze **64 KiB**.
> Quelle: MDN `RequestInit`
- `unhandledrejection`: wird ausgelöst, wenn ein Promise ohne Rejection-Handler abgelehnt wird; Beispiel nutzt `event.reason`.
> Quelle: MDN `unhandledrejection`
- `window.onerror` / `error`-Event für Laufzeitfehler: in dieser Recherche **nicht eigens nachgeschlagen** (Standard-API, aber hier ohne Quellenzitat).

Vorschlag (Entwurf, nicht getestet):
- **Aktivierung nur mit Flag**: z. B. Query-Parameter `?log=<token>` beim Öffnen der Tunnel-Adresse, im `sessionStorage` gemerkt; zusätzlich Build-Schalter. Damit der Logger im späteren DigitalOcean-Build nicht enthalten ist, muss er hinter einer **Build-Zeit-Bedingung** stehen (z. B. eigener Modus `vite build --mode preview-log` und `import.meta.env.MODE`-Prüfung mit dynamischem Import). Achtung: `vite preview` serviert den **fertigen** `dist/`-Build, `import.meta.env` ist dort zur Build-Zeit eingefroren. Der Logger muss also schon beim `build` eingeschaltet werden. (Ableitung aus dem Vite-Prinzip „preview = production build"; Details zu Modi/`import.meta.env` hier **nicht eigens zitiert**.)
- **Inhalt je Eintrag**: Zeitstempel, Stufe (`log/warn/error`), Text (gekürzt, z. B. 2 KB), Fehler-Stack, Sitzungs-ID (Zufall je Tab), Geräteinfo einmal je Sitzung: `navigator.userAgent`, Bildschirmgröße, `devicePixelRatio`, Ausrichtung.
- **Bündeln**: Puffer, alle paar Sekunden oder ab N Einträgen per `fetch` mit `keepalive` senden; bei `visibilitychange → hidden` Rest per `sendBeacon`. Jede Sendung deutlich unter 64 KiB halten.
- **Datenschutz**: keine Kamerabilder, keine Video-Frames, keine Landmark-Rohdatenströme ins Log. Höchstens abgeleitete Zahlen (z. B. Winkel, Zustand) und nur wenn für die Diagnose nötig. Das entspricht dem Projektprinzip „rein client-seitig" und der Arbeitsweise „Diagnose nur aus Code, Zahlen und Aussagen".
- **Sicherheit** (Endpoint ist über den Tunnel öffentlich): Token (zufällig je Start), Größenlimit je Anfrage (413), einfache Ratenbegrenzung je IP/Sitzung im Speicher, nur `POST`, nur JSON, Dateiname serverseitig festgelegt (nie aus dem Request), Zeilen kürzen. Zusätzlich hilft Cloudflare Access bzw. `--allowed-mail` vor dem ganzen Tunnel.

### 8. Alternativen zum eigenen Log-Rückkanal

- **Chrome Remote Debugging (Android)**: USB-Kabel, auf dem Gerät „USB-Debugging" in den Entwickleroptionen, am Rechner `chrome://inspect#devices` mit „Discover USB devices", Freigabe auf dem Gerät bestätigen, dann „Inspect".
> Quelle: Chrome for Developers „Remote debug Android devices"
- **Safari Web Inspector (iPhone/iPad)**: Apple-Seite „Inspecting iOS and iPadOS" ließ sich nicht auslesen (nur Titel geladen). Ablauf (Web Inspector in den Safari-Einstellungen des Geräts einschalten, Kabel, Safari am Mac → Entwickler-Menü) ist daher **nicht verifiziert**.
- **Externer Fehlerdienst (z. B. Sentry)**: nicht recherchiert (**nicht verifiziert**). Grundsätzlich: Daten gehen an einen Dritten, widerspricht dem Privacy-Versprechen der App, braucht Konto und Datenschutz-Prüfung; dafür auch nach dem Launch nutzbar.

### 9. Alternativen zum Cloudflare-Tunnel (kurz)

- **Tailscale Funnel**: öffentliche HTTPS-Adresse unter `*.ts.net`, `tailscale funnel 3000`, nur Ports 443/8443/10000, nur TLS; braucht Tailscale ≥ 1.38.3, MagicDNS, HTTPS-Zertifikate und Funnel-Attribut in der Tailnet-Policy.
> Quelle: Tailscale-Doku „Tailscale Funnel"
- **ngrok**: nicht recherchiert (**nicht verifiziert**).
- **LAN mit basic-ssl (heutiger Weg)**: `vite preview --host` mit selbstsigniertem Zertifikat, Gerät muss im selben WLAN sein und die Zertifikatswarnung bestätigen. IP-Adressen sind in Vite immer erlaubt (siehe 5.), Host-Prüfung entfällt ohnehin wegen HTTPS.

## Wege-Vergleich

### Tunnel

| Weg | Vorteile | Nachteile |
|-----|----------|-----------|
| **Quick Tunnel + HTTP-Origin (Weg B)** | kein Konto, keine Domain; ein Befehl; echtes Zertifikat, keine Warnung am Gerät; Geräte außerhalb des WLANs; kein `noTLSVerify` | Zufalls-Adresse bei jedem Start (neu ans Gerät schicken, QR-Code); kein Uptime-Versprechen; max. 200 gleichzeitige Anfragen; öffentlich erreichbar, Schutz nur über `--allowed-mail` oder eigenen Token; `vite.config.ts` braucht `allowedHosts` und basic-ssl nur für `dev` |
| **Quick Tunnel + HTTPS-Origin (Weg A, basic-ssl bleibt)** | keine Änderung an `vite.config.ts` nötig (Host-Prüfung entfällt bei HTTPS) | `--no-tls-verify` nötig, laut Cloudflare nur „temporary last resort"; Host-Prüfung ist dann ganz aus (auch für DNS-Rebinding von außen); sonst wie Weg B |
| **Named Tunnel + Cloudflare Access** | feste Adresse (Lesezeichen, PWA-Installation auf Gerät testbar); Zugangsschutz per Policy, „deny by default"; nah an späterer Produktiv-Domain | braucht Cloudflare-Konto **und** Domain auf Cloudflare (Nameserver-Umzug oder Partial-Setup); mehr Einrichtung; Access-Login-Methoden im Gratisplan nicht verifiziert |
| **Tailscale Funnel** | feste `ts.net`-Adresse, echtes Zertifikat | Tailscale-Konto/Tailnet, Policy-Einstellung; nicht im Fokus |
| **LAN + basic-ssl (heute)** | nichts Neues; bleibt im eigenen Netz | Zertifikatswarnung auf jedem Gerät; nur im selben WLAN; manche Funktionen können bei nicht vertrauenswürdigem Zertifikat eingeschränkt sein (z. B. PWA/Service Worker; **nicht verifiziert**) |

### Log-Rückkanal

| Weg | Vorteile | Nachteile |
|-----|----------|-----------|
| **Vite-Preview-Middleware `POST /__log` → `logs/*.ndjson`** | Daten bleiben auf dem eigenen Rechner; funktioniert auf allen Geräten ohne Kabel; Logs mit Zeitstempel durchsuchbar; serverseitig nicht im statischen Build | eigener Code (Plugin + Client-Logger, nach TDD); Endpoint über Tunnel öffentlich → Token, Größen- und Ratenlimit nötig; Client-Logger muss per Build-Modus aus dem Produktions-Build gehalten werden |
| **Chrome Remote Debugging (USB)** | volle DevTools inkl. Performance; kein Code | nur Android + Kabel; nicht nebenbei beim Üben mit der Geige; keine Datei-Historie |
| **Safari Web Inspector** | volle DevTools für iPhone/iPad | Mac + Kabel nötig; Ablauf hier nicht verifiziert |
| **Externer Dienst (Sentry o. ä.)** | auch nach Launch; fertige Oberfläche | Daten bei Drittem, Konflikt mit Privacy-Versprechen; Konto, Kosten, Datenschutz-Prüfung; nicht recherchiert |

## Empfehlung

1. **Quick Tunnel mit Weg B** als Standard-Testumgebung:
   - basic-ssl nur noch für `dev` laden (`isPreview` im Config-Callback), `preview.host: true`, `preview.allowedHosts: ['.trycloudflare.com']`.
   - Ablauf: `npm run build` → `npm run preview` → `cloudflared tunnel --url http://localhost:4173` → ausgegebene `https://….trycloudflare.com`-Adresse aufs Gerät (z. B. als QR-Code).
   - `brew install cloudflared` einmalig.
2. **Log-Rückkanal** als kleines Vite-Plugin mit `configurePreviewServer` (`apply` nur bei `isPreview`), `POST /__log?t=<token>`, Body ≤ 64 KiB, Ausgabe `logs/device-<datum>.ndjson`. Client-Logger nur in einem eigenen Build-Modus und nur mit Query-Flag aktiv; senden per `fetch keepalive` mit `sendBeacon` beim Verstecken der Seite. Keine Kamerabilder, keine Rohdatenströme.
3. **Named Tunnel + Access erst**, wenn eine feste Adresse gebraucht wird (z. B. PWA-Installation testen, Schüler-Tests über mehrere Tage). Passt zur geplanten Domain `blueanchormusic.*`, braucht aber DNS bei Cloudflare.
4. Remote-Debugging per Kabel bleibt Ergänzung für tiefe Fehlersuche (Performance), nicht für den Alltags-Test.

## Offene Punkte

- Reicht `--allowed-mail` beim Quick Tunnel als Schutz, und kommen `fetch`/`sendBeacon`-Anfragen nach dem PIN-Login durch? (**nicht verifiziert**, ausprobieren)
- Leitet `cloudflared` beim Quick Tunnel den Original-`Host` weiter? (Doku schweigt; beim ersten Start an der Vite-403-Meldung bzw. am Erfolg ablesbar)
- Ob Cloudflare Access mit „One-time PIN" im kostenlosen Zero-Trust-Plan nutzbar ist: offen.
- Wie der Client-Logger aus dem DigitalOcean-Build herausgehalten wird (eigener `--mode`, dynamischer Import) gehört in `docs/spec/stabilisierung.md`; dort auch: welche Werte geloggt werden dürfen.
- Safari-Web-Inspector-Ablauf aus Apple-Doku nachtragen (Seite war nicht lesbar).
- Ratenlimit: einfache In-Memory-Grenze genügt vermutlich, Zahlen festlegen.

## Quellen

- Cloudflare: Quick Tunnels (TryCloudflare): <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/>
- Cloudflare: Downloads (cloudflared): <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/>
- Cloudflare: Create a locally-managed tunnel: <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/>
- Cloudflare: Configuration file (lokal verwaltet; nur über Suche verifiziert): <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/>
- Cloudflare: Origin parameters: <https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/cloudflared-parameters/origin-parameters/>
- Cloudflare: Troubleshoot tunnels: <https://developers.cloudflare.com/cloudflare-one/troubleshooting/tunnel/>
- Cloudflare: Troubleshoot HTTPS origins: <https://developers.cloudflare.com/tunnel/troubleshooting/https-origins/>
- Cloudflare: Self-hosted public application (Access): <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/>
- Vite: Server Options: <https://vite.dev/config/server-options>
- Vite: Preview Options: <https://vite.dev/config/preview-options>
- Vite: Plugin API: <https://vite.dev/guide/api-plugin>
- Vite Security Advisory GHSA-vg6x-rcgg-rjx6 (CVE-2025-24010): <https://github.com/vitejs/vite/security/advisories/GHSA-vg6x-rcgg-rjx6>
- Vite 6.4.2 Quellcode (lokal installiert): `node_modules/vite/dist/node/chunks/dep-Dq2t6Dq0.js` (`preview()`, `resolvePreviewOptions`, `hostCheckMiddleware`), `node_modules/vite/dist/node/index.d.ts` (`ConfigEnv.isPreview`, `configurePreviewServer`), `node_modules/vite/dist/node/constants.js` (`DEFAULT_PREVIEW_PORT = 4173`)
- `@vitejs/plugin-basic-ssl` 1.2.0 Quellcode (lokal): `node_modules/@vitejs/plugin-basic-ssl/dist/index.mjs`
- MDN: `getUserMedia()`: <https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia>
- MDN: `Navigator.sendBeacon()`: <https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon>
- MDN: `RequestInit` (`keepalive`): <https://developer.mozilla.org/en-US/docs/Web/API/RequestInit>
- MDN: `unhandledrejection`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event>
- Chrome for Developers: Remote debug Android devices: <https://developer.chrome.com/docs/devtools/remote-debugging>
- Apple: Inspecting iOS and iPadOS (Inhalt nicht lesbar): <https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios>
- Tailscale: Funnel: <https://tailscale.com/kb/1223/funnel>
