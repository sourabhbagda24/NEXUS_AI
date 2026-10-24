// Builds a synthetic evaluation set from the chunks already stored in your database.
// For each sampled chunk, Groq writes one question + a short reference answer.
// The sampled chunk is the "ground truth" the retriever should find.
//
//   node --env-file=.env eval/generate-dataset.mjs --n 30
//   node --env-file=.env eval/generate-dataset.mjs --n 20 --doc doc-xxxxxxxx
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { connect, assertSchema, parseArgs, groqChat, config, sleep } from './common.mjs'
import { extractJson } from './metrics.mjs'

const args = parseArgs(process.argv.slice(2))
const count = Math.max(1, Number(args.n) || 30)
const output = typeof args.out === 'string' ? args.out : 'eval/dataset.json'
const minLength = 300 // skips the tiny built-in sample documents

const db = connect()
try {
  await assertSchema(db)
  const params = [minLength]
  let filter = ''
  if (typeof args.doc === 'string') { params.push(args.doc); filter = ' AND c.document_id = $2' }
  params.push(count)
  const { rows } = await db.query(`SELECT c.id, c.document_id, d.name AS document_name, c.page_number, c.content FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE length(c.content) >= $1${filter} ORDER BY random() LIMIT $${params.length}`, params)
  if (!rows.length) { console.error('No chunks long enough to sample. Upload a text PDF first (the 3 built-in samples are too short).'); process.exit(1) }
  console.log(`Generating questions for ${rows.length} chunk(s) with ${config.model}...`)

  const items = []
  for (const [index, row] of rows.entries()) {
    const prompt = `Passage:\n"""\n${row.content}\n"""\n\nWrite ONE question that a real user could ask, whose answer is contained in this passage, plus a short reference answer (1-2 sentences) based only on the passage.\nRules:\n- The question must stand on its own: never say "the passage", "this text" or "the document".\n- Paraphrase. Do not copy distinctive phrases or rare words verbatim from the passage.\n- Ask about a concrete fact, number, rule, definition or reason, not "what is this about?".\nReturn only JSON: {"question": "...", "answer": "..."}`
    try {
      const reply = await groqChat([
        { role: 'system', content: 'You write evaluation questions for a document question-answering system. You reply with JSON only.' },
        { role: 'user', content: prompt },
      ])
      const parsed = extractJson(reply)
      if (!parsed?.question || !parsed?.answer) throw new Error('unparseable reply')
      items.push({ id: `q${items.length + 1}`, question: String(parsed.question).trim(), reference: String(parsed.answer).trim(), relevantChunkIds: [String(row.id)], documentId: row.document_id, documentName: row.document_name, page: Number(row.page_number) })
      console.log(`  [${index + 1}/${rows.length}] ${parsed.question}`)
    } catch (error) {
      console.warn(`  [${index + 1}/${rows.length}] skipped (${error.message})`)
    }
    await sleep(300)
  }

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify({ createdAt: new Date().toISOString(), generator: config.model, note: 'Synthetic questions. Chunk ids change if documents are deleted and re-uploaded; regenerate then.', items }, null, 2))
  console.log(`\nSaved ${items.length} question(s) to ${output}. Review it and delete weak questions before running the evaluation.`)
} finally {
  await db.end()
}
