// Sammelt Diagnose-Einträge und teilt sie in Sendungen (JSON-Listen) auf,
// von denen keine größer als `maxBytes` ist (64 KiB bei fetch keepalive / sendBeacon).

const encoder = new TextEncoder()
const byteLength = (text: string): number => encoder.encode(text).length

export function createLogBatcher(maxBytes: number) {
  let pending: string[] = []

  return {
    add(entry: object): void {
      const json = JSON.stringify(entry)
      // `[` + Eintrag + `]` muss allein in eine Sendung passen, sonst verwerfen.
      if (byteLength(json) + 2 > maxBytes) return
      pending.push(json)
    },

    /** Gibt alle gesammelten Einträge als Sendungen zurück und leert den Puffer. */
    drain(): string[] {
      const bodies: string[] = []
      let current: string[] = []
      let size = 2
      for (const json of pending) {
        const extra = byteLength(json) + (current.length > 0 ? 1 : 0)
        if (size + extra > maxBytes) {
          bodies.push(`[${current.join(',')}]`)
          current = []
          size = 2
        }
        size += byteLength(json) + (current.length > 0 ? 1 : 0)
        current.push(json)
      }
      if (current.length > 0) bodies.push(`[${current.join(',')}]`)
      pending = []
      return bodies
    },
  }
}
