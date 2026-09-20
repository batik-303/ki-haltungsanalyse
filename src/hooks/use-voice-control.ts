import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export type VoiceCommandMap = Record<string, () => void>

/**
 * Beobachtbarer Zustand der Spracherkennung fürs UI:
 * - `unsupported`: Browser kennt die Web-Speech-API nicht.
 * - `starting`: Start angefordert, `onstart` noch nicht bestätigt.
 * - `listening`: hört zu (von `onstart` bestätigt).
 * - `error`: gestoppt mit Grund in `error` (z. B. Mikro nicht erlaubt).
 * - `off`: bewusst aus.
 */
export type VoiceStatus = 'off' | 'starting' | 'listening' | 'error' | 'unsupported'

// Use short stems so conjugated forms ("kalibriere", "kalibriert") still match.
// T4 #60: „bereit" ist der sichtbare, primäre Auslöser; „kalibrieren" bleibt nur
// als unsichtbares Synonym in der Voice-Map (kein UI-Text mehr).
const COMMAND_KEYWORDS: Record<string, string[]> = {
  kalibrieren: ['bereit', 'kalibrier', 'calibrat'],
  start: ['start', 'los'],
  stop: ['stop', 'stopp', 'ende'],
  neu: ['neu', 'nochmal', 'erneut'],
  flow: ['flow'],
  analyse: ['analyse', 'analys'],
}

const COMMAND_COOLDOWN_MS = 2000

/**
 * Freundlicher deutscher Grund für einen Erkennungsfehler (kein Rohcode fürs UI).
 * Positive, hilfreiche Sprache — kein Rot, kein Vorwurf (Feedback-Grundsatz).
 */
function humanizeError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofon für diese Seite nicht freigegeben — im Browser erlauben'
    case 'audio-capture':
      return 'Kein Mikrofon gefunden'
    case 'network':
      return 'Spracherkennung braucht Internet'
    default:
      return `Mikro-Hinweis: ${code}`
  }
}

/**
 * Multi-command voice dispatcher — beobachtbar und selbstheilend.
 *
 * Accepts a map of command names to callbacks and matches recognized German
 * speech against keyword groups. Meldet zusätzlich `status`/`error` fürs UI,
 * damit ein stiller Ausfall (Mikro nicht erlaubt, offline, Aussetzer) sichtbar
 * wird — vorher zeigte die UI „aktiv", während die Erkennung längst tot war.
 *
 * @param commandMap - Keys must match COMMAND_KEYWORDS keys (kalibrieren, start, stop, neu)
 * @param active - Whether voice recognition should be active
 */
export function useVoiceCommands(commandMap: VoiceCommandMap, active: boolean) {
  const commandMapRef = useRef(commandMap)
  commandMapRef.current = commandMap

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const activeRef = useRef(false)
  // Epochen-Zähler gegen das Start/Stopp-Rennen: `startListening` ist async
  // (wartet auf die Mikro-Freigabe). Läuft in dieser Wartezeit ein Stopp oder ein
  // zweiter Start (React-StrictMode mountet im Dev doppelt), wird die Epoche
  // erhöht — der veraltete Start-Vorgang erkennt das nach dem `await` und bricht
  // sich selbst ab. So bleibt immer genau EINE lebende Erkennung übrig.
  const epochRef = useRef(0)
  const [status, setStatus] = useState<VoiceStatus>('off')
  const [error, setError] = useState<string | null>(null)

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('[Voice] SpeechRecognition API not available')
      setStatus('unsupported')
      setError('Spracherkennung wird von diesem Browser nicht unterstützt')
      return
    }

    // Bereits am Laufen? Nicht doppelt starten (Chrome wirft sonst InvalidStateError).
    if (activeRef.current && recognitionRef.current) {
      return
    }

    // Diesen Start-Vorgang als den aktuellen markieren.
    const myEpoch = ++epochRef.current
    activeRef.current = true
    setStatus('starting')
    setError(null)

    // Mikro-Freigabe anstoßen (idempotent). Wir blockieren den Start NICHT daran,
    // sondern lassen im Zweifel `onerror` den echten Grund melden.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      console.log('[Voice] Mic permission granted')
    } catch (e) {
      console.warn('[Voice] Mic getUserMedia failed:', e)
      // Nicht abbrechen — evtl. reicht die schon erteilte Kamera+Mikro-Freigabe.
    }

    // Falls zwischenzeitlich deaktiviert oder von einem neueren Start überholt
    // (StrictMode-Doppelmount): diesen veralteten Vorgang lautlos abbrechen.
    if (!activeRef.current || epochRef.current !== myEpoch) {
      return
    }

    const recognition = new (SpeechRecognition as new () => SpeechRecognitionInstance)()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = true

    // Debounce: prevent same command from firing twice (interim + final)
    let lastFiredCommand = ''
    let lastFiredTime = 0

    recognition.onstart = () => {
      console.log('[Voice] 🎤 onstart — listening')
      setStatus('listening')
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Only process results starting from resultIndex (new since last event)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const alt = result?.[0]
        if (!alt) continue
        const text = alt.transcript.toLowerCase().trim()
        const isFinal = result.isFinal

        console.log(`[Voice] ${isFinal ? 'FINAL' : 'interim'}: "${text}" (confidence: ${(alt.confidence * 100).toFixed(0)}%)`)

        for (const [commandName, keywords] of Object.entries(COMMAND_KEYWORDS)) {
          if (keywords.some((kw) => text.includes(kw))) {
            const now = Date.now()
            if (commandName === lastFiredCommand && now - lastFiredTime < COMMAND_COOLDOWN_MS) {
              console.log(`[Voice] Command "${commandName}" cooldown, skipped`)
              continue
            }

            const handler = commandMapRef.current[commandName]
            if (handler) {
              console.log(`[Voice] >>> FIRED command: "${commandName}"`)
              lastFiredCommand = commandName
              lastFiredTime = now
              handler()
              return
            }
          }
        }
      }
    }

    recognition.onerror = (e: { error: string }) => {
      console.warn(`[Voice] Error: ${e.error}`)
      // Aussetzer sind normal — `onend` startet neu, kein Fehlerzustand.
      if (e.error === 'no-speech' || e.error === 'aborted') return

      // Mikro nicht erlaubt / kein Gerät → echter Stopp: sichtbar machen.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        activeRef.current = false
        setStatus('error')
        setError(humanizeError(e.error))
        return
      }

      // Netzwerk o. Ä.: Grund zeigen, aber `onend` versucht weiter neu zu starten.
      setError(humanizeError(e.error))
    }

    recognition.onend = () => {
      if (activeRef.current) {
        // Small delay prevents Chrome from throttling rapid restart cycles
        setTimeout(() => {
          if (activeRef.current) {
            try {
              recognition.start()
            } catch { /* schon gestartet o. Ä. — ignorieren */ }
          }
        }, 300)
      } else {
        setStatus((s) => (s === 'error' ? s : 'off'))
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      console.log('[Voice] start() called — waiting for onstart')
    } catch (e) {
      console.warn('[Voice] Failed to start recognition:', e)
      activeRef.current = false
      recognitionRef.current = null
      setStatus('error')
      setError('Spracherkennung ließ sich nicht starten — Mikro-Knopf tippen')
    }
  }, [])

  const stopListening = useCallback(() => {
    // Epoche erhöhen → ein noch laufender async-Start bricht sich nach dem `await`
    // selbst ab (siehe Epochen-Guard oben), statt eine tote Erkennung zu hinterlassen.
    epochRef.current++
    activeRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setStatus('off')
  }, [])

  // Freihändig: Solange `active`, hört die App von selbst zu — kein Tippen nötig.
  // Der Epochen-Guard in `startListening` macht das trotz StrictMode-Doppelmount
  // sicher (der erste, abgebrochene Start hinterlässt keine tote Erkennung mehr).
  // Beim Deaktivieren/Unmount wird sauber gestoppt.
  useEffect(() => {
    if (active) startListening()
    else stopListening()
    return () => stopListening()
  }, [active, startListening, stopListening])

  return { startListening, stopListening, isListening: () => activeRef.current, status, error }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
