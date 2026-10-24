import pg from 'pg'
import { rrfFuse } from './metrics.mjs'

// These values mirror server.mjs so the evaluation measures what the app really does.
export const config = {
  model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  judgeModel: process.env.EVAL_JUDGE_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  rrfK: 60,
  minSimilarity: 0.25,
  candidates: 20,
  answerChunks: 6,
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const keys = () => Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]).filter(Boolean)

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[arg.slice(2)] = true
    else { out[arg.slice(2)] = next; i += 1 }
  }
  return out
}

export function connect() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    console.error('NEON_DATABASE_URL is not set. Run with: node --env-file=.env eval/<script>.mjs')
    process.exit(1)
  }
  return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 })
}

export async function assertSchema(db) {
  const { rows } = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'document_chunks'")
  const columns = new Set(rows.map((row) => row.column_name))
  const missing = ['tsv', 'embedding'].filter((column) => !columns.has(column))
  if (missing.length) {
    console.error(`document_chunks is missing: ${missing.join(', ')}. Start the server once (node --env-file=.env server.mjs) so the migrations run, then try again.`)
    process.exit(1)
  }
  const { rows: pending } = await db.query('SELECT COUNT(*)::int AS n FROM document_chunks WHERE embedding IS NULL')
  if (pending[0].n) console.warn(`Warning: ${pending[0].n} chunk(s) have no embedding yet. Start the server and wait for "Embedded N existing chunk(s)", otherwise vector results will be incomplete.`)
}

let embedder = null
async function getEmbedder() {
  if (!embedder) {
    const { pipeline } = await import('@huggingface/transformers')
    embedder = pipeline('feature-extraction', config.embeddingModel, { dtype: 'q8' })
  }
  return embedder
}

export async function embedQuery(text) {
  const extractor = await getEmbedder()
  const output = await extractor([text], { pooling: 'mean', normalize: true })
  return output.tolist()[0]
}

const toVector = (values) => `[${values.map((value) => Number(value).toFixed(6)).join(',')}]`

/**
 * Runs the three retrieval strategies for one question with a single query embedding:
 * keyword (Postgres full-text), vector (pgvector) and hybrid (RRF over both).
 * Every list contains full chunk rows, best first.
 */
export async function searchAll(db, query, { documentId } = {}) {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 12)
  const embedding = await embedQuery(query)
  const filter = documentId ? ' AND c.document_id = $2' : ''
  const keywordParams = [words.join(' | ')]
  const vectorParams = [toVector(embedding)]
  if (documentId) { keywordParams.push(documentId); vectorParams.push(documentId) }

  const [keyword, vector] = await Promise.all([
    words.length
      ? db.query(`SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name FROM document_chunks c JOIN documents d ON d.id = c.document_id, to_tsquery('english', $1) AS q(tsq) WHERE c.tsv @@ q.tsq${filter} ORDER BY ts_rank_cd(c.tsv, q.tsq) DESC LIMIT ${config.candidates}`, keywordParams).then((result) => result.rows)
      : Promise.resolve([]),
    db.query(`SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name, 1 - (c.embedding <=> $1::vector) AS similarity FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE c.embedding IS NOT NULL${filter} ORDER BY c.embedding <=> $1::vector LIMIT ${config.candidates}`, vectorParams)
      .then((result) => result.rows.filter((row) => Number(row.similarity) >= config.minSimilarity)),
  ])

  const byId = new Map([...keyword, ...vector].map((row) => [String(row.id), row]))
  const hybrid = rrfFuse([keyword.map((row) => row.id), vector.map((row) => row.id)], config.rrfK).map((id) => byId.get(id))
  return { keyword, vector, hybrid }
}

let keyCursor = 0
export async function groqChat(messages, { model = config.model, maxTokens = 1500, temperature = 0.1 } = {}) {
  const available = keys()
  if (!available.length) throw new Error('No GROQ_API_KEY_1..10 found in the environment.')
  let lastError = null
  for (let attempt = 0; attempt < available.length * 2; attempt += 1) {
    const index = (keyCursor + attempt) % available.length
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${available[index]}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
      })
      if (!response.ok) { const error = new Error(`Groq ${response.status}`); error.status = response.status; throw error }
      const payload = await response.json()
      keyCursor = (index + 1) % available.length
      return String(payload.choices?.[0]?.message?.content || '').trim()
    } catch (error) {
      lastError = error
      if (error.status === 429) await sleep(1500)
      else if (error.status && ![401, 403, 500, 502, 503].includes(error.status)) break
    }
  }
  throw lastError
}
