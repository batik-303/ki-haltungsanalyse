# PRD: Responsive Redesign — Mobile & Desktop

> **Status**: `ready-for-agent`
> **Erstellt**: 30.05.2026
> **Entscheidungen**: 20/20 via Grill-Me-Interview

---

## Problem Statement

Blue Anchor läuft aktuell nur auf Desktop- und Tablet-Geräten sinnvoll. Auf Smartphones (z.B. iPhone mit 390px Breite) brechen Layouts: HUD-Elemente überlappen, Touch-Ziele sind zu klein, das Canvas resized nicht bei Orientation-Change, und Safe Areas (Notch, Home Indicator) werden ignoriert. Es gibt keine zentrale Responsive-Strategie — jeder Screen handhabt Breakpoints anders oder gar nicht.

## Solution

Ein systematisches Responsive-System mit drei Komponenten:

1. **Frameless Shell + Layout-System**: Ein zentrales, React-freies Modul (`initLayoutSystem`) managed Breakpoints, Orientation und CSS Custom Properties. Ein schlanker Zustand-Store (`layoutStore`) stellt `orientation` und `deviceClass` für Komponenten bereit.

2. **Screen-spezifische Layout-Anpassungen**: Jeder Screen erhält konsistente responsive Regeln mit zwei Breakpoints (`sm: 480px`, `md: 1024px`). Der Session-Screen bekommt ein Bottom-Bar-Layout auf schmalen Geräten, inklusive temporär expandierender Kalibrierungs-Bar.

3. **Visuelle Verfeinerung**: Outfit als neue Display-Schrift, Geist Mono für numerische Daten (Timer, Prozentwerte), gezielte CSS-Animationen für Seitenübergänge und Chart-Reveal, und Safe-Area-konforme Positionierung via Tailwind-Utilities.

## User Stories

1. Als Musiker mit einem iPhone möchte ich die App starten und ein Instrument auswählen können, ohne dass Karten abgeschnitten oder unlesbar sind.
2. Als Musiker mit einem iPhone möchte ich den Analysemodus und die Empfindlichkeit einstellen können, wobei die Modus-Karten untereinander statt gequetscht nebeneinander erscheinen.
3. Als Musiker mit einem iPhone im Session-Modus möchte ich alle HUD-Informationen (Modus, Timer, Spannung) sehen, ohne dass sie das Video-Vorschaubild überdecken.
4. Als Musiker mit einem iPhone möchte ich die Session mit Finger-tauglichen Buttons starten/stoppen/kalibrieren können (min. 44px Höhe).
5. Als Musiker mit einem iPhone möchte ich, dass die Kalibrierung (3-Sekunden-Countdown) in einer temporär expandierten Bottom-Bar statt als Vollbild-Overlay erscheint.
6. Als Musiker, der sein Gerät dreht (Portrait ↔ Landscape), möchte ich dass das Canvas automatisch neu dimensioniert wird und die Landmark-Overlays korrekt bleiben.
7. Als Musiker mit einem modernen Smartphone (Notch/Dynamic Island) möchte ich, dass HUD-Elemente nicht von System-UI-Elementen verdeckt werden.
8. Als Musiker mit einem Desktop möchte ich, dass die App weiterhin exakt so aussieht und funktioniert wie bisher — das Redesign bricht keine bestehenden Desktop-Layouts.
9. Als Musiker möchte ich nach einer Session die Ergebnisse (Donut-Chart, Timeline) auf meinem Phone klar und nacheinander (nicht gequetscht nebeneinander) lesen können.
10. Als Musiker möchte ich, dass Screen-Übergänge (Home→Setup→Session→Results) mit einer sanften Animation erscheinen, statt abrupt zu wechseln.
11. Als Musiker möchte ich, dass die Typografie elegant und präzise wirkt — eine wärmere Schrift für Text und eine Mono-Schrift für numerische Messwerte.
12. Als Musiker, der die App im Dark Mode nutzt (Standard), möchte ich dass der dunkle Hintergrund erhalten bleibt, da das Canvas-Feedback darauf optimiert ist.

## Implementation Decisions

### Architektur

- **Shell**: Frameless — kein sichtbares Chrome, kein Padding, kein Header. Die Shell ist ein reiner Utility-Wrapper, der CSS Custom Properties und einen Zustand-Store managed.
- **Layout-System**: Ein React-freies TypeScript-Modul (`initLayoutSystem`) wird in `main.tsx` vor `createRoot()` initialisiert. Es setzt MatchMedia-Listener für Breakpoints und Orientation, schreibt CSS Custom Properties auf `:root`, und befüllt den `layoutStore`.
- **Layout-Store**: Ein schlanker Zustand-Store mit nur zwei Feldern: `orientation: 'portrait' | 'landscape'` und `deviceClass: 'phone' | 'tablet' | 'desktop'`. Keine Pixel-Werte (die leben in CSS Properties).

### Breakpoints

TailwindCSS v4 bekommt zwei benutzerdefinierte Breakpoints:
- `sm`: `480px` (Trennung Phone ↔ Tablet)
- `md`: `1024px` (Trennung Tablet ↔ Desktop)

`lg:` und `xl:` werden nicht verwendet. Bestehende `lg:`-Klassen werden zu `md:` migriert.

### CSS Custom Properties & Safe Areas

- `--viewport-w`, `--viewport-h`: Viewport-Maße in px, gesetzt vom Layout-System via ResizeObserver
- Custom Tailwind-Utilities via `@utility`: `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`, `top-safe`, `bottom-safe` — verwenden `env(safe-area-inset-*)` mit Fallbacks
- Shell-Root setzt `min-height: 100dvh` (dynamic viewport height für Mobile-Browser-Chrome)

### Typografie

- **Outfit** (Google Fonts, 400/500/600/700) als globale Sans-Serif — ersetzt den System-Font-Stack
- **Geist Mono** (bereits als Dependency vorhanden) via `font-mono` für Timer, Prozentwerte, numerische Badges
- Geist Sans wird aus der globalen Nutzung entfernt, Geist Mono verbleibt

### Session-Screen Responsive Layouts

#### Desktop/Tablet (≥480px)
Bestehendes Layout bleibt: absolute HUD-Elemente an den Rändern. Fixe Pixelwerte werden durch `clamp()` ersetzt:
- Tension-Bar: `w-[clamp(160px,20vw,192px)]`
- Abstände: `top-[clamp(8px,2vh,16px)]`, `bottom-[clamp(64px,10vh,80px)]`

#### Phone (<480px) — Bottom-Bar
```
┌──────────────────────┐
│ 🎻 Geige      02:34 │  ← Badge + Timer, top-safe
│                      │
│      [Canvas]        │  ← maximaler Raum
│                      │
├──────────────────────┤
│ ████░ 63%  │ 🎤 🛑  │  ← Bottom-Bar: Tension inline + Controls
└──────────────────────┘
```
- Bottom-Bar: `flex row`, `gap-2`, `p-2`, `pb-safe`
- Mode-Badge und Timer: `top-safe`, kleiner auf Phone
- Calibration: Bottom-Bar expandiert temporär auf ~120px mit Countdown + Text + Fortschrittsbalken (300ms Transition)

### Canvas-Resize bei Orientation-Change

- Canvas wird nur bei Orientation-Wechsel (Portrait ↔ Landscape) neu dimensioniert, nicht bei jedem Pixel-Resize
- `canvas-renderer.ts` erhält zwei neue Parameter: `videoWidth`, `videoHeight`
- Der Renderer berechnet `scaleX = canvas.width / videoWidth` und `scaleY = canvas.height / videoHeight` und transformiert alle Landmark-Koordinaten vor der Übergabe an Sub-Module
- Die einzelnen Rendering-Module (`silhouette`, `target-zone`, `golden-band`, etc.) erhalten bereits transformierte Koordinaten

### Screen-By-Screen Änderungen

| Screen | Änderung |
|--------|----------|
| **Home** | `lg:grid-cols-3` → `md:grid-cols-3`; Staggered-Card-Entrance via CSS `animation-delay` mit `nth-child` |
| **Setup** | Mode-Karten: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` |
| **Session** | Bottom-Bar-Layout auf `<480px`; responsive Touch-Targets (`py-3 min-h-[44px]` auf `<480px`); Safe-Area-Klassen; Calibration-Bar-Expand |
| **Results** | Charts: `flex-col sm:flex-row` (untereinander auf Phone); Chart-Reveal-Animation via Recharts `animationDuration` |

### Animationen

Drei gezielte CSS-Animationen — nichts im Session-rAF-Loop:
1. **Seiten-Übergänge**: Fade + Slide (200ms) bei `goToSetup`/`goToSession`/`goToResults`
2. **Home-Card-Entrance**: Staggered Reveal via `animation-delay: calc(var(--index) * 80ms)` beim Mount
3. **Results-Chart-Reveal**: Recharts `animationDuration={800}` `animationEasing="ease-out"`

### Farbpalette

- Bestehende Tokens bleiben unverändert (kühl, blau-gold)
- NEU: `--surface` Token (`oklch(0.19 0.012 260)`) als Zwischenebene zwischen `--background` und `--card` für Bottom-Bar und abgesetzte Flächen
- Dark Mode: Hard Dark, kein `prefers-color-scheme`, kein Theme-Toggle

### Touch-Targets

- Session-Buttons: `py-2 sm:py-3` — auf Phone größer (≥44px Höhe)
- `min-h-[44px]` auf interaktiven Elementen unter 480px
- Home-Karten und Setup-Radio-Items sind bereits ausreichend groß

### Datei-Struktur (neue Dateien)

- `src/core/layout/layout-system.ts` — `initLayoutSystem()`, reines TS, kein React
- `src/store/layout-store.ts` — Zustand-Store, `LayoutState` Interface

### Typ-Shape (aus Prototyp)

```ts
// src/store/layout-store.ts
interface LayoutState {
  orientation: 'portrait' | 'landscape';
  deviceClass: 'phone' | 'tablet' | 'desktop';
}
```

## Testing Decisions

### Was einen guten Test ausmacht
- Nur extern beobachtbares Verhalten testen, nicht Implementierungsdetails
- State-Übergänge auf Konsistenz prüfen
- Reine Funktionen mit Input/Output-Tests abdecken

### Zu testende Module

1. **`layout-store.ts`** — Unit-Test: Prüft dass `orientation` und `deviceClass` nie inkonsistent sind (z.B. `deviceClass: 'desktop'` kann nicht `orientation: 'portrait'` ausschließen, aber `deviceClass: 'phone'` wird typischerweise `portrait` sein). Testet State-Übergänge.

2. **`canvas-renderer.ts`** — Unit-Test für Koordinaten-Transformation: Bei gegebenen `videoWidth`, `videoHeight`, `canvasWidth`, `canvasHeight` und Landmark x/y werden korrekte `scaleX`/`scaleY` berechnet und Landmark-Koordinaten korrekt transformiert.

### Nicht getestet

- `layout-system.ts`: MatchMedia/ResizeObserver-Mocking in jsdom zu aufwändig für den Ertrag
- `use-pose-detection.ts`: Benötigt MediaPipe, Canvas, Video-Refs — nicht praktikabel als Unit-Test

### Prior Art
- Existierende Tests in `tests/wrist/` testen Core-Analyzer als reine Funktionen
- Tests nutzen Vitest (gleicher Test-Runner)
- Neue Tests werden in `tests/layout/` abgelegt

## Out of Scope

- Light Mode / Theme-Toggle
- System-Schriftgrößen-Respektierung (`rem`-basierte Skalierung über Browser-Einstellungen)
- Horizontale Swipe-Navigation zwischen Screens
- Responsive Anpassungen für Wearables oder TV-Geräte
- i18n / Mehrsprachigkeit
- Accessibility-Audit (Screenreader, Kontrast-Ratios) — folgt in separatem Change
- Calibration-Overlay oder Distance-Indicator auf Desktop anpassen (bleiben unverändert)

## Further Notes

- Die Änderungen sind rein additiv zum bestehenden Canvas-Rendering — keine Änderung an der Analyse-Pipeline oder der Feedback-Logik
- Der Canvas-rAF-Loop (30fps) wird nicht durch CSS-Animationen beeinträchtigt, da Animationen nur außerhalb des Session-Screens stattfinden
- Geist Sans kann aus `package.json` entfernt werden, wenn es nirgends sonst referenziert wird — Geist Mono verbleibt für `font-mono`
- `wrist-side-view.ts` hat bereits eine `width < 768` Heuristik — diese sollte nach dem Change auf den `layoutStore.deviceClass` umgestellt oder entfernt werden (Konsistenz)