import { answerForQuery, demoDocuments } from './data'

export type DocumentStatus = 'Uploading' | 'Extracting' | 'Chunking' | 'Generating embeddings' | 'Indexing' | 'Ready' | 'Error'
export type VoiceState = 'Ready' | 'Listening' | 'Thinking' | 'Speaking'

export interface Source {
  id: string
  documentId: string
  document: string
  page: number
  section: string
  content: string
  score: number
}

export interface DocumentRecord {
  id: string
  name: string
  type: 'PDF' | 'DOCX' | 'MD'
  size: string
  status: DocumentStatus
  chunks: number
  indexed: boolean
  updated: string
}

export interface RetrievalMeta {
  method: 'hybrid' | 'conversation'
  bm25: boolean
  vector: boolean
  sourceCount: number
  latency: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  sources?: Source[]
  retrieval?: RetrievalMeta
  isStreaming?: boolean
  feedback?: 'up' | 'down'
}

export interface ChatResponse {
  answer: string
  sources: Source[]
  retrieval: RetrievalMeta
}

export interface UploadProgress {
  status: DocumentStatus
  progress: number
}

export interface DashboardStats {
  documents: number
  chunks: number
  questions: number
  avgLatencyMs: number
  groundedRate: number
  live: boolean
}

export interface NexusService {
  readonly mode: 'demo' | 'backend'
  health(): Promise<{ connected: boolean; provider: string; search: string }>
  listDocuments(): Promise<DocumentRecord[]>
  stats(): Promise<DashboardStats>
  resetDemo(): Promise<DocumentRecord[]>
  uploadDocument(file: File, onProgress?: (progress: UploadProgress) => void): Promise<DocumentRecord>
  deleteDocument(id: string): Promise<void>
  chat(query: string, onToken?: (token: string) => void, signal?: AbortSignal): Promise<ChatResponse>
  openSource(source: Source): Promise<Source>
  startVoiceSession(): Promise<{ sessionId: string; transport: 'webrtc' | 'websocket' | 'demo' }>
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const fileType = (file: File): DocumentRecord['type'] => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'docx') return 'DOCX'
  if (ext === 'md' || ext === 'markdown') return 'MD'
  return 'PDF'
}

class DemoNexusService implements NexusService {
  readonly mode = 'demo' as const
  private documents = [...demoDocuments]

  async health() {
    await wait(120)
    return { connected: false, provider: 'Groq · Demo adapter', search: 'Neon · Sample index' }
  }

  async listDocuments() {
    await wait(120)
    return [...this.documents]
  }

  async stats() {
    await wait(80)
    return { documents: 12, chunks: 4281, questions: 1284, avgLatencyMs: 1200, groundedRate: 0.94, live: false }
  }

  async resetDemo() {
    this.documents = [...demoDocuments]
    await wait(120)
    return [...this.documents]
  }

  async uploadDocument(file: File, onProgress?: (progress: UploadProgress) => void) {
    const steps: Array<[DocumentStatus, number]> = [
      ['Uploading', 18],
      ['Extracting', 35],
      ['Chunking', 52],
      ['Generating embeddings', 72],
      ['Indexing', 90],
      ['Ready', 100],
    ]
    for (const [status, progress] of steps) {
      onProgress?.({ status, progress })
      await wait(status === 'Ready' ? 260 : 360)
    }
    const record: DocumentRecord = {
      id: `upload-${Date.now()}`,
      name: file.name,
      type: fileType(file),
      size: `${Math.max(file.size / (1024 * 1024), 0.1).toFixed(1)} MB`,
      status: 'Ready',
      chunks: Math.max(16, Math.round(file.size / 4200)),
      indexed: true,
      updated: 'just now',
    }
    this.documents = [record, ...this.documents]
    return record
  }

  async deleteDocument(id: string) {
    await wait(150)
    this.documents = this.documents.filter((document) => document.id !== id)
  }

  async chat(query: string, onToken?: (token: string) => void, signal?: AbortSignal) {
    const response = answerForQuery(query, this.documents)
    const words = response.answer.split(' ')
    let built = ''
    for (const word of words) {
      if (signal?.aborted) throw new DOMException('Generation stopped', 'AbortError')
      built += `${built ? ' ' : ''}${word}`
      onToken?.(built)
      await wait(28)
    }
    return response
  }

  async openSource(source: Source) {
    await wait(80)
    return source
  }

  async startVoiceSession() {
    await wait(180)
    return { sessionId: `demo-voice-${Date.now()}`, transport: 'demo' as const }
  }
}

class BackendNexusService implements NexusService {
  readonly mode = 'backend' as const
  private base = (import.meta.env.VITE_NEXUS_AI_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.base}${path}`, init)
    if (!response.ok) throw new Error(`Nexus AI API error ${response.status}`)
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async health() {
    return this.request<{ connected: boolean; provider: string; search: string }>('/api/health')
  }

  listDocuments() {
    return this.request<DocumentRecord[]>('/api/documents')
  }

  async stats() {
    return this.request<DashboardStats>('/api/stats')
  }

  async resetDemo() {
    return this.listDocuments()
  }

  async uploadDocument(file: File, onProgress?: (progress: UploadProgress) => void) {
    onProgress?.({ status: 'Uploading', progress: 10 })
    const form = new FormData()
    form.append('file', file)
    const document = await this.request<DocumentRecord>('/api/documents/upload', { method: 'POST', body: form })
    onProgress?.({ status: document.status, progress: document.indexed ? 100 : 90 })
    return document
  }

  async deleteDocument(id: string) {
    await this.request<void>(`/api/documents/${id}`, { method: 'DELETE' })
  }

  private async streamChat(query: string, onToken?: (token: string) => void, signal?: AbortSignal): Promise<ChatResponse> {
    const response = await fetch(`${this.base}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ query }),
      signal,
    })
    if (!response.ok) throw new Error(`Nexus AI stream error ${response.status}`)
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/event-stream') || !response.body) {
      const result = await response.json() as ChatResponse
      onToken?.(result.answer)
      return result
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let answer = ''
    let sources: Source[] = []
    let retrieval: RetrievalMeta | undefined
    const consumeLine = (line: string) => {
      if (!line.startsWith('data:')) return
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') return
      try {
        const payload = JSON.parse(raw) as Partial<ChatResponse> & { delta?: string }
        if (payload.delta) answer += payload.delta
        if (payload.answer) answer = payload.answer
        if (payload.sources) sources = payload.sources
        if (payload.retrieval) retrieval = payload.retrieval
      } catch {
        answer += raw
      }
      onToken?.(answer)
    }
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      lines.forEach(consumeLine)
      if (done) break
    }
    return { answer, sources, retrieval: retrieval ?? { method: 'hybrid', bm25: true, vector: true, sourceCount: sources.length, latency: '—' } }
  }

  async chat(query: string, onToken?: (token: string) => void, signal?: AbortSignal) {
    try {
      return await this.streamChat(query, onToken, signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      const response = await this.request<ChatResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal,
      })
      onToken?.(response.answer)
      return response
    }
  }

  async openSource(source: Source) {
    try {
      const payload = await this.request<Source[] | { sources: Source[] }>(`/api/documents/${source.documentId}/sources`)
      const sources = Array.isArray(payload) ? payload : payload.sources
      return sources.find((candidate) => candidate.id === source.id) ?? source
    } catch {
      return source
    }
  }

  startVoiceSession() {
    return this.request<{ sessionId: string; transport: 'webrtc' | 'websocket' | 'demo' }>('/api/voice/session', { method: 'POST' })
  }
}

class ResilientNexusService implements NexusService {
  private active: NexusService
  private readonly demo = new DemoNexusService()

  constructor(initial: NexusService) {
    this.active = initial
  }

  get mode() {
    return this.active.mode
  }

  private fallback() {
    this.active = this.demo
    return this.demo
  }

  async health() {
    try {
      return await this.active.health()
    } catch {
      return this.fallback().health()
    }
  }

  async listDocuments() {
    try {
      return await this.active.listDocuments()
    } catch {
      return this.fallback().listDocuments()
    }
  }

  async stats() {
    try {
      return await this.active.stats()
    } catch {
      return this.fallback().stats()
    }
  }

  async resetDemo() {
    return this.fallback().resetDemo()
  }

  async uploadDocument(file: File, onProgress?: (progress: UploadProgress) => void) {
    try {
      return await this.active.uploadDocument(file, onProgress)
    } catch {
      return this.fallback().uploadDocument(file, onProgress)
    }
  }

  async deleteDocument(id: string) {
    try {
      return await this.active.deleteDocument(id)
    } catch {
      return this.fallback().deleteDocument(id)
    }
  }

  async chat(query: string, onToken?: (token: string) => void, signal?: AbortSignal) {
    try {
      return await this.active.chat(query, onToken, signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      return this.fallback().chat(query, onToken, signal)
    }
  }

  async openSource(source: Source) {
    try {
      return await this.active.openSource(source)
    } catch {
      return this.fallback().openSource(source)
    }
  }

  async startVoiceSession() {
    try {
      return await this.active.startVoiceSession()
    } catch {
      return this.fallback().startVoiceSession()
    }
  }
}

const configured = new BackendNexusService()
export const service: NexusService = new ResilientNexusService(configured)