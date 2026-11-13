import { describe, expect, it } from 'vitest'
import { extractTunnelUrl } from '../../scripts/tunnel-url'

describe('extractTunnelUrl – Link aus der cloudflared-Ausgabe', () => {
  it('findet die trycloudflare-Adresse im Kasten von cloudflared', () => {
    const line = '2026-11-13T10:00:00Z INF |  https://ruhige-geige-test.trycloudflare.com                    |'
    expect(extractTunnelUrl(line)).toBe('https://ruhige-geige-test.trycloudflare.com')
  })

  it('liefert undefined für Zeilen ohne Tunnel-Adresse', () => {
    expect(extractTunnelUrl('INF Requesting new quick Tunnel on trycloudflare.com...')).toBeUndefined()
    expect(extractTunnelUrl('INF https://api.trycloudflare.com/tunnel')).toBeUndefined()
  })
})
