let cachedVoice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => voice.lang.toLowerCase() === 'pt-br') ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('pt')) ??
    null
  )
}

export function speechAvailable(): boolean {
  if (cachedVoice === undefined || cachedVoice === null) cachedVoice = pickVoice()
  return cachedVoice !== null
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice()
  })
}

/** Fala o texto com voz pt-BR do aparelho. Sem voz disponível, não faz nada (o texto aparece na tela). */
export function speak(text: string, enabled: boolean, rate = 0.9): void {
  if (!enabled || !text.trim()) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const voice = cachedVoice ?? pickVoice()
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-BR'
  utterance.rate = rate
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}
