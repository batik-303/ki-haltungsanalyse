// Sucht in einer Ausgabezeile von `cloudflared` die Adresse des Quick Tunnels.
// Die Adresse `api.trycloudflare.com` ist cloudflareds eigener Dienst, kein Tunnel.
const TUNNEL_URL = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/

export function extractTunnelUrl(line: string): string | undefined {
  return TUNNEL_URL.exec(line)?.[0]
}
