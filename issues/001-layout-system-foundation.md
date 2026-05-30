# 1 — Layout-System Foundation

> **Typ**: AFK | **Eltern-PRD**: PRD-responsive-redesign.md

## What to build

Das Fundament des Responsive-Systems: ein React-freies Layout-Modul, ein schlanker Zustand-Store, und die CSS-Infrastruktur.

- **`layout-store.ts`**: Zustand-Store mit `orientation: 'portrait' | 'landscape'` und `deviceClass: 'phone' | 'tablet' | 'desktop'`
- **`layout-system.ts`**: `initLayoutSystem()` — React-frei, setzt MatchMedia-Listener für Breakpoints (480/1024) und Orientation, befüllt den Store, setzt CSS Custom Properties (`--viewport-w`, `--viewport-h`) auf `:root`, returned Cleanup-Funktion
- **CSS**: Tailwind v4 Breakpoints `sm:480px` / `md:1024px`, Safe-Area-Utilities (`pt-safe`, `pb-safe`, `top-safe`, `bottom-safe`), `--surface` Token, `min-height: 100dvh` auf Root
- **`main.tsx`**: `initLayoutSystem()` vor `createRoot()` aufrufen
- **Tests**: `layout-store` State-Übergänge, `canvas-renderer` Koordinaten-Transformation

## Acceptance criteria

- [x] `layoutStore` enthält `orientation` und `deviceClass`, initialisiert mit aktuellen Werten
- [x] Beim Drehen des Geräts (Portrait↔Landscape) aktualisiert sich der Store innerhalb von 100ms
- [x] Beim Resizen über Breakpoint-Grenzen (480, 1024) aktualisiert sich `deviceClass`
- [x] `initLayoutSystem()` returned eine Cleanup-Funktion, die alle Listener entfernt
- [x] Bei Aufruf von `destroyLayoutSystem()` wird kein Store mehr aktualisiert
- [x] CSS Custom Properties `--viewport-w` und `--viewport-h` sind auf `:root` verfügbar
- [x] Tailwind-Klassen `sm:` und `md:` verwenden 480px/1024px
- [x] Safe-Area-Utilities (`pt-safe`, `pb-safe`, etc.) sind als Tailwind-Klassen nutzbar
- [x] `layout-store.test.ts` prüft Konsistenz von `orientation` + `deviceClass`
- [x] `canvas-renderer` hat einen Test für `scaleX`/`scaleY` Koordinaten-Transformation

## Blocked by

None — can start immediately.