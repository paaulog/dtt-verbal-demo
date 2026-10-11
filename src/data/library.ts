import { DEFAULT_ASSENT_SIGNALS, defaultProgram } from '../engine/defaults'
import type { Learner, Program, Reinforcer, Target } from '../engine/types'

/**
 * Biblioteca inicial da demo. Os estímulos visuais são emoji do sistema (sem arquivos de
 * terceiros). Nenhum item reproduz conteúdo de protocolos licenciados.
 */

export const LEARNER_ID = 'aprendiz-demo'

export const learner: Learner = {
  id: LEARNER_ID,
  nickname: 'Aprendiz Demo',
  createdAt: 0,
  assentSignals: [...DEFAULT_ASSENT_SIGNALS],
}

interface TargetSeed {
  label: string
  sd?: string
  response?: string
  exemplars: string[]
  item?: string
  baseline?: boolean
}

function makeTargets(programId: string, sd: (label: string) => string, seeds: TargetSeed[]): Target[] {
  return seeds.map((seed, index) => {
    const sdText = seed.sd ?? sd(seed.label)
    const response = seed.response ?? seed.label
    return {
      id: `${programId}-${index + 1}`,
      programId,
      label: seed.label,
      sdText,
      sdSpeech: sdText,
      response,
      acceptedResponses: [response],
      exemplars: seed.exemplars,
      item: seed.item,
      manualState: seed.baseline ? 'linha_de_base' : null,
      externalRef: '',
      createdAt: 0,
    }
  })
}

export function buildLibrary(): { programs: Program[]; targets: Target[] } {
  const ouvinte = defaultProgram('ouvinte-animais', LEARNER_ID, 'Ouvinte: animais', 'ouvinte')
  const tato = defaultProgram('tato-comidas', LEARNER_ID, 'Tato: comidas', 'tato')
  const ecoico = defaultProgram('ecoico-palavras', LEARNER_ID, 'Ecoico: palavras', 'ecoico')
  const intraverbal = defaultProgram('intraverbal-completar', LEARNER_ID, 'Intraverbal: completar frases', 'intraverbal')
  const mando = defaultProgram('mando-itens', LEARNER_ID, 'Mando: itens preferidos', 'mando')

  const targets: Target[] = [
    ...makeTargets(ouvinte.id, (label) => `Mostra o ${label}`, [
      { label: 'cachorro', exemplars: ['🐶', '🐕', '🦮'] },
      { label: 'gato', exemplars: ['🐱', '🐈', '🐈‍⬛'] },
      { label: 'peixe', exemplars: ['🐟', '🐠', '🐡'] },
      { label: 'passarinho', exemplars: ['🐦', '🐤', '🐥'] },
      { label: 'cavalo', exemplars: ['🐴', '🐎', '🏇'] },
      { label: 'porco', exemplars: ['🐷', '🐖', '🐽'] },
      { label: 'sapo', exemplars: ['🐸'], baseline: true },
    ]),
    ...makeTargets(tato.id, () => 'O que é isso?', [
      { label: 'banana', exemplars: ['🍌'] },
      { label: 'maçã', exemplars: ['🍎', '🍏'] },
      { label: 'uva', exemplars: ['🍇'] },
      { label: 'pão', exemplars: ['🍞', '🥖', '🥐'] },
      { label: 'bolo', exemplars: ['🍰', '🎂', '🧁'] },
      { label: 'suco', exemplars: ['🧃', '🥤'], baseline: true },
    ]),
    ...makeTargets(ecoico.id, (label) => `Fala: ${label}`, [
      { label: 'bola', exemplars: ['🔊'] },
      { label: 'mais', exemplars: ['🔊'] },
      { label: 'água', exemplars: ['🔊'] },
      { label: 'tchau', exemplars: ['🔊'] },
      { label: 'carro', exemplars: ['🔊'], baseline: true },
    ]),
    ...makeTargets(intraverbal.id, () => '', [
      { label: 'cachorro faz', sd: 'O cachorro faz…', response: 'au au', exemplars: ['💬'], item: '🐶' },
      { label: 'gato faz', sd: 'O gato faz…', response: 'miau', exemplars: ['💬'], item: '🐱' },
      { label: 'um, dois', sd: 'Um, dois…', response: 'três', exemplars: ['💬'], item: '3️⃣' },
      { label: 'escova os', sd: 'Escova os…', response: 'dentes', exemplars: ['💬'], item: '🦷' },
      { label: 'vaca faz', sd: 'A vaca faz…', response: 'muu', exemplars: ['💬'], item: '🐮', baseline: true },
    ]),
    ...makeTargets(mando.id, () => '', [
      { label: 'bolha', response: 'bolha', exemplars: ['🫧'], item: 'bolhas de sabão' },
      { label: 'bola', response: 'bola', exemplars: ['⚽'], item: 'a bola' },
      { label: 'carrinho', response: 'carro', exemplars: ['🚗'], item: 'o carrinho' },
      { label: 'biscoito', response: 'biscoito', exemplars: ['🍪'], item: 'um pedaço de biscoito' },
      { label: 'música', response: 'música', exemplars: ['🎵'], item: 'a música (toque no aparelho)', baseline: true },
    ]),
  ]

  return { programs: [ouvinte, tato, ecoico, intraverbal, mando], targets }
}

export const reinforcers: Reinforcer[] = [
  { id: 'r1', learnerId: LEARNER_ID, name: 'Bolhas de sabão', kind: 'fisico', rank: 1, active: true },
  { id: 'r2', learnerId: LEARNER_ID, name: 'Animação de estrelas', kind: 'digital', rank: 2, active: true },
  { id: 'r3', learnerId: LEARNER_ID, name: 'Carrinho', kind: 'fisico', rank: 3, active: true },
  { id: 'r4', learnerId: LEARNER_ID, name: 'Música curta', kind: 'digital', rank: 4, active: true },
  { id: 'r5', learnerId: LEARNER_ID, name: 'Cócegas', kind: 'fisico', rank: 5, active: true },
]
