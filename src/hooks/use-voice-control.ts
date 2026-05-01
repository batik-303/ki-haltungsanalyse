import { useCallback, useEffect, useRef } from 'react'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

export type VoiceCommandMap = Record<string, () => void>

// Use short stems so conjugated forms ("kalibriere", "kalibriert") still match
const COMMAND_KEYWORDS: Record<string, string[]> = {
  kalibrieren: ['kalibrier', 'calibrat'],
  start: ['start', 'los'],
  stop: ['stop', 'stopp', 'ende'],
  neu: ['neu', 'nochmal', 'erneut'],
  flow: ['flow'],
  analyse: ['analyse', 'analys'],
}

const COMMAND_COOLDOWN_MS = 2000

/**
 * Multi-command voice dispatcher.
 * Accepts a map of command names to callbacks.
 * Matches recognized German speech against keyword groups.
 *
 * @param commandMap - Keys must match COMMAND_KEYWORDS keys (kalibrieren, start, stop, neu)
 * @param active - Whether voice recognition should be active
 */
export function useVoiceCommands(commandMap: VoiceCommandMap, active: boolean) {
  const commandMapRef = useRef(commandMap)
  commandMapRef.current = commandMap

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const activeRef = useRef(false)

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('[Voice] SpeechRecognition API not available')
      return
    }

    // Verify microphone permission (should already be granted via camera+audio prompt)
    try {
      const permResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      if (permResult.state === 'denied') {
        console.error('[Voice] Microphone permission denied in browser settings')
        return
      }
      if (permResult.state === 'prompt') {
        // Fallback: request mic if not yet granted
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
      }
      console.log('[Voice] Microphone permission:', permResult.state)
    } catch {
      console.warn('[Voice] Could not check mic permission, attempting start anyway')
    }

    activeRef.current = true
    const recognition = new (SpeechRecognition as new () => SpeechRecognitionInstance)()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = true

    // Debounce: prevent same command from firing twice (interim + final)
    let lastFiredCommand = ''
    let lastFiredTime = 0

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
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        activeRef.current = false
      }
    }

    recognition.onend = () => {
      if (activeRef.current) {
        // Small delay prevents Chrome from throttling rapid restart cycles
        setTimeout(() => {
          if (activeRef.current) {
            try { recognition.start() } catch { /* ignore */ }
          }
        }, 300)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      console.log('[Voice] 🎤 Mic started — listening for commands')
    } catch (e) {
      console.warn('[Voice] Failed to start recognition:', e)
      activeRef.current = false
    }
  }, [])

  const stopListening = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  // Auto-stop when deactivated or unmounted (but never auto-start — needs user gesture)
  useEffect(() => {
    if (!active) stopListening()
    return () => stopListening()
  }, [active, stopListening])

  return { startListening, stopListening, isListening: () => activeRef.current }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
