import test from 'node:test'
import assert from 'node:assert/strict'
import { rankOf, hitAtK, reciprocalRank, ndcgAtK, rrfFuse, summarize, extractJson, mean } from './metrics.mjs'

test('rankOf finds the first relevant id (string/number safe)', () => {
  assert.equal(rankOf([5, 9, 12], [12]), 3)
  assert.equal(rankOf(['5', '9'], [9]), 2)
  assert.equal(rankOf([1, 2, 3], [99]), null)
  assert.equal(rankOf([], [1]), null)
})

test('hit, reciprocal rank and nDCG', () => {
  assert.equal(hitAtK(3, 3), 1)
  assert.equal(hitAtK(4, 3), 0)
  assert.equal(hitAtK(null, 5), 0)
  assert.equal(reciprocalRank(4), 0.25)
  assert.equal(reciprocalRank(11), 0)
  assert.equal(ndcgAtK(1, 5), 1)
  assert.ok(Math.abs(ndcgAtK(3, 5) - 0.5) < 1e-9)
  assert.equal(ndcgAtK(6, 5), 0)
})

test('rrfFuse rewards items present in both lists', () => {
  const fused = rrfFuse([['a', 'b', 'c'], ['c', 'd', 'a']], 60)
  assert.deepEqual(fused.slice(0, 2).sort(), ['a', 'c'])
  assert.equal(fused.length, 4)
  assert.deepEqual(rrfFuse([['x'], []]), ['x'])
})

test('summarize aggregates ranks', () => {
  const s = summarize([1, 2, null, 6])
  assert.equal(s.questions, 4)
  assert.equal(s['hit@1'], 0.25)
  assert.equal(s['hit@3'], 0.5)
  assert.equal(s['hit@5'], 0.5)
  assert.ok(Math.abs(s.mrr - (1 + 0.5 + 0 + 1 / 6) / 4) < 1e-9)
})

test('extractJson tolerates fences and chatter', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
  assert.deepEqual(extractJson('Sure! {"question":"q","answer":"a"} done'), { question: 'q', answer: 'a' })
  assert.equal(extractJson('no json here'), null)
  assert.equal(extractJson('{broken'), null)
  assert.equal(extractJson(''), null)
})

test('mean of empty list is 0', () => assert.equal(mean([]), 0))
