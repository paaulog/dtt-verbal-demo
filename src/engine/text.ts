const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Aproximação da primeira sílaba para a dica ecoica parcial ("banana" -> "ba").
 * Pega as consoantes iniciais mais a primeira vogal, preservando acentos.
 */
export function firstSyllable(word: string): string {
  const trimmed = word.trim()
  if (!trimmed) return ''
  const firstWord = trimmed.split(/\s+/)[0]
  const plain = stripAccents(firstWord).toLowerCase()
  for (let index = 0; index < plain.length; index += 1) {
    if (VOWELS.has(plain[index])) {
      return firstWord.slice(0, index + 1)
    }
  }
  return firstWord
}

/**
 * Som inicial aproximado em português, usado para evitar alvos seguidos com o mesmo som.
 * Exemplos: "casa" e "queijo" -> "k"; "cebola" e "sapo" -> "s"; "hora" -> "o".
 */
export function initialSound(word: string): string {
  let plain = stripAccents(word.trim().toLowerCase())
  if (plain.startsWith('h')) plain = plain.slice(1)
  if (!plain) return ''
  const [first, second] = plain
  if (first === 'c') return second === 'e' || second === 'i' ? 's' : 'k'
  if (first === 'q' || first === 'k') return 'k'
  if (first === 'ç' || first === 'z') return first === 'z' ? 'z' : 's'
  if (first === 'g' && (second === 'e' || second === 'i')) return 'j'
  return first
}
