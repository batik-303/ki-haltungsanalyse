# Design-Referenz — Blue Anchor Home & Logo

**Status:** verbindlich · **Herkunft:** Stitch-Screen „Blue Anchor – Willkommen & Ausrichtung" (Projekt *Blue Anchor Music App*, `projects/2605025123829968407`) · **Karte:** #46 · **Ticket:** #47

Diese Datei hält die aus dem Stitch-Entwurf abgeleitete **Design-Sprache** fest und ist die **verbindliche Referenz** für die Umsetzung von Logo (#48) und Home (#49). Sie trifft die im Grilling offengelassenen Entscheidungen (Palette-Mapping, Typografie) und dokumentiert Logo- und Home-Spezifikation.

> **Leitentscheidung (klärt den Nebel „Token-Rückwirkung auf andere Screens"):**
> Der Stitch-Entwurf liefert die **Struktur** für Home; die **Farb- und Font-Token bleiben global unverändert** (Marine-Serenity-Architektur, [ADR 0001](../adr/0001-marine-serenity-token-architektur.md)). Stitch-Hexes, die von den Tokens abweichen, werden **auf die bestehenden Tokens gemappt** statt eingepflegt; Stitch-eigene Flächen ohne Token-Entsprechung (Sky-Verlauf, Glow-Gradienten) sind **Home-lokale visuelle Behandlungen**, keine neuen Token. So bleibt es bei **einem** Palettensystem (kein Parallel-System neben ADR 0001), und `setup`/`results`/`session` — in dieser Karte **out of scope** — behalten ihren #15-Look unberührt.

---

## 1. Palette — Stitch-Hexes auf bestehende Token gemappt

Die Stitch-Vorlage bringt ein eigenes `tailwind.config`-Palettensystem mit (`brandRoyalBlue`, `brandAccentBlue`, `brandDarkGold` …). Dieses **wird nicht übernommen** — es widerspräche ADR 0001. Stattdessen pro Stitch-Farbe die Entscheidung: *bleibt* (auf bestehendes Token mappen), *neuer Wert* (Token-Wert ändern) oder *nur-Home* (Home-lokale Fläche ohne Token).

| Stitch-Rolle | Stitch-Hex | Bestehendes Token (`src/index.css`) | Entscheidung | Reichweite |
|---|---|---|---|---|
| Text / Slate | `#0F172A` | `--ui-foreground` `#101d24` | **bleibt** — praktisch identisch (ΔE < 3), kein globaler Umbau | global (unverändert) |
| Sky-Verlauf (Seitengrund) | `#E0F2FE → #EDF7FF → #F8FAFC` | `--ui-background` `#f5faff` (flach) | **nur-Home** — Verlauf als Home-lokaler Hero-Hintergrund (Utility-Klassen), Token bleibt flach | nur-Home |
| Akzentblau (Icon/Trust-Punkt) | `#1D4ED8` | `--color-sapphire-deep` `#1565C0` | **bleibt** — auf `sapphire-deep` mappen; sparsame Icon-/Punkt-Akzente, kein neues Token | global (unverändert) |
| Gold-CTA | `#B8860B` (Verlauf `#C99718→#B8860B→#946905`) | `--ui-accent` `#B07A24` · `--color-gold-dark` `#B8860B` | **bleibt** — `--color-gold-dark` **ist bereits `#B8860B`**; CTA-Gold-Verlauf daraus, Accent-Token (`#B07A24`, AA-geprüft #29) unverändert | global (unverändert) |
| Karten-Weiß / Ränder | `#FFFFFF` / `slate-200` | `--ui-card` `#ffffff` / `--ui-border` `#c3c7ce` | **bleibt** | global (unverändert) |
| Glow-Gradient (Logo-Punkt) | `#38BDF8 → #0284C7 → #0369A1` | — (kein Token) | **nur-Home/Logo** — Inline-SVG-`radialGradient`, sitzt in der Sapphire-Familie, kein Token | nur-Logo |

**Ergebnis:** Kein Token-Wert wird geändert. Der Stitch-Look entsteht aus **bestehenden Token** plus zwei Home-lokalen Flächen (Sky-Verlauf, Logo-Glow), die bewusst **keine** Token sind, weil sie nur auf Home/Logo vorkommen und die anderen Screens nicht betreffen sollen.

### Home-lokaler Sky-Verlauf

Als Home-Seitengrund (nicht als Token), vertikal:

```
background: linear-gradient(to bottom, #E0F2FE 0%, #EDF7FF 50%, #F8FAFC 100%);
```

Der `session`-Teilbaum (`data-theme="dark"`) ist unberührt — Home gehört zum hellen Chrome.

---

## 2. Typografie — Mapping statt neuer Font

Stitch nutzt **Plus Jakarta Sans**. Die App hat **Manrope** (`--font-sans`/`--font-headline`) und **Geist** (`--font-label`), plus Geist Mono für Daten.

**Entscheidung: Plus Jakarta Sans wird _nicht_ eingeführt.** Home mappt auf die bestehenden Font-Token:

| Stitch-Verwendung | Bestehendes Token | Font |
|---|---|---|
| Wortmarke „BLUE ANCHOR", Überschriften | `--font-headline` | Manrope Variable |
| Karten-Titel, Fließtext | `--font-sans` | Manrope Variable |
| Labels („1. Wähle dein Instrument", „M U S I C", Trust-Zeile) | `--font-label` | Geist Variable |

**Begründung:** Ein dritter Webfont kostet Ladezeit ohne funktionalen Gewinn; Manrope ist bereits die Headline-Schrift, trägt die gesperrte Versal-Wortmarke sauber. Home bliebe sonst typografisch aus der Reihe zu `setup`/`results` (die Manrope/Geist behalten, hier out of scope). **Kein neues Font-Token.**

**Typo-Details aus dem Stitch (auf Manrope/Geist übertragen):**
- Wortmarke: `font-extrabold` (800), `tracking-wider`, `uppercase`, `leading-none`.
- „M U S I C": Geist, `font-bold`, `uppercase`, 10–11 px, `text-slate-500`, per `justify-between` auf Wortmarken-Breite gesperrt.
- Sektions-Labels: 12 px, `font-bold`, `uppercase`, `tracking-wider`, `text-foreground/60`.

---

## 3. Logo-Spezifikation

Ersetzt die **„Gummiband"-Marke** aus #37/#41 **überall** (Home-Lockup, Header-Icon, Favicon/App-Icon). Konzept bleibt: *vereinfachte Viertelnote* = **leuchtender Ankerpunkt** (Notenkopf) + **Weg** (Hals) — nur ist der Hals jetzt ein **gerader, senkrechter Steg** (Variante „Aufwärts"), nicht mehr elastisch gekrümmt.

### 3.1 Header-Marke (Nav, ~32 px)

Gerader Steg + Punkt mit radialem Glow. Inline-SVG (scharf auf jeder Größe):

```html
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="navDotGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="65%" stop-color="#0284C7"/>
      <stop offset="100%" stop-color="#0369A1"/>
    </radialGradient>
  </defs>
  <line x1="12" y1="3.5" x2="12" y2="14" stroke="#0284C7" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="12" cy="16" r="4.2" fill="url(#navDotGlow)"/>
</svg>
```

### 3.2 Hero-Marke (Home-Lockup, ~36×48 px)

Größerer Glow (weißer Kern → Sky → Sapphire → Deep), mit weichem Drop-Shadow-Halo:

```html
<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg"
     class="drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]">
  <defs>
    <radialGradient id="heroAnchorGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="35%" stop-color="#38BDF8"/>
      <stop offset="75%" stop-color="#0284C7"/>
      <stop offset="100%" stop-color="#0369A1"/>
    </radialGradient>
  </defs>
  <line x1="24" y1="10" x2="24" y2="38" stroke="#0284C7" stroke-width="4" stroke-linecap="round"/>
  <circle cx="24" cy="46" r="9" fill="url(#heroAnchorGlow)"/>
</svg>
```

### 3.3 Wortmarke (horizontal)

- **„BLUE ANCHOR"** — Manrope, `font-extrabold`, `tracking-wider`, `uppercase`, `leading-none`, `text-foreground`. Header ~18 px, Hero ~24–26 px.
- **„M U S I C"** — Geist, `font-bold`, `uppercase`, 10–11 px, `text-slate-500`, per `justify-between` exakt auf Wortmarken-Breite gesperrt, `mt-0.5`.
- Marke + Wortmarke horizontal nebeneinander, Wortmarke linksbündig zur Marke (`gap-1.5`).
- **„Willkommen bei" entfällt** (Karten-Entscheidung Q5).

### 3.4 Farb-Zuordnung zu Token

Steg/Punkt-Farben liegen in der **Sapphire-Familie**; für Token-Referenzen gilt: `#0284C7`≈`sapphire-deep`-Nachbar, Kern-Glow ≈ `sapphire-light`/weiß. Die exakten Glow-Hexes bleiben **inline im SVG** (kein Token — nur Logo verwendet sie). Kein Gold, kein Rot in der Marke.

---

## 4. Home-Layout

Struktur des Stitch-Screens (Spalten-Flow, `max-w-sm` zentriert), umgesetzt mit bestehenden Token und Karten-Stil. **Drei Fokus-Modi bleiben** funktional erhalten (Analyzer-/Render-Dispatch, Q6) — nur im Stitch-Kartenstil.

```
┌─ Header ──────────────────────────────────────────┐
│  [Logo-Marke]  BLUE ANCHOR / M U S I C     (kein  │  ← Avatar entfällt (kein Login V1, Q7)
│                                            Avatar) │
├─ Main (max-w-sm, zentriert, space-y-6) ───────────┤
│  Hero-Lockup: Marke + „BLUE ANCHOR / M U S I C"   │  ← zentriert
│                                                    │
│  Label „1. Wähle dein Instrument"                  │
│  ┌ Karte: 🎻 Geige / Violine ─────────── [✓] ┐    │  ← weiße Karte, rounded-2xl, shadow-sm
│  └──────────────────────────────────────────┘     │
│                                                    │
│  Label „2. Wähle deinen Fokus"                     │
│  ┌ Karte: Handgelenk-Modus ──────────── [✓] ┐     │  ← 3 Fokus-Modi (Q6)
│  └──────────────────────────────────────────┘     │
│                                                    │
│  ┌ Anti-Stress-Karte (backdrop-blur) ────────┐    │  ← „Im Spiel bleibt der Bildschirm dunkel …"
│  └──────────────────────────────────────────┘     │
├─ Footer (max-w-sm) ───────────────────────────────┤
│  [ Gold-CTA: „Kamera starten & Kalibrieren →" ]   │  ← gold, führt in Session-/Kalibrier-Flow (#36)
│  • Keine Registrierung nötig  •  Lokale KI-Erk.   │  ← Trust-Zeile
└────────────────────────────────────────────────────┘
```

### Bausteine

- **Header:** Logo links; **kein** Person-Avatar (kein Login in V1, Q7). Der Stitch-Avatar wird weggelassen.
- **Hero-Lockup:** zentrierte Marke + Wortmarke (§3), leichter Drop-Shadow-Glow.
- **Instrument-Karte:** weiße Karte (`--ui-card`), `rounded-2xl`, `border-border`, `shadow-sm`; Emoji-Badge (`bg-muted`, `rounded-xl`), Titel + Untertitel, aktiver Haken (dunkler Kreis, `--ui-primary`).
- **Fokus-Karten:** gleicher Stil; Icon in `bg-secondary`/`sapphire-deep`. **Drei Modi** (`violin` / `shoulder` / `wrist`) bleiben wählbar — Funktion (Analyzer-/Render-Dispatch) unverändert.
- **Anti-Stress-Karte:** halbtransparent + `backdrop-blur`, `visibility_off`-Icon in `sapphire-deep/10`, Text „**Anti-Stress-Garantie:** Im Spiel bleibt der Bildschirm dunkel für freien Blick auf die Noten."
- **Gold-CTA:** volle Breite, `rounded-2xl`, Gold aus `--color-gold-dark`/`--ui-accent`, Text „**Kamera starten & Kalibrieren**" + Pfeil. Führt in den **bestehenden** Session-/Kalibrier-Flow vor dem Countdown (Readiness-Gate #36). Ersetzt keinen Flow, sitzt davor (Q7).
- **Trust-Zeile:** „Keine Registrierung nötig · Lokale KI-Erkennung", `text-foreground/50`, kleine Statuspunkte.

### Aktiv-/Auswahl-Stil (aus Stitch)

- Aktive Auswahl: dunkler Haken-Kreis (`--ui-primary`, weißer Haken).
- Gold-aktive Karte (optional, für hervorgehobene Auswahl): `border: 1.5px solid #B8860B; box-shadow: 0 4px 20px rgba(184,134,11,.12)` — aus `--color-gold-dark`.

---

## 5. Was diese Referenz _nicht_ ändert

- **Keine Token-Werte** in `src/index.css` (Palette & Fonts bleiben wie #15/ADR 0001).
- **Keine anderen Screens:** `setup`/`results`/`session` behalten ihren #15-Look (out of scope in #46).
- **Kein Plus Jakarta Sans**, kein `brand*`-Parallel-Palettensystem.
- **Kamera-/Canvas-Indikatoren** unberührt (wie in #15 zurückgestellt).

Alle Marken sind reines Inline-**SVG**. Umsetzung: Logo #48 → Home #49.
