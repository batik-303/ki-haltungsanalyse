import { useCallback, useRef } from 'react'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

/**
 * Hook for voice-controlled calibration trigger.
 * Listens for "Start", "Los", or "Speichern" in German.
 */
export function useVoiceControl(onTrigger: () => void) {
  const activeRef = useRef(false)
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  const start = useCallback(() => {
    if (activeRef.current) {
      // Toggle off
      activeRef.current = false
      recognitionRef.current?.stop()
      recognitionRef.current = null
      return false
    }

    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition

    if (!SpeechRecognition) return false

    activeRef.current = true
    const recognition = createRecognition(SpeechRecognition as new () => SpeechRecognitionInstance, onTrigger, activeRef)
    recognitionRef.current = recognition
    recognition.start()
    return true
  }, [onTrigger])

  const stop = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  return { start, stop, isActive: () => activeRef.current }
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

function createRecognition(
  SpeechRecognition: new () => SpeechRecognitionInstance,
  onTrigger: () => void,
  activeRef: React.RefObject<boolean>,
) {
  const recognition = new SpeechRecognition()
  recognition.lang = 'de-DE'
  recognition.continuous = true
  recognition.interimResults = false

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1]
    if (!last?.[0]) return
    const text = last[0].transcript.toLowerCase().trim()
    if (text.includes('start') || text.includes('los') || text.includes('speichern')) {
      onTrigger()
    }
  }

  recognition.onerror = (e: { error: string }) => {
    if (e.error !== 'no-speech') {
      activeRef.current = false
    }
  }

  recognition.onend = () => {
    if (activeRef.current) {
      try { recognition.start() } catch { /* ignore */ }
    }
  }

  return recognition
}
