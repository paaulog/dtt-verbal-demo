import { describe, expect, it } from 'vitest'
import { trialsToCsv } from './csv'
import { makeProgram, makeTarget, makeTrial } from './fixtures'
import { mswoRanking } from './mswo'
import { seededRandom, shuffle } from './random'
import { firstSyllable, initialSound } from './text'

describe('texto', () => {
  it('extrai a primeira sílaba aproximada', () => {
    expect(firstSyllable('banana')).toBe('ba')
    expect(firstSyllable('água')).toBe('á')
    expect(firstSyllable('prato')).toBe('pra')
    expect(firstSyllable('')).toBe('')
  })

  it('aproxima o som inicial', () => {
    expect(initialSound('casa')).toBe(initialSound('queijo'))
    expect(initialSound('cebola')).toBe('s')
    expect(initialSound('hora')).toBe('o')
    expect(initialSound('gelo')).toBe('j')
  })
})

describe('MSWO', () => {
  it('ordena pelo percentual de escolhas sobre apresentações', () => {
    const ranking = mswoRanking(['a', 'b', 'c'], [
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
    ])
    expect(ranking.map((r) => r.itemId)).toEqual(['a', 'b', 'c'])
    expect(ranking[0]).toMatchObject({ selected: 2, presented: 2, percent: 100 })
  })

  it('ignora escolhas repetidas na mesma rodada', () => {
    const ranking = mswoRanking(['a', 'b'], [['a', 'a', 'b']])
    expect(ranking.find((r) => r.itemId === 'a')?.selected).toBe(1)
  })
})

describe('CSV', () => {
  it('gera cabeçalho e uma linha por tentativa, com escape', () => {
    const program = makeProgram('tato', { name: 'Tato, comida' })
    const target = makeTarget('a', 'bola')
    const csv = trialsToCsv([makeTrial({ targetId: 'a' }), makeTrial({ targetId: 'a' })], [program], [target])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatch(/^tentativa_id,sessao_id/)
    expect(lines[1]).toContain('"Tato, comida"')
    expect(lines[1]).toContain('bola')
  })
})

describe('aleatório', () => {
  it('é reproduzível com a mesma semente', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom(9))).toEqual(shuffle([1, 2, 3, 4, 5], seededRandom(9)))
  })
})
