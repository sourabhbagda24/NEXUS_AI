import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import Busboy from 'busboy'
import pg from 'pg'
import { PDFParse } from 'pdf-parse'

const { Pool } = pg
const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const port = Number(process.env.PORT || 3000)
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const keys = () => Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]).filter(Boolean)
const neonUrl = process.env.NEON_DATABASE_URL
const db = neonUrl ? new Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000 }) : null
const sessionCookie = 'nexus_ai_session'
const sessionMaxAge = 60 * 60 * 24 * 30
let keyCursor = 0
let databaseReady = false
let ftsReady = false
let vectorReady = false
const embeddingModel = 'Xenova/all-MiniLM-L6-v2'
const rrfK = 60
const minSimilarity = 0.25
const migrationsDir = join(fileURLToPath(new URL('.', import.meta.url)), 'db/migrations')

const demoDocuments = [
  { id: 'annual-report', name: 'Annual_Report.pdf', type: 'PDF', size: '2.4 MB', status: 'Ready', chunks: 1240, indexed: true, updated: '2 hours ago' },
  { id: 'company-policy', name: 'Company_Policy.pdf', type: 'PDF', size: '1.1 MB', status: 'Ready', chunks: 684, indexed: true, updated: 'Yesterday' },
  { id: 'product-docs', name: 'Product_Documentation.pdf', type: 'PDF', size: '3.8 MB', status: 'Ready', chunks: 2357, indexed: true, updated: 'Yesterday' },
]

const send = (response, status, payload) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(status === 204 ? '' : JSON.stringify(payload))
}

const readJson = async (request) => {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

const scrypt = (password, salt) => new Promise((resolve, reject) => scryptCallback(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey.toString('hex'))))
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254
const hashPassword = async (password) => { const salt = randomBytes(16).toString('hex'); return `scrypt$${salt}$${await scrypt(password, salt)}` }
const verifyPassword = async (password, stored) => {
  const [, salt, expected] = String(stored).split('$')
  if (!salt || !expected) return false
  const actual = await scrypt(password, salt)
  const a = Buffer.from(actual, 'hex'); const b = Buffer.from(expected, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex')
const parseCookies = (request) => Object.fromEntries(String(request.headers.cookie || '').split(';').map((part) => part.trim().split('=' )).filter(([key, value]) => key && value).map(([key, ...value]) => [key, decodeURIComponent(value.join('='))]))
const isPublicHttps = (request) => request.headers['x-forwarded-proto'] === 'https' || !['localhost', '127.0.0.1', '::1'].includes(String(request.headers.host || '').split(':')[0])
const setSessionCookie = (request, response, token) => { const secure = isPublicHttps(request); response.setHeader('set-cookie', `${sessionCookie}=${encodeURIComponent(token)}; Max-Age=${sessionMaxAge}; Path=/; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}${secure ? '; Secure' : ''}`) }
const clearSessionCookie = (request, response) => { const secure = isPublicHttps(request); response.setHeader('set-cookie', `${sessionCookie}=; Max-Age=0; Path=/; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}${secure ? '; Secure' : ''}`) }

async function createSession(request, response, userId) {
  const token = randomBytes(32).toString('base64url')
  await db.query('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'30 days\')', [randomUUID(), userId, hashSessionToken(token)])
  setSessionCookie(request, response, token)
}

async function getSessionUser(request) {
  if (!db || !databaseReady) return null
  const token = parseCookies(request)[sessionCookie]
  if (!token) return null
  const { rows } = await db.query('SELECT u.id, u.email FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW()', [hashSessionToken(token)])
  return rows[0] || null
}

const protectedApi = (pathname) => pathname === '/api/stats' || pathname === '/api/documents' || pathname === '/api/documents/upload' || pathname === '/api/chat' || pathname === '/api/chat/stream' || pathname.startsWith('/api/documents/')

async function runMigration(name) {
  const migration = await readFile(join(migrationsDir, name), 'utf8')
  for (const statement of migration.split(/;\s*(?:\n|$)/).map((item) => item.trim()).filter(Boolean)) await db.query(statement)
}

async function ensureDatabase() {
  if (!db) return
  for (const migrationName of ['001_neon.sql', '002_auth.sql', '005_ownership.sql', '006_query_log.sql']) await runMigration(migrationName)
  databaseReady = true
  try { await runMigration('003_fulltext.sql'); ftsReady = true } catch (error) { console.warn('Full-text index unavailable, falling back to ILIKE matching:', error.message) }
  try { await runMigration('004_vector.sql'); vectorReady = true } catch (error) { console.warn('pgvector unavailable, vector search disabled:', error.message) }
  console.log(`Retrieval mode: ${ftsReady ? 'full-text' : 'ILIKE'} + ${vectorReady ? 'pgvector' : 'no vector'}`)
}

let embedderPromise = null
function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', embeddingModel, { dtype: 'q8' }))
      .catch((error) => { embedderPromise = null; throw error })
  }
  return embedderPromise
}

async function embedTexts(texts) {
  const extractor = await getEmbedder()
  const vectors = []
  for (let index = 0; index < texts.length; index += 16) {
    const output = await extractor(texts.slice(index, index + 16), { pooling: 'mean', normalize: true })
    vectors.push(...output.tolist())
  }
  return vectors
}

const toVectorLiteral = (vector) => `[${vector.map((value) => Number(value).toFixed(6)).join(',')}]`

async function backfillEmbeddings() {
  if (!db || !vectorReady) return
  let total = 0
  for (;;) {
    const { rows } = await db.query('SELECT id, content FROM document_chunks WHERE embedding IS NULL ORDER BY id LIMIT 64')
    if (!rows.length) break
    const vectors = await embedTexts(rows.map((row) => row.content))
    for (let index = 0; index < rows.length; index += 1) await db.query('UPDATE document_chunks SET embedding = $1::vector WHERE id = $2', [toVectorLiteral(vectors[index]), rows[index].id])
    total += rows.length
  }
  if (total) console.log(`Embedded ${total} existing chunk(s).`)
}

const searchLabel = () => !databaseReady ? 'Neon unavailable' : vectorReady ? 'Neon · Hybrid (full-text + pgvector)' : ftsReady ? 'Neon · Full-text index' : 'Neon · Chunk index'

const toDocumentRecord = (row) => ({
  id: row.id,
  name: row.name,
  type: row.mime_type?.includes('pdf') || row.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'MD',
  size: `${Math.max(Number(row.size_bytes) / (1024 * 1024), 0.1).toFixed(1)} MB`,
  status: row.status,
  chunks: Number(row.chunk_count),
  indexed: row.status === 'Ready',
  updated: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : 'just now',
})

function chunkText(text) {
  const pages = text.split(/\f+/).map((page) => page.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const chunks = []
  const chunkSize = 900
  const overlap = 150
  pages.forEach((page, pageIndex) => {
    for (let start = 0; start < page.length; start += chunkSize - overlap) {
      const content = page.slice(start, start + chunkSize).trim()
      if (content.length >= 40) chunks.push({ page: pageIndex + 1, content })
      if (start + chunkSize >= page.length) break
    }
  })
  return chunks
}

function parseUpload(request) {
  return new Promise((resolve, reject) => {
    const contentType = request.headers['content-type'] || ''
    if (!contentType.includes('multipart/form-data')) return reject(new Error('Upload must be multipart/form-data'))
    const busboy = Busboy({ headers: request.headers, limits: { files: 1, fileSize: 25 * 1024 * 1024 } })
    let fileBuffer = Buffer.alloc(0)
    let filename = 'document.pdf'
    let mimeType = 'application/pdf'
    let fileSeen = false
    let tooLarge = false
    busboy.on('file', (_field, stream, info) => {
      fileSeen = true
      filename = info.filename || filename
      mimeType = info.mimeType || mimeType
      stream.on('data', (chunk) => { fileBuffer = Buffer.concat([fileBuffer, chunk]) })
      stream.on('limit', () => { tooLarge = true })
    })
    busboy.on('error', reject)
    busboy.on('finish', () => {
      if (tooLarge) return reject(new Error('File exceeds the 25 MB limit'))
      if (!fileSeen || !fileBuffer.length) return reject(new Error('No document file was uploaded'))
      resolve({ filename, mimeType, buffer: fileBuffer })
    })
    request.pipe(busboy)
  })
}

async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text?.trim() || ''
  } finally {
    await parser.destroy()
  }
}

async function listDocuments(userId) {
  if (!db || !databaseReady) return demoDocuments
  const { rows } = await db.query('SELECT id, name, mime_type, size_bytes, status, chunk_count, updated_at FROM documents WHERE user_id = $1 ORDER BY updated_at DESC', [userId])
  return rows.map(toDocumentRecord)
}

async function indexPdf(userId, filename, mimeType, buffer) {
  if (!db || !databaseReady) throw new Error('Neon database is not configured')
  if (!/\.pdf$/i.test(filename) && mimeType !== 'application/pdf') throw new Error('Only PDF files are supported for Neon indexing')
  const extractedText = await extractPdf(buffer)
  if (extractedText.length < 20) throw new Error('No selectable text was found in this PDF. OCR is required for scanned PDFs.')
  const chunks = chunkText(extractedText)
  if (!chunks.length) throw new Error('The PDF did not produce indexable text chunks')
  let embeddings = null
  if (vectorReady) {
    try { embeddings = await embedTexts(chunks.map((chunk) => chunk.content)) }
    catch (error) { console.warn('Embedding generation failed; indexing this PDF for full-text search only:', error.message) }
  }
  const id = `doc-${randomUUID()}`
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO documents (id, user_id, name, mime_type, size_bytes, status, chunk_count, extracted_text) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, userId, filename, mimeType, buffer.length, 'Ready', chunks.length, extractedText])
    for (let index = 0; index < chunks.length; index += 1) {
      if (embeddings) await client.query('INSERT INTO document_chunks (document_id, chunk_index, page_number, content, embedding) VALUES ($1, $2, $3, $4, $5::vector)', [id, index, chunks[index].page, chunks[index].content, toVectorLiteral(embeddings[index])])
      else await client.query('INSERT INTO document_chunks (document_id, chunk_index, page_number, content) VALUES ($1, $2, $3, $4)', [id, index, chunks[index].page, chunks[index].content])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  const { rows } = await db.query('SELECT id, name, mime_type, size_bytes, status, chunk_count, updated_at FROM documents WHERE id = $1 AND user_id = $2', [id, userId])
  return toDocumentRecord(rows[0])
}

// Every search is limited to the signed-in user's own documents (d.user_id), optionally to one document.
function scopeFilter(params, userId, documentId) {
  params.push(userId)
  let filter = ` AND d.user_id = $${params.length}`
  if (documentId) { params.push(documentId); filter += ` AND c.document_id = $${params.length}` }
  return filter
}

async function keywordSearch(userId, query, documentId) {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].slice(0, 12)
  if (!words.length) return []
  if (ftsReady) {
    const params = [words.join(' | ')]
    const filter = scopeFilter(params, userId, documentId)
    const { rows } = await db.query(`SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name, ts_rank_cd(c.tsv, q.tsq) AS rank FROM document_chunks c JOIN documents d ON d.id = c.document_id, to_tsquery('english', $1) AS q(tsq) WHERE c.tsv @@ q.tsq${filter} ORDER BY rank DESC LIMIT 20`, params)
    return rows
  }
  const params = words.slice(0, 6).map((word) => `%${word}%`)
  const clauses = params.map((_, index) => `c.content ILIKE $${index + 1}`).join(' OR ')
  const filter = scopeFilter(params, userId, documentId)
  const { rows } = await db.query(`SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE (${clauses})${filter} ORDER BY c.id DESC LIMIT 20`, params)
  return rows
}

async function vectorSearch(userId, query, documentId) {
  if (!vectorReady) return []
  const [embedding] = await embedTexts([query])
  const params = [toVectorLiteral(embedding)]
  const filter = scopeFilter(params, userId, documentId)
  const { rows } = await db.query(`SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name, 1 - (c.embedding <=> $1::vector) AS similarity FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE c.embedding IS NOT NULL${filter} ORDER BY c.embedding <=> $1::vector LIMIT 20`, params)
  return rows.filter((row) => Number(row.similarity) >= minSimilarity)
}

// "What is in this PDF?" / "summarize it" contain no searchable content words, so search cannot answer them.
// For those overview-style questions we hand the model the opening chunks of the user's document instead.
const overviewIntent = /(summar|overview|saransh|\bcontents?\b|\binside\b|\babout (this|the|my|it)\b|\b(this|the|my|uploaded|is|iss|ye|yeh|isme|mere|meri|apni) (pdf|document|file|resume|cv|report)\b|\b(pdf|document|file|resume|cv|report) (mein|me|ke)\b|\bwhat is it\b|tell me about it)/i
const genericWords = new Set(['the', 'and', 'what', 'whats', 'this', 'that', 'with', 'from', 'about', 'does', 'have', 'are', 'was', 'for', 'you', 'can', 'please', 'tell', 'give', 'show', 'explain', 'describe', 'pdf', 'document', 'file', 'resume', 'report', 'inside', 'content', 'contents', 'summary', 'summarize', 'summarise', 'overview', 'uploaded', 'main', 'points', 'point', 'topic', 'topics', 'whole', 'entire', 'brief', 'short', 'its', 'mine', 'there', 'here', 'all', 'any', 'kya', 'hai', 'hain', 'mein', 'ka', 'ki', 'ke', 'ko', 'se', 'ye', 'yeh', 'iss', 'isme', 'iske', 'iski', 'batao', 'bata', 'dena', 'dikhao', 'samjhao', 'likha', 'hua', 'hui', 'hota', 'hoti', 'kuch', 'koi', 'mujhe', 'mere', 'mera', 'meri', 'apni', 'apna', 'uska', 'uski', 'uske', 'baare', 'bare', 'saransh'])
const isOverviewQuestion = (query) => {
  if (!overviewIntent.test(query)) return false
  const words = (query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((word) => !genericWords.has(word))
  return words.length <= 1
}

async function overviewChunks(userId, documentId) {
  const target = documentId || (await db.query("SELECT id FROM documents WHERE user_id = $1 AND status = 'Ready' ORDER BY created_at DESC LIMIT 1", [userId])).rows[0]?.id
  if (!target) return []
  const { rows } = await db.query('SELECT c.id, c.document_id, c.page_number, c.content, d.name AS document_name FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE c.document_id = $1 AND d.user_id = $2 ORDER BY c.chunk_index LIMIT 6', [target, userId])
  return rows
}

async function retrieveChunks(userId, query, documentId) {
  if (!db || !databaseReady) return { hits: [], bm25: false, vector: false }
  if (isOverviewQuestion(query)) {
    const rows = await overviewChunks(userId, documentId)
    if (rows.length) return { hits: rows.map((row) => ({ ...row, score: 0.6 })), bm25: false, vector: false }
  }
  const [keywordRows, vectorRows] = await Promise.all([
    keywordSearch(userId, query, documentId).catch((error) => { console.warn('Keyword search failed:', error.message); return null }),
    vectorSearch(userId, query, documentId).catch((error) => { console.warn('Vector search failed:', error.message); return null }),
  ])
  // Reciprocal Rank Fusion: each list contributes 1 / (k + rank)
  const fused = new Map()
  const add = (rows) => (rows || []).forEach((row, index) => {
    const key = String(row.id)
    const entry = fused.get(key) || { ...row, score: 0 }
    entry.score += 1 / (rrfK + index + 1)
    fused.set(key, entry)
  })
  add(keywordRows)
  add(vectorRows)
  const maxScore = 2 / (rrfK + 1)
  const hits = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, 6).map((hit) => ({ ...hit, score: Math.min(hit.score / maxScore, 1) }))
  return { hits, bm25: keywordRows !== null && ftsReady, vector: vectorRows !== null && vectorReady }
}

const sourceFromChunk = (chunk, documentName) => ({ id: String(chunk.id), documentId: chunk.document_id, document: documentName || 'Uploaded PDF', page: Number(chunk.page_number), section: 'Extracted PDF text', content: chunk.content, score: Number(chunk.score || 0.5) })
const demoAnswer = (query) => ({ answer: `I couldn’t find anything relevant in your indexed documents for “${query}”. Try rephrasing the question, or upload a selectable-text PDF that covers it and wait for its status to become Ready.`, sources: [], retrieval: { method: 'hybrid', bm25: true, vector: true, sourceCount: 0, latency: '—' } })
const conversationAnswer = (query) => {
  const normalized = query.trim().toLowerCase().replace(/[!?.,]+$/g, '')
  if (/^(hi|hii|hello|hey|yo|sup|what'?s up)(\s|$)/.test(normalized)) return { answer: 'Hi! I’m Nexus AI. What’s up? You can chat with me normally, or ask me anything about your uploaded PDFs.', sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } }
  if (/^how are you( doing)?( today)?$/.test(normalized)) return { answer: 'I’m doing well and ready to help. Ask me about your documents, or just keep the conversation going.', sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } }
  if (/^(who are you|what are you|what can you do)(\s|$)/.test(normalized)) return { answer: 'I’m Nexus AI, a document intelligence assistant. I can have a normal conversation and answer PDF questions with grounded source citations.', sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } }
  if (/^(thanks|thank you|thx)(\s|$)/.test(normalized)) return { answer: 'You’re welcome. Send me another question whenever you’re ready.', sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } }
  if (/^(bye|goodbye|see you)(\s|$)/.test(normalized)) return { answer: 'See you later. I’ll be here when you need to search your knowledge base again.', sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } }
  const chat = (answer) => ({ answer, sources: [], retrieval: { method: 'conversation', bm25: false, vector: false, sourceCount: 0, latency: 'instant' } })
  if (/^(namaste|namaskar|namaskaar|salam|hlo|helo)(\s|$)/.test(normalized)) return chat('Namaste! Main Nexus AI hu. Apni PDF ke baare mein kuch bhi pucho, English, Hindi ya Hinglish mein.')
  if (/^(kaise ho|kese ho|kya haal hai|kya hal hai)(\s|$)/.test(normalized)) return chat('Main theek hu, shukriya. Batao, apni PDF ke baare mein kya jaanna hai?')
  if (/^(shukriya|dhanyavad|dhanyawad|thanku|thankyou)(\s|$)/.test(normalized)) return chat('Koi baat nahi. Aur kuch puchna ho to batao.')
  if (/^(alvida|chalta hu|chalta hoon|bye bye)(\s|$)/.test(normalized)) return chat('Phir milte hain. Jab bhi PDF ke baare mein kuch puchna ho, main yahin hu.')
  return null
}

// The embedding model and the full-text index are English-only. A question written in Hinglish (Hindi in English
// letters) or Hindi is first rewritten into a short English search query (one small Groq call). The final answer is
// still written in the user's own language.
const hinglishHint = /\b(kya|kyu|kyun|kaise|kese|kaun|kaunsa|konsa|kitna|kitne|kitni|kab|kahan|hai|hain|hoga|hota|hoti|nahi|nhi|mein|mei|ka|ki|ke|ko|se|ye|yeh|woh|iska|iski|iske|uska|uski|uske|isme|usme|mujhe|mera|meri|mere|batao|bata|dikhao|samjhao|likha|wala|wali|wale|saransh)\b|[\u0900-\u0DFF]/i
const needsRewrite = (query) => hinglishHint.test(query)

async function rewriteToEnglishQuery(query) {
  const available = keys()
  if (!available.length) return query
  for (let attempt = 0; attempt < Math.min(available.length, 3); attempt += 1) {
    const index = (keyCursor + attempt) % available.length
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${available[index]}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0, max_tokens: 600, messages: [
        { role: 'system', content: 'Rewrite the user question as one short English search query for finding the answer inside English documents. The question may be in Hinglish (Hindi written in English letters) or in Hindi. Keep names, numbers and technical terms exactly as written. Reply with the query only, with no quotes and no explanation.' },
        { role: 'user', content: query },
      ] }) })
      if (!response.ok) throw new Error(`Groq ${response.status}`)
      const payload = await response.json()
      const rewritten = String(payload.choices?.[0]?.message?.content || '').trim().replace(/^["'“”]+|["'“”]+$/g, '').slice(0, 300)
      return rewritten || query
    } catch (error) {
      if (!/Groq (401|403|429|500|502|503)/.test(String(error))) break
    }
  }
  return query
}

async function groqAnswer(query, retrieval) {
  const sources = retrieval.hits.map((hit) => sourceFromChunk(hit, hit.document_name))
  if (!sources.length) return demoAnswer(query)
  const context = sources.map((source, index) => `[Source ${index + 1}] ${source.document}, page ${source.page}\n${source.content}`).join('\n\n')
  const available = keys()
  if (!available.length) return { answer: sources[0].content, sources, retrieval: { method: 'hybrid', bm25: retrieval.bm25, vector: retrieval.vector, sourceCount: sources.length, latency: 'demo' } }
  let lastError
  for (let attempt = 0; attempt < available.length; attempt += 1) {
    const index = (keyCursor + attempt) % available.length
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${available[index]}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.1, max_tokens: 900, messages: [{ role: 'system', content: 'You are Nexus AI. Answer only from the supplied PDF context. If the context does not contain the answer, say so. Cite sources inline using [Source 1] format and do not invent facts. Reply in the same language and style as the user\'s question (English, Hindi or Hinglish).' }, { role: 'user', content: `Question: ${query}\n\nPDF context:\n${context}` }] }) })
      if (!response.ok) throw new Error(`Groq ${response.status}`)
      const payload = await response.json()
      keyCursor = (index + 1) % available.length
      return { answer: payload.choices?.[0]?.message?.content || sources[0].content, sources, retrieval: { method: 'hybrid', bm25: retrieval.bm25, vector: retrieval.vector, sourceCount: sources.length, latency: 'live' } }
    } catch (error) {
      lastError = error
      if (!/Groq (401|403|429|500|502|503)/.test(String(error))) break
    }
  }
  if (lastError) console.warn('Groq provider unavailable; returning retrieved PDF context:', lastError.message)
  return { answer: sources.map((source) => `${source.content} [${source.document}, p.${source.page}]`).join('\n\n'), sources, retrieval: { method: 'hybrid', bm25: retrieval.bm25, vector: retrieval.vector, sourceCount: sources.length, latency: 'retrieved' } }
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
await ensureDatabase().catch((error) => console.error('Neon database initialization failed:', error.message))
backfillEmbeddings().catch((error) => console.warn('Embedding backfill skipped:', error.message))

createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost')
  try {
    if (url.pathname === '/api/auth/me' && request.method === 'GET') return send(response, 200, { user: await getSessionUser(request) })
    if (url.pathname === '/api/auth/signup' && request.method === 'POST') {
      if (!db || !databaseReady) return send(response, 503, { error: 'Authentication database is unavailable.' })
      const body = await readJson(request); const email = normalizeEmail(body.email); const password = String(body.password || '')
      if (!validEmail(email)) return send(response, 400, { error: 'Enter a valid email address.' })
      if (password.length < 8) return send(response, 400, { error: 'Password must be at least 8 characters.' })
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows.length) return send(response, 409, { error: 'An account with this email already exists.' })
      const id = `user-${randomUUID()}`
      await db.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [id, email, await hashPassword(password)])
      await createSession(request, response, id)
      return send(response, 201, { user: { id, email } })
    }
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      if (!db || !databaseReady) return send(response, 503, { error: 'Authentication database is unavailable.' })
      const body = await readJson(request); const email = normalizeEmail(body.email); const password = String(body.password || '')
      const { rows } = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email])
      if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) return send(response, 401, { error: 'Email or password is incorrect.' })
      await createSession(request, response, rows[0].id)
      return send(response, 200, { user: { id: rows[0].id, email: rows[0].email } })
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = parseCookies(request)[sessionCookie]
      if (db && token) await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)])
      clearSessionCookie(request, response)
      return send(response, 204, {})
    }
    if (url.pathname === '/health') return send(response, 200, { ok: true, service: 'nexus-ai', connected: keys().length > 0, provider: keys().length ? `Groq · ${model}` : 'Groq · Demo adapter', search: searchLabel() })
    if (url.pathname === '/api/health') return send(response, 200, { connected: keys().length > 0, provider: keys().length ? `Groq · ${model}` : 'Groq · Demo adapter', search: searchLabel() })
    let user = null
    if (protectedApi(url.pathname)) {
      user = await getSessionUser(request)
      if (!user) return send(response, 401, { error: 'Authentication required.' })
    }
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (!db || !databaseReady) return send(response, 200, { documents: 0, chunks: 0, questions: 0, avgLatencyMs: 0, groundedRate: 0, live: false })
      const { rows } = await db.query(`SELECT
        (SELECT COUNT(*)::int FROM documents WHERE user_id = $1) AS documents,
        (SELECT COUNT(*)::int FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE d.user_id = $1) AS chunks,
        (SELECT COUNT(*)::int FROM query_log WHERE user_id = $1) AS questions,
        (SELECT COALESCE(AVG(latency_ms) FILTER (WHERE source_count > 0), 0)::int FROM query_log WHERE user_id = $1) AS avg_latency_ms,
        (SELECT COALESCE(AVG((source_count > 0)::int), 0)::float FROM query_log WHERE user_id = $1) AS grounded_rate`, [user.id])
      const row = rows[0]
      return send(response, 200, { documents: row.documents, chunks: row.chunks, questions: row.questions, avgLatencyMs: row.avg_latency_ms, groundedRate: Number(row.grounded_rate), live: true })
    }
    if (url.pathname === '/api/documents' && request.method === 'GET') return send(response, 200, await listDocuments(user.id))
    if (url.pathname === '/api/documents/upload' && request.method === 'POST') {
      const upload = await parseUpload(request)
      return send(response, 201, await indexPdf(user.id, upload.filename, upload.mimeType, upload.buffer))
    }
    if ((url.pathname === '/api/chat' || url.pathname === '/api/chat/stream') && request.method === 'POST') {
      const body = await readJson(request)
      const query = String(body.query || '')
      const smallTalk = conversationAnswer(query)
      if (smallTalk) return send(response, 200, smallTalk)
      const started = Date.now()
      const searchQuery = needsRewrite(query) ? await rewriteToEnglishQuery(query) : query
      const retrieval = await retrieveChunks(user.id, searchQuery, body.documentId)
      const result = await groqAnswer(query, retrieval)
      const elapsed = Date.now() - started
      if (result.retrieval?.method === 'hybrid' && result.sources.length) result.retrieval.latency = `${(elapsed / 1000).toFixed(1)}s`
      await db.query('INSERT INTO query_log (user_id, latency_ms, source_count) VALUES ($1, $2, $3)', [user.id, elapsed, result.sources.length]).catch((error) => console.warn('Could not record question stats:', error.message))
      return send(response, 200, result)
    }
    if (url.pathname.startsWith('/api/documents/') && url.pathname.endsWith('/sources')) {
      const id = url.pathname.split('/')[3]
      if (db && databaseReady) {
        const { rows } = await db.query('SELECT c.id, c.document_id, c.page_number, c.content, 0.5::float AS score, d.name FROM document_chunks c JOIN documents d ON d.id = c.document_id WHERE c.document_id = $1 AND d.user_id = $2 ORDER BY c.chunk_index LIMIT 8', [id, user.id])
        return send(response, 200, { sources: rows.map((row) => sourceFromChunk(row, row.name)) })
      }
      return send(response, 200, { sources: [] })
    }
    if (url.pathname.startsWith('/api/documents/') && request.method === 'DELETE') {
      if (db && databaseReady) await db.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [url.pathname.split('/')[3], user.id])
      return send(response, 204, {})
    }
    const candidate = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname === '/docs' ? 'docs/index.html' : url.pathname.slice(1)))
    const file = candidate.startsWith(root) ? candidate : join(root, 'index.html')
    try { const body = await readFile(file); response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); response.end(body) }
    catch { const body = await readFile(join(root, 'index.html')); response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(body) }
  } catch (error) {
    console.error('Request failed:', error)
    send(response, 500, { error: error instanceof Error ? error.message : 'Request failed' })
  }
}).listen(port, '0.0.0.0', () => console.log(`Nexus AI listening on ${port}`))
