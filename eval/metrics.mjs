// Pure helper functions (no database, no network) so they can be unit-tested.

/** 1-based rank of the first relevant id in a ranked list, or null if it is not there. */
export function rankOf(rankedIds, relevantIds) {
  const relevant = new Set(relevantIds.map(String))
  const index = rankedIds.findIndex((id) => relevant.has(String(id)))
  return index < 0 ? null : index + 1
}

export const hitAtK = (rank, k) => (rank !== null && rank <= k ? 1 : 0)
export const reciprocalRank = (rank, cutoff = 10) => (rank !== null && rank <= cutoff ? 1 / rank : 0)
// With one relevant chunk per question the ideal DCG is 1, so nDCG@k = 1 / log2(rank + 1).
export const ndcgAtK = (rank, k) => (rank !== null && rank <= k ? 1 / Math.log2(rank + 1) : 0)
export const mean = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

/** Reciprocal Rank Fusion, identical to the formula used in server.mjs: score += 1 / (k + rank). */
export function rrfFuse(lists, k = 60) {
  const scores = new Map()
  for (const list of lists) {
    list.forEach((id, index) => {
      const key = String(id)
      scores.set(key, (scores.get(key) || 0) + 1 / (k + index + 1))
    })
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

/** Aggregate per-question ranks into Hit@k, MRR and nDCG@5. */
export function summarize(ranks, ks = [1, 3, 5]) {
  const result = { questions: ranks.length }
  for (const k of ks) result[`hit@${k}`] = mean(ranks.map((rank) => hitAtK(rank, k)))
  result.mrr = mean(ranks.map((rank) => reciprocalRank(rank)))
  result['ndcg@5'] = mean(ranks.map((rank) => ndcgAtK(rank, 5)))
  return result
}

/** Pull the first JSON object out of an LLM reply (handles code fences and extra prose). */
export function extractJson(text) {
  if (!text) return null
  const cleaned = String(text).replace(/```(?:json)?/gi, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return null }
}
