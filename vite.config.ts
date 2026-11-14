import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import path from 'path'
import { deviceLogPlugin } from './scripts/device-log-plugin.ts'

const MEDIAPIPE_DIR = path.resolve(__dirname, 'node_modules/@mediapipe/tasks-vision')
const MEDIAPIPE_VERSION: string = JSON.parse(
  fs.readFileSync(path.join(MEDIAPIPE_DIR, 'package.json'), 'utf8'),
).version

// Nur diese WASM-Dateien braucht der Browser (SIMD + Rückfall ohne SIMD).
const MEDIAPIPE_WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]
const WASM_URL_BASE = `/mediapipe/wasm/${MEDIAPIPE_VERSION}/`

// Liefert die MediaPipe-WASM-Dateien aus node_modules selbst aus:
// im Dev-Server direkt, beim Build als Kopie nach dist/mediapipe/wasm/<version>/.
// So passen WASM und JS-Paket immer zusammen, und keine Anfrage geht an jsDelivr.
function mediapipeWasm(): Plugin {
  return {
    name: 'mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith(WASM_URL_BASE)) return next()
        const file = url.slice(WASM_URL_BASE.length)
        if (!MEDIAPIPE_WASM_FILES.includes(file)) return next()
        res.setHeader(
          'Content-Type',
          file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        )
        fs.createReadStream(path.join(MEDIAPIPE_DIR, 'wasm', file)).pipe(res)
      })
    },
    generateBundle() {
      for (const file of MEDIAPIPE_WASM_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `${WASM_URL_BASE.slice(1)}${file}`,
          source: fs.readFileSync(path.join(MEDIAPIPE_DIR, 'wasm', file)),
        })
      }
    },
  }
}

// https://vite.dev/config/
// basic-ssl nur für den Dev-Server (Handy im WLAN). Im Preview liefert der
// Cloudflare-Tunnel das HTTPS; dann greift Vites Host-Prüfung, deshalb
// sind Tunnel-Adressen in `allowedHosts` eingetragen.
export default defineConfig(({ isPreview }) => ({
  plugins: [react(), tailwindcss(), mediapipeWasm(), ...(isPreview ? [deviceLogPlugin()] : [basicSsl()])],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(MEDIAPIPE_VERSION),
    // Diagnose-Logger nur im Test-Build (VITE_DIAGNOSE=1). Sonst ist der Wert
    // `false` und Vite wirft den Logger beim Build komplett heraus.
    __DIAGNOSE__: JSON.stringify(process.env.VITE_DIAGNOSE === '1'),
  },
  preview: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
