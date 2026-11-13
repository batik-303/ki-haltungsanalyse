// Startet die Preview-Testumgebung mit einem Befehl:
//   1. Build mit VITE_DIAGNOSE=1 (Diagnose-Logger, siehe docs/spec/stabilisierung.md)
//   2. `vite preview` auf Port 4173
//   3. Cloudflare Quick Tunnel auf http://localhost:4173
// und gibt den HTTPS-Link fürs Gerät aus. Beenden mit Strg+C.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { extractTunnelUrl } from './tunnel-url.ts'

const PORT = 4173

if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error) {
  console.error('cloudflared fehlt. Einmalig installieren: brew install cloudflared')
  process.exit(1)
}

const env = { ...process.env, VITE_DIAGNOSE: '1' }

console.log('Baue die App (VITE_DIAGNOSE=1) …')
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env })
if (build.status !== 0) process.exit(build.status ?? 1)

const children: ChildProcess[] = []
const stopAll = (code: number): void => {
  for (const child of children) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'inherit',
  env,
})
children.push(preview)

const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
children.push(tunnel)

let announced = false
const watchOutput = (chunk: Buffer): void => {
  if (announced) return
  for (const line of chunk.toString().split('\n')) {
    const url = extractTunnelUrl(line)
    if (url) {
      announced = true
      console.log(`\n  Preview-Link fürs Gerät:  ${url}\n  (neu bei jedem Start · Beenden mit Strg+C)\n`)
      return
    }
  }
}
tunnel.stdout?.on('data', watchOutput)
tunnel.stderr?.on('data', watchOutput)

for (const child of children) {
  child.on('exit', (code) => stopAll(code ?? 1))
}
