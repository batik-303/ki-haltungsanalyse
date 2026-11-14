/**
 * Lebenszyklus für teure Ressourcen eines eingehängten Bildschirms (#192):
 * Modelle (GPU) und Kamera-Stream.
 *
 * Modelle laden asynchron. Wird der Bildschirm abgebaut, bevor das Laden
 * fertig ist, darf die spät fertige Ressource nicht liegen bleiben: `adopt`
 * gibt sie dann sofort frei und liefert `null`. Alles, was vorher übernommen
 * wurde, gibt `dispose` genau einmal frei.
 */
export function createResourceScope() {
  let disposed = false
  const releases: Array<() => void> = []

  function safeRelease(release: () => void) {
    try {
      release()
    } catch {
      // Eine gescheiterte Freigabe darf die übrigen nicht aufhalten.
    }
  }

  return {
    adopt<T>(resource: T, release: (resource: T) => void): T | null {
      if (disposed) {
        safeRelease(() => release(resource))
        return null
      }
      releases.push(() => release(resource))
      return resource
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const release of releases.splice(0)) safeRelease(release)
    },
    isDisposed: () => disposed,
  }
}

export type ResourceScope = ReturnType<typeof createResourceScope>
