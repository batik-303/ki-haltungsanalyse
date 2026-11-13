import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vite.dev/config/
// basic-ssl nur für den Dev-Server (Handy im WLAN). Im Preview liefert der
// Cloudflare-Tunnel das HTTPS; dann greift Vites Host-Prüfung, deshalb
// sind Tunnel-Adressen in `allowedHosts` eingetragen.
export default defineConfig(({ isPreview }) => ({
  plugins: [react(), tailwindcss(), ...(isPreview ? [] : [basicSsl()])],
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
