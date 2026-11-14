import { describe, expect, it } from 'vitest'
import type { PluginOption, UserConfig } from 'vite'
import configFn from '../../vite.config'

// Plugin-Namen flach einsammeln (Plugins können verschachtelt sein)
function pluginNames(plugins: PluginOption[] | undefined): string[] {
  const out: string[] = []
  const walk = (p: PluginOption): void => {
    if (Array.isArray(p)) p.forEach(walk)
    else if (p && typeof p === 'object' && 'name' in p) out.push(p.name)
  }
  ;(plugins ?? []).forEach(walk)
  return out
}

function resolve(isPreview: boolean): UserConfig {
  if (typeof configFn !== 'function') throw new Error('vite.config muss eine Funktion exportieren')
  return configFn({ command: 'serve', mode: isPreview ? 'production' : 'development', isPreview }) as UserConfig
}

describe('vite.config – Preview über Cloudflare-Tunnel', () => {
  it('lädt basic-ssl im Dev-Server (Handy im WLAN braucht HTTPS)', () => {
    expect(pluginNames(resolve(false).plugins)).toContain('vite:basic-ssl')
  })

  it('lädt basic-ssl NICHT im Preview, HTTPS liefert der Tunnel', () => {
    expect(pluginNames(resolve(true).plugins)).not.toContain('vite:basic-ssl')
  })

  it('erlaubt im Preview Tunnel-Adressen und alle Netz-Schnittstellen', () => {
    const preview = resolve(true).preview
    expect(preview?.host).toBe(true)
    expect(preview?.allowedHosts).toEqual(['.trycloudflare.com'])
  })
})

describe('vite.config – Diagnose-Logs (#170)', () => {
  const withDiagnose = (value: string | undefined, fn: () => void): void => {
    const before = process.env.VITE_DIAGNOSE
    if (value === undefined) delete process.env.VITE_DIAGNOSE
    else process.env.VITE_DIAGNOSE = value
    try { fn() } finally {
      if (before === undefined) delete process.env.VITE_DIAGNOSE
      else process.env.VITE_DIAGNOSE = before
    }
  }

  it('hängt den Log-Empfänger nur im Preview ein', () => {
    expect(pluginNames(resolve(true).plugins)).toContain('device-log')
    expect(pluginNames(resolve(false).plugins)).not.toContain('device-log')
  })

  it('schaltet den Client-Logger nur mit VITE_DIAGNOSE=1 ein', () => {
    withDiagnose('1', () => expect(resolve(false).define?.__DIAGNOSE__).toBe('true'))
    withDiagnose(undefined, () => expect(resolve(false).define?.__DIAGNOSE__).toBe('false'))
    withDiagnose('0', () => expect(resolve(false).define?.__DIAGNOSE__).toBe('false'))
  })
})
