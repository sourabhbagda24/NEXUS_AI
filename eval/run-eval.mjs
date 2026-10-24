// Measures retrieval quality (keyword vs vector vs hybrid) and, optionally, answer quality.
//
//   node --env-file=.env eval/run-eval.mjs                 retrieval metrics only (free, fast)
//   node --env-file=.env eval/run-eval.mjs --judge         also score answers with an LLM judge
//   node --env-file=.env eval/run-eval.mjs --judge --limit 10
import { readFile, writeFile } from 'node:fs/promises'
import { connect, assertSchema, parseArgs, searchAll, groqChat, config, sleep } from './common.mjs'
import { rankOf, summarize, mean, extractJson } from './metrics.mjs'

const args = parseArgs(process.argv.slice(2))
const datasetPath = typeof args.dataset === 'string' ? args.dataset : 'eval/dataset.json'
const resultsPath = typeof args.out === 'string' ? args.out : 'eval/results.json'
const judge = Boolean(args.judge)
const judgeLimit = Math.max(1, Number(args.limit) || 15)
const modes = ['keyword', 'vector', 'hybrid']

const offTopic = [
  'What is the capital of France?', 'How do I bake a chocolate cake?', 'Who won the last football world cup?', 'What is the weather like in Tokyo today?',
  'Explain how photosynthesis works.', 'What is the best programming language for beginners?', 'How tall is Mount Everest?', 'Write me a poem about the ocean.',
]

let dataset
try { dataset = JSON.parse(await readFile(datasetPath, 'utf8')) }
catch { console.error(`Could not read ${datasetPath}. Create it first: node --env-file=.env eval/generate-dataset.mjs --n 30`); process.exit(1) }
const items = (dataset.items || []).filter((item) => item.question && item.relevantChunkIds?.length)
if (!items.length) { console.error('The dataset has no usable questions.'); process.exit(1) }

const pct = (value) => `${(value * 100).toFixed(1)}%`
const pad = (text, width) => String(text).padEnd(width)

const db = connect()
try {
  await assertSchema(db)
  console.log(`Evaluating ${items.length} question(s) against the live database...\n`)

  const ranks = { keyword: [], vector: [], hybrid: [] }
  const misses = []
  const searches = []
  for (const [index, item] of items.entries()) {
    const found = await searchAll(db, item.question)
    searches.push(found)
    for (const mode of modes) ranks[mode].push(rankOf(found[mode].map((row) => row.id), item.relevantChunkIds))
    if (ranks.hybrid[index] === null || ranks.hybrid[index] > 5) misses.push({ id: item.id, question: item.question, hybridRank: ranks.hybrid[index], keywordRank: ranks.keyword[index], vectorRank: ranks.vector[index] })
    process.stdout.write(`\r  retrieved ${index + 1}/${items.length}`)
  }
  console.log('\n')

  const retrieval = Object.fromEntries(modes.map((mode) => [mode, summarize(ranks[mode])]))
  const header = ['Strategy', 'Hit@1', 'Hit@3', 'Hit@5', 'MRR', 'nDCG@5']
  console.log(header.map((cell, i) => pad(cell, i === 0 ? 10 : 9)).join(''))
  for (const mode of modes) {
    const r = retrieval[mode]
    console.log([pad(mode, 10), pad(pct(r['hit@1']), 9), pad(pct(r['hit@3']), 9), pad(pct(r['hit@5']), 9), pad(r.mrr.toFixed(3), 9), pad(r['ndcg@5'].toFixed(3), 9)].join(''))
  }

  // Off-topic questions: the app should find nothing relevant to hand to the LLM.
  const offTopicResults = Object.fromEntries(modes.map((mode) => [mode, 0]))
  for (const question of offTopic) {
    const found = await searchAll(db, question)
    for (const mode of modes) if (found[mode].length === 0) offTopicResults[mode] += 1
  }
  const offTopicRate = Object.fromEntries(modes.map((mode) => [mode, offTopicResults[mode] / offTopic.length]))
  console.log(`\nOff-topic questions correctly returning no chunks (higher is better, ${offTopic.length} questions):`)
  console.log('  ' + modes.map((mode) => `${mode} ${pct(offTopicRate[mode])}`).join('   '))

  if (misses.length) {
    console.log(`\nQuestions where hybrid missed the right chunk in the top 5 (${misses.length}):`)
    for (const miss of misses.slice(0, 5)) console.log(`  - ${miss.question}  [hybrid ${miss.hybridRank ?? 'not found'} | keyword ${miss.keywordRank ?? '-'} | vector ${miss.vectorRank ?? '-'}]`)
  }

  let generation = null
  if (judge) {
    console.log(`\nJudging answer quality on ${Math.min(judgeLimit, items.length)} question(s) (judge model: ${config.judgeModel})...`)
    const scored = []
    for (const [index, item] of items.slice(0, judgeLimit).entries()) {
      try {
        const contexts = searches[index].hybrid.slice(0, config.answerChunks)
        const context = contexts.map((row, i) => `[Source ${i + 1}] ${row.document_name}, page ${row.page_number}\n${row.content}`).join('\n\n')
        const answer = contexts.length
          ? await groqChat([
            { role: 'system', content: 'You are Nexus AI. Answer only from the supplied PDF context. If the context does not contain the answer, say so. Cite sources inline using [Source 1] format and do not invent facts.' },
            { role: 'user', content: `Question: ${item.question}\n\nPDF context:\n${context}` },
          ], { maxTokens: 900 })
          : 'No relevant context was retrieved.'
        const verdictText = await groqChat([
          { role: 'system', content: 'You are a strict evaluator of a retrieval-augmented question answering system. Reply with JSON only.' },
          { role: 'user', content: `QUESTION:\n${item.question}\n\nREFERENCE ANSWER:\n${item.reference}\n\nRETRIEVED CONTEXT:\n${context || '(none)'}\n\nSYSTEM ANSWER:\n${answer}\n\nScore from 1 to 5:\n- faithfulness: every claim in the SYSTEM ANSWER is supported by the RETRIEVED CONTEXT (5 = fully supported, 1 = mostly unsupported or invented).\n- correctness: the SYSTEM ANSWER agrees in substance with the REFERENCE ANSWER (5 = same facts, 1 = wrong or missing).\nReturn only JSON: {"faithfulness": n, "correctness": n, "reason": "one short sentence"}` },
        ], { model: config.judgeModel, maxTokens: 900 })
        const verdict = extractJson(verdictText)
        if (!verdict || !Number.isFinite(Number(verdict.faithfulness)) || !Number.isFinite(Number(verdict.correctness))) throw new Error('judge reply was not valid JSON')
        scored.push({ id: item.id, question: item.question, answer, faithfulness: Number(verdict.faithfulness), correctness: Number(verdict.correctness), reason: String(verdict.reason || '') })
        process.stdout.write(`\r  judged ${scored.length}/${Math.min(judgeLimit, items.length)}`)
      } catch (error) {
        console.warn(`\n  skipped ${item.id}: ${error.message}`)
      }
      await sleep(300)
    }
    console.log('')
    if (scored.length) {
      generation = {
        judged: scored.length,
        judgeModel: config.judgeModel,
        faithfulness: mean(scored.map((s) => s.faithfulness)),
        correctness: mean(scored.map((s) => s.correctness)),
        faithfulAtLeast4: mean(scored.map((s) => (s.faithfulness >= 4 ? 1 : 0))),
        correctAtLeast4: mean(scored.map((s) => (s.correctness >= 4 ? 1 : 0))),
        details: scored,
      }
      console.log(`\nAnswer quality (LLM judge, 1-5):  faithfulness ${generation.faithfulness.toFixed(2)}   correctness ${generation.correctness.toFixed(2)}`)
      console.log(`Share scoring 4 or higher:        faithfulness ${pct(generation.faithfulAtLeast4)}   correctness ${pct(generation.correctAtLeast4)}`)
    }
  }

  await writeFile(resultsPath, JSON.stringify({ ranAt: new Date().toISOString(), questions: items.length, config: { ...config, judgeModel: judge ? config.judgeModel : undefined }, retrieval, offTopic: { questions: offTopic.length, correctlyEmpty: offTopicRate }, generation, hybridMisses: misses }, null, 2))
  console.log(`\nSaved full results to ${resultsPath}`)
} finally {
  await db.end()
}
