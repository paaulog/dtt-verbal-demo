export interface MswoRank {
  itemId: string
  selected: number
  presented: number
  percent: number
}

/**
 * Ranking de avaliação de preferência MSWO (escolha múltipla sem reposição).
 * Cada rodada é a lista de itens na ordem em que foram escolhidos. Um item é contado como
 * apresentado em cada tentativa até ser escolhido. Percentual = escolhas / apresentações.
 */
export function mswoRanking(itemIds: string[], rounds: string[][]): MswoRank[] {
  const stats = new Map(itemIds.map((id) => [id, { selected: 0, presented: 0 }]))
  for (const round of rounds) {
    const remaining = new Set(itemIds)
    for (const chosen of round) {
      if (!remaining.has(chosen)) continue
      for (const id of remaining) stats.get(id)!.presented += 1
      stats.get(chosen)!.selected += 1
      remaining.delete(chosen)
    }
  }
  return itemIds
    .map((itemId) => {
      const { selected, presented } = stats.get(itemId)!
      return {
        itemId,
        selected,
        presented,
        percent: presented === 0 ? 0 : Math.round((selected / presented) * 1000) / 10,
      }
    })
    .sort((a, b) => b.percent - a.percent || b.selected - a.selected)
}
