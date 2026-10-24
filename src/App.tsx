import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Cloud,
  Copy,
  Database,
  FileCode2,
  FileSearch,
  FileText,
  Github,
  Headphones,
  History,
  Layers3,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Loader2,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
  Volume2,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import type { ChatMessage, DashboardStats, DocumentRecord, DocumentStatus, Source, VoiceState } from './services'
import { service } from './services'
import { architectureSteps, capabilities, demoSources, howItWorks } from './data'

type AppRoute = 'landing' | 'docs' | 'login' | 'signup' | 'app'
type AppView = 'overview' | 'documents' | 'ask' | 'settings'
type AuthUser = { id: string; email: string }

const navItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'ask', label: 'Nexus AI', icon: MessageCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const suggestedQuestions = [
  'Summarize this document',
  'What are the key findings?',
  'What does the document say about revenue?',
  'Compare the two sections.',
  'What are the important risks?',
  'Give me the answer with supporting sources.',
]

const initialConversation = {
  id: 'conversation-1',
  title: 'Revenue outlook',
  preview: 'What are the main conclusions in the report?',
  updated: 'Today · 10:42',
  messages: [] as ChatMessage[],
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`} aria-label="Nexus AI">
      <span className="brand-mark__icon"><span /></span>
      {!compact && <span className="brand-mark__type"><strong>Nexus AI</strong><small>Beyond Tech Intelligence</small></span>}
    </div>
  )
}

function IrisRule() {
  return <span className="iris-rule" aria-hidden="true" />
}

function StatusDot({ tone = 'green' }: { tone?: 'green' | 'amber' | 'violet' }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />
}

function IconBadge({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'blue' | 'green' | 'amber' }) {
  return <span className={`icon-badge icon-badge--${tone}`}>{children}</span>
}

function LandingPage({ onEnter }: { onEnter: () => void }) {
  const scrollToArchitecture = () => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="site-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <header className="site-header">
        <a className="site-logo" href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <BrandMark />
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#architecture">Architecture</a>
          <a href="#engineering-proof">Engineering</a>
          <a href="/docs">Docs</a>
        </nav>
        <div className="site-header__actions">
          <a className="site-header__signup" href="/signup">Create account</a><button className="button button--ghost button--small" onClick={scrollToArchitecture}>Explore how it works <ArrowDownIcon /></button>
          <button className="button button--primary button--small" onClick={onEnter}>Try Nexus AI <ArrowUpRight size={15} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-container">
          <div className="hero__content">
            <div className="eyebrow"><IrisRule /> BEYOND TECH INTELLIGENCE <span>·</span> 01 / PRODUCT</div>
            <h1>Your documents.<br /><em>Now intelligent.</em></h1>
            <p className="hero__copy">Nexus AI transforms PDFs, documents, and internal knowledge into an AI assistant you can search, question, and act on.</p>
            <div className="hero__actions">
              <button className="button button--primary button--large" onClick={onEnter}>Try Nexus AI <ArrowUpRight size={17} /></button>
              <button className="button button--outline button--large" onClick={scrollToArchitecture}>Explore how it works <ArrowRight size={17} /></button>
            </div>
            <div className="hero__proof">
              <div><StatusDot /><span>Demo environment ready</span></div>
              <div><span className="proof-number">01</span><span>workspace · knowledge base</span></div>
            </div>
          </div>
          <ProductPreview onEnter={onEnter} />
        </section>

        <section className="signal-strip section-container" aria-label="Product signal">
          <span>RAG + HYBRID SEARCH</span><IrisRule /><span>GROQ AI MODEL</span><IrisRule /><span>VECTOR DATABASE</span><IrisRule /><span>GROUNDED ANSWERS</span>
        </section>

        <section className="section-container section-block" id="product">
          <div className="section-heading">
            <div><div className="eyebrow">02 / CAPABILITIES</div><h2>One knowledge base.<br /><span>Multiple ways to interact.</span></h2></div>
            <p>Nexus AI is a single surface for the questions teams ask, the evidence they need, and the conversations that move work forward.</p>
          </div>
          <div className="capability-grid">
            {capabilities.map((item) => (
              <article className="capability-card" key={item.label}>
                <div className="capability-card__top"><span>{item.label}</span><CapabilityIcon kind={item.icon} /></div>
                <h3>{item.title}</h3><p>{item.copy}</p><span className="card-arrow"><ArrowUpRight size={15} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="section-container architecture-section section-block" id="architecture">
          <div className="section-heading section-heading--wide">
            <div><div className="eyebrow">03 / HOW IT WORKS</div><h2>Every answer should<br /><span>show its work.</span></h2></div>
            <p>Behind the calm interface is a retrieval pipeline designed to keep language models close to the source. See the path from file to grounded answer.</p>
          </div>
          <div className="architecture-flow">
            {architectureSteps.map(([title, copy], index) => (
              <div className="architecture-node" key={title}>
                <span className="architecture-node__number">{String(index + 1).padStart(2, '0')}</span>
                <div className="architecture-node__icon"><ArchitectureIcon index={index} /></div>
                <strong>{title}</strong><small>{copy}</small>
                {index < architectureSteps.length - 1 && <ArrowRight className="architecture-node__connector" size={16} />}
              </div>
            ))}
          </div>
          <div className="architecture-callout"><div><span className="callout-kicker">THE NEXUS AI LOOP</span><strong>Retrieve context before you generate.</strong></div><span>FULL-TEXT <b>+</b> VECTOR <b>→</b> RRF <b>→</b> GROUNDED ANSWER</span></div>
        </section>

        <section className="section-container engineering-proof section-block" id="engineering-proof">
          <div className="section-heading section-heading--wide">
            <div><div className="eyebrow">04 / ENGINEERING PROOF</div><h2>Built like a product,<br /><span>not a prompt demo.</span></h2></div>
            <p>A portfolio-grade system with an explicit data path, secure provider boundary, and product behavior that stays honest when infrastructure is unavailable.</p>
          </div>
          <div className="engineering-proof__layout">
            <div className="engineering-proof__grid">
              <article className="engineering-proof__card"><span className="engineering-proof__number">01</span><div className="engineering-proof__icon"><Database size={18} /></div><h3>Real document ingestion</h3><p>Multipart PDF uploads move through text extraction, overlapping chunk creation, transactional persistence, and searchable retrieval in Neon Postgres.</p><div className="engineering-proof__tags"><span>PDFParse</span><span>Neon</span><span>Chunk store</span></div></article>
              <article className="engineering-proof__card"><span className="engineering-proof__number">02</span><div className="engineering-proof__icon"><ShieldCheck size={18} /></div><h3>Secure model boundary</h3><p>Groq credentials, the Neon connection string, and provider rotation stay server-side. The browser receives answers and citations—not secrets.</p><div className="engineering-proof__tags"><span>FastAPI contract</span><span>3-key rotation</span><span>Server-only</span></div></article>
              <article className="engineering-proof__card"><span className="engineering-proof__number">03</span><div className="engineering-proof__icon"><Search size={18} /></div><h3>Evidence-first answers</h3><p>Each response can expose source documents, pages, retrieved passages, scores, latency, and the retrieval path behind the generated answer.</p><div className="engineering-proof__tags"><span>RAG</span><span>Citations</span><span>Traceable</span></div></article>
              <article className="engineering-proof__card"><span className="engineering-proof__number">04</span><div className="engineering-proof__icon"><Zap size={18} /></div><h3>Production-minded UX</h3><p>Upload progress, empty states, error recovery, health checks, responsive layouts, API fallbacks, and honest demo states make the system usable.</p><div className="engineering-proof__tags"><span>Docker</span><span>Health API</span><span>Responsive</span></div></article>
            </div>
            <aside className="engineering-console"><div className="engineering-console__top"><span><i /> SYSTEM DESIGN</span><code>nexus-ai://build</code></div><div className="engineering-console__line"><span>01</span><strong>Input boundary</strong><em>PDF / 25 MB limit</em></div><div className="engineering-console__line"><span>02</span><strong>Persistence</strong><em>Neon Postgres</em></div><div className="engineering-console__line"><span>03</span><strong>Inference</strong><em>Groq GPT model</em></div><div className="engineering-console__line"><span>04</span><strong>Output contract</strong><em>Answer + sources</em></div><div className="engineering-console__status"><CheckCircle2 size={15} /><span>Every layer has a visible failure state</span></div></aside>
          </div>
        </section>

        <section className="section-container section-block steps-section">
          <div className="eyebrow">05 / THE WORKFLOW</div>
          <div className="steps-list">
            {howItWorks.map(([number, title, copy]) => <div className="step-row" key={number}><span>{number}</span><strong>{title}</strong><p>{copy}</p><ArrowUpRight size={17} /></div>)}
          </div>
        </section>

        <section className="section-container faq-section section-block" aria-labelledby="faq-title">
          <div className="eyebrow">06 / ANSWERS</div><h2 id="faq-title">Questions people ask about <span>Nexus AI.</span></h2>
          <div className="faq-grid">
            <article><h3>What is a RAG knowledge assistant?</h3><p>Retrieval-augmented generation searches relevant document passages first, then gives those passages to a language model as context. Nexus AI uses this path to keep document answers closer to the source.</p></article>
            <article><h3>How does Nexus AI answer PDF questions?</h3><p>Nexus AI extracts selectable PDF text, splits it into overlapping chunks, stores those chunks in Neon Postgres, retrieves matching context, and sends the evidence to the configured Groq model.</p></article>
            <article><h3>Does Nexus AI show where an answer came from?</h3><p>Grounded document answers can include source documents, page references, retrieved passages, scores, and retrieval metadata so users can inspect the evidence behind an answer.</p></article>
            <article><h3>Are uploaded documents required for every message?</h3><p>No. Nexus AI can respond to simple conversational greetings without retrieval. Questions about private document content require an indexed PDF so the answer can be grounded in available evidence.</p></article>
          </div>
        </section>

      </main>

      <footer className="site-footer section-container"><div className="site-footer__brand"><BrandMark /><p>Building intelligent systems<br />for the real world.</p></div><div className="site-footer__links"><div><span>Explore</span><a href="#product">Product</a><a href="#architecture">Architecture</a><a href="#engineering-proof">Engineering</a><a href="/docs">Developer docs</a></div><div><span>Connect</span><a href="#top"><Github size={14} /> GitHub</a><a href="mailto:hello@beyondtechintelligence.com">Contact</a></div></div><div className="site-footer__bottom"><span>© 2026 Beyond Tech Intelligence</span><span>Nexus AI / AI Document Intelligence</span></div></footer>
    </div>
  )
}

function ArrowDownIcon() { return <ChevronDown size={14} /> }

function AuthPage({ mode, onModeChange, onSuccess, onBack }: { mode: 'login' | 'signup'; onModeChange: (mode: 'login' | 'signup') => void; onSuccess: (user: AuthUser) => void; onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isSignup = mode === 'signup'
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setSubmitting(true)
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Authentication failed. Please try again.')
      onSuccess(payload.user)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.') } finally { setSubmitting(false) }
  }
  return <div className="auth-shell"><div className="auth-shell__glow auth-shell__glow--one" /><div className="auth-shell__glow auth-shell__glow--two" /><header className="auth-header"><button className="auth-brand" onClick={onBack}><BrandMark /></button><button className="text-button" onClick={onBack}><ChevronLeft size={14} /> Back to product</button></header><main className="auth-layout"><section className="auth-intro"><span className="eyebrow"><IrisRule /> NEXUS AI / SECURE WORKSPACE</span><h1>Your knowledge,<br /><em>ready when you are.</em></h1><p>Create a workspace account to upload documents, save your knowledge base, and ask Nexus AI grounded questions.</p><div className="auth-points"><span><ShieldCheck size={15} /> Passwords are securely hashed on the backend</span><span><Database size={15} /> Your account is stored in Neon Postgres</span><span><CheckCircle2 size={15} /> Email format is validated before signup</span></div></section><section className="auth-card"><div className="auth-card__heading"><span className="eyebrow">{isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</span><h2>{isSignup ? 'Start with Nexus AI' : 'Sign in to Nexus AI'}</h2><p>{isSignup ? 'Use a valid email and a password with at least 8 characters.' : 'Continue to your document intelligence workspace.'}</p></div><form onSubmit={submit} className="auth-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Your password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : undefined} required /></label>{error && <div className="auth-error"><CircleHelp size={15} /> {error}</div>}<button className="button button--primary button--large auth-submit" type="submit" disabled={submitting}>{submitting ? 'Working…' : isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Nexus AI?'} <button onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></div><small className="auth-legal">By continuing, you agree to use Nexus AI for authorized documents and knowledge.</small></section></main></div>
}

function DocsPage({ onBack, onEnter }: { onBack: () => void; onEnter: () => void }) {
  const endpoints = [['GET', '/api/auth/me', 'Check the current account session.'], ['POST', '/api/auth/signup', 'Create an account with a valid email and password.'], ['POST', '/api/auth/login', 'Start an HttpOnly session.'], ['GET', '/api/documents', 'List indexed PDFs for an authenticated user.'], ['POST', '/api/chat', 'Retrieve context and generate an answer.']]
  const limitations = ['OCR for scanned PDFs', 'Email ownership verification', 'Password reset flow', 'Measured retrieval evaluation', 'Production sitemap until origin is configured']
  return <div className="docs-shell"><header className="docs-header"><button className="auth-brand" onClick={onBack}><BrandMark /></button><nav><a href="#overview">Overview</a><a href="#ingestion">Ingestion</a><a href="#retrieval">Retrieval</a><a href="#api">API</a><a href="#security">Security</a></nav><button className="button button--primary button--small" onClick={onEnter}>Try Nexus AI <ArrowUpRight size={14} /></button></header><main className="docs-main"><div className="docs-breadcrumb"><a href="/" onClick={(event) => { event.preventDefault(); onBack() }}>Nexus AI</a><ChevronRight size={13} /> Documentation</div><section className="docs-hero"><span className="eyebrow">NEXUS AI / DEVELOPER DOCUMENTATION</span><h1>Build a clearer path from<br /><em>documents to answers.</em></h1><p>Nexus AI is a RAG knowledge assistant that extracts selectable PDF text, stores overlapping chunks in Neon Postgres, retrieves relevant context, and uses a server-side Groq model to support source-aware answers.</p><div className="docs-hero__actions"><button className="button button--primary" onClick={onEnter}>Open workspace <ArrowUpRight size={15} /></button><span>Verified against the current implementation</span></div></section><div className="docs-layout"><aside className="docs-toc"><span>ON THIS PAGE</span><a href="#overview">System overview</a><a href="#ingestion">Document ingestion</a><a href="#retrieval">Retrieval and answers</a><a href="#api">API contract</a><a href="#security">Auth and security</a><a href="#limits">Current limitations</a></aside><div className="docs-content"><section id="overview"><span className="eyebrow">01 / SYSTEM OVERVIEW</span><h2>What is Nexus AI?</h2><p>Nexus AI is a document question-answering application. It combines document ingestion, chunk persistence, hybrid retrieval (full-text + vector search), and language-model generation so a user can ask questions about an indexed PDF and inspect the context selected for the response.</p><div className="docs-pipeline"><span>PDF</span><b>→</b><span>Text extraction</span><b>→</b><span>Chunks</span><b>→</b><span>Neon Postgres</span><b>→</b><span>Retrieval</span><b>→</b><span>Groq</span><b>→</b><span>Answer</span></div></section><section id="ingestion"><span className="eyebrow">02 / DOCUMENT INGESTION</span><h2>How does document question answering work?</h2><p>The current upload path accepts selectable-text PDFs up to 25 MB. The backend parses page text, normalizes it, creates overlapping chunks, and writes the document plus chunks in a Neon Postgres transaction. Scanned PDFs without selectable text currently require OCR and are rejected with a clear error.</p><div className="docs-code"><code>POST /api/documents/upload</code><code>multipart/form-data · file=document.pdf</code><code>201 → {'{ id, name, status: "Ready", chunks }'}</code></div></section><section id="retrieval"><span className="eyebrow">03 / RETRIEVAL</span><h2>What is hybrid retrieval?</h2><p>Hybrid retrieval combines exact keyword signals with semantic similarity so technical identifiers and related language can both be discoverable. In the current deployed adapter, persisted chunks are searched with portable keyword matching; the UI and API preserve the retrieval metadata contract for a future vector or RRF implementation.</p><div className="docs-note"><ShieldCheck size={16} /><span>Answer quality depends on the source document, chunking, retrieval results, selected model, and available context. Nexus AI does not guarantee perfect accuracy.</span></div></section><section id="api"><span className="eyebrow">04 / API CONTRACT</span><h2>Which endpoints are available?</h2><div className="docs-endpoints">{endpoints.map(([method, path, copy]) => <div key={path}><b>{method}</b><code>{path}</code><span>{copy}</span></div>)}</div></section><section id="security"><span className="eyebrow">05 / AUTH AND SECURITY</span><h2>How does Nexus AI handle access?</h2><p>Accounts are stored in Neon Postgres. Passwords are salted and hashed with Node’s scrypt implementation; plaintext passwords are never persisted. Session tokens are stored as SHA-256 hashes and delivered through HttpOnly cookies. Groq and Neon credentials remain server-side.</p></section><section id="limits"><span className="eyebrow">06 / LIMITATIONS</span><h2>What is not included yet?</h2><div className="docs-limitations">{limitations.map((item) => <span key={item}>{item}</span>)}</div></section></div></div></main><footer className="docs-footer"><BrandMark /><span>Nexus AI / Beyond Tech Intelligence</span><a href="mailto:hello@beyondtechintelligence.com">Contact</a></footer></div>
}

function ProductPreview({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="product-preview" onClick={onEnter} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onEnter()}>
      <div className="preview-chrome"><div className="preview-dots"><i /><i /><i /></div><span>app.nexus-ai.com / workspace</span><span className="preview-live"><StatusDot /> LIVE DEMO</span></div>
      <div className="preview-body">
        <aside className="preview-sidebar"><BrandMark compact /><span className="preview-sidebar__label">WORKSPACE</span>{['Overview', 'Documents', 'Nexus AI'].map((item, index) => <div className={`preview-side-item ${index === 2 ? 'is-active' : ''}`} key={item}><span className="mini-nav-dot">{index + 1}</span>{item}</div>)}<div className="preview-sidebar__bottom"><StatusDot /> Demo mode</div></aside>
        <div className="preview-content"><div className="preview-topline"><div><span className="preview-kicker">NEXUS AI · GROQ</span><strong>What can I help you find?</strong></div><span className="preview-online"><StatusDot /> AI online</span></div><div className="preview-main-grid"><div className="preview-chat"><div className="preview-chat__bubble"><span className="mini-avatar">D</span><p>Hi, I’m Nexus AI. Ask me anything about your knowledge base.</p></div><div className="preview-chat__bubble preview-chat__bubble--user"><p>What are the key findings?</p></div><div className="preview-answer"><span className="mini-avatar">✦</span><div><b>Grounded answer</b><p>Revenue increased <strong>18%</strong> to $42.6M, primarily driven by enterprise accounts.</p><div className="preview-sources"><span><FileText size={10} /> Annual_Report.pdf · p.12</span><span><FileText size={10} /> +1 source</span></div></div></div><div className="preview-input">Ask Nexus AI about your documents... <Send size={12} /></div></div><div className="preview-voice preview-ai-stack"><span className="preview-kicker">GROQ AI MODEL</span><div className="preview-ai-stack__icon"><Sparkles size={23} /></div><strong>Fast, grounded answers.</strong><small>Powered by a secure backend API</small><div className="mini-wave">{Array.from({ length: 18 }).map((_, index) => <i style={{ height: `${10 + ((index * 11) % 24)}px` }} key={index} />)}</div></div></div></div>
      </div>
    </div>
  )
}

function CapabilityIcon({ kind }: { kind: string }) {
  const common = { size: 16, strokeWidth: 1.6 }
  if (kind === 'search') return <Search {...common} />
  if (kind === 'mic') return <Mic {...common} />
  if (kind === 'layers') return <Layers3 {...common} />
  if (kind === 'quote') return <BookOpen {...common} />
  if (kind === 'terminal') return <SlidersHorizontal {...common} />
  if (kind === 'api') return <Cloud {...common} />
  if (kind === 'shield') return <ShieldCheck {...common} />
  return <Sparkles {...common} />
}

function ArchitectureIcon({ index }: { index: number }) {
  const icons = [FileText, FileSearch, Sparkles, Database, Layers3, Clipboard, Zap, MessageCircle]
  const Icon = icons[index]
  return <Icon size={17} strokeWidth={1.7} />
}

function Workspace({ onExit, user, onLogout }: { onExit: () => void; user: AuthUser; onLogout: () => void }) {
  const [view, setView] = useState<AppView>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [composer, setComposer] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [retrievalOpen, setRetrievalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [health, setHealth] = useState({ connected: false, provider: 'Groq · Demo adapter', search: 'Neon · Sample index' })
  const [conversations, setConversations] = useState([initialConversation])
  const [activeConversation, setActiveConversation] = useState(initialConversation.id)
  const [searchConversations, setSearchConversations] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    service.listDocuments().then(setDocuments).catch(() => setError('The document service is unavailable. Demo Mode remains available with sample data.'))
    service.health().then(setHealth).catch(() => setHealth({ connected: false, provider: 'Groq · Demo adapter', search: 'Neon · Sample index' }))
  }, [])

  // Refresh the dashboard numbers whenever the overview is opened (after uploads, questions or deletes elsewhere).
  useEffect(() => {
    if (view === 'overview') service.stats().then(setStats).catch(() => undefined)
  }, [view])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedSource(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const activeLabel = navItems.find((item) => item.id === view)?.label ?? 'Overview'
  const activeMessages = messages
  const filteredConversations = conversations.filter((conversation) => `${conversation.title} ${conversation.preview}`.toLowerCase().includes(searchConversations.toLowerCase()))

  const selectView = (nextView: AppView) => {
    setView(nextView)
    setSidebarOpen(false)
  }

  const sendMessage = async (value = composer) => {
    const query = value.trim()
    if (!query || generating) return
    setComposer('')
    setError(null)
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: query, createdAt: 'now' }
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', createdAt: 'now', isStreaming: true }
    setMessages((current) => [...current, userMessage, assistantMessage])
    setConversations((current) => current.map((conversation) => conversation.id === activeConversation ? { ...conversation, messages: [...conversation.messages, userMessage, assistantMessage] } : conversation))
    setGenerating(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const result = await service.chat(query, (token) => {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: token } : message))
      }, controller.signal)
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: result.answer, sources: result.sources, retrieval: result.retrieval, isStreaming: false } : message))
      setConversations((current) => current.map((conversation) => conversation.id === activeConversation ? { ...conversation, title: query.slice(0, 28), preview: query, updated: 'just now', messages: conversation.messages.map((message) => message.id === assistantId ? { ...message, content: result.answer, sources: result.sources, retrieval: result.retrieval, isStreaming: false } : message) } : conversation))
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, isStreaming: false, content: message.content || 'Generation stopped.' } : message))
      } else {
        setError('The assistant could not complete that request. Demo Mode is still available — try again or check the backend connection.')
        setMessages((current) => current.filter((message) => message.id !== assistantId))
      }
    } finally {
      setGenerating(false)
      controllerRef.current = null
    }
  }

  const stopGeneration = () => controllerRef.current?.abort()

  const clearConversation = () => {
    stopGeneration()
    setMessages([])
    setError(null)
  }

  const copyAnswer = async (content: string) => {
    try {
      await navigator.clipboard?.writeText(content)
    } catch {
      setError('Copy is unavailable in this browser. Select the answer text manually.')
    }
  }

  const setFeedback = (id: string, feedback: 'up' | 'down') => {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, feedback } : message))
  }

  const regenerateLast = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')
    if (lastUser) void sendMessage(lastUser.content)
  }

  const handleUpload = async (files: File[]) => {
    const maxBytes = 25 * 1024 * 1024
    const rejected = files.filter((file) => !/\.pdf$/i.test(file.name) || file.size > maxBytes)
    const allowed = files.filter((file) => /\.pdf$/i.test(file.name) && file.size <= maxBytes)
    if (rejected.length) setError(`${rejected.length} file${rejected.length > 1 ? 's were' : ' was'} skipped. Use selectable-text PDF files up to 25 MB.`)
    if (!allowed.length) {
      return
    }
    for (const file of allowed) {
      const tempId = `temp-${file.name}-${Date.now()}`
      const tempRecord: DocumentRecord = { id: tempId, name: file.name, type: file.name.toLowerCase().endsWith('.docx') ? 'DOCX' : file.name.toLowerCase().endsWith('.md') ? 'MD' : 'PDF', size: `${Math.max(file.size / (1024 * 1024), 0.1).toFixed(1)} MB`, status: 'Uploading', chunks: 0, indexed: false, updated: 'processing now' }
      setDocuments((current) => [tempRecord, ...current])
      try {
        const record = await service.uploadDocument(file, (progress) => {
          setUploadProgress((current) => ({ ...current, [tempId]: progress.progress }))
          setDocuments((current) => current.map((document) => document.id === tempId ? { ...document, status: progress.status, indexed: progress.status === 'Ready', chunks: progress.status === 'Ready' ? Math.max(16, Math.round(file.size / 4200)) : document.chunks } : document))
        })
        setDocuments((current) => current.map((document) => document.id === tempId ? record : document))
      } catch {
        setDocuments((current) => current.map((document) => document.id === tempId ? { ...document, status: 'Error' } : document))
        setError(`We could not index ${file.name}. Please try again.`)
      }
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleUpload(Array.from(event.target.files))
    event.target.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    void handleUpload(Array.from(event.dataTransfer.files))
  }

  const deleteDocument = async (id: string) => {
    await service.deleteDocument(id)
    setDocuments((current) => current.filter((document) => document.id !== id))
  }

  const resetSamples = async () => {
    setDocuments(await service.resetDemo())
    setError(null)
  }

  const newConversation = () => {
    const next = { id: `conversation-${Date.now()}`, title: 'New conversation', preview: 'Ask a question about your knowledge base', updated: 'just now', messages: [] as ChatMessage[] }
    setConversations((current) => [next, ...current])
    setActiveConversation(next.id)
    setMessages([])
    setView('ask')
  }

  const deleteConversation = (id: string) => {
    setConversations((current) => current.filter((conversation) => conversation.id !== id))
    if (activeConversation === id) { setActiveConversation(''); setMessages([]) }
  }

  const selectConversation = (id: string) => {
    const conversation = conversations.find((item) => item.id === id)
    setActiveConversation(id)
    setMessages(conversation?.messages ?? [])
    setView('ask')
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="app-sidebar__top"><button className="app-brand-button" onClick={() => selectView('overview')}><BrandMark /></button><button className="icon-button app-sidebar__close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="sidebar-workspace"><span className="sidebar-eyebrow">WORKSPACE</span><div className="workspace-switcher"><span className="workspace-avatar">B</span><span><strong>Beyond Tech</strong><small>Product intelligence</small></span><ChevronDown size={15} /></div></div>
        <nav className="app-nav" aria-label="Workspace navigation">
          <span className="sidebar-eyebrow">NAVIGATION</span>
          {navItems.map(({ id, label, icon: Icon }) => <button className={`app-nav__item ${view === id ? 'is-active' : ''}`} key={id} onClick={() => selectView(id)}><Icon size={17} /><span>{label}</span>{id === 'documents' && <span className="nav-count">{documents.length}</span>}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-integrations"><span className="sidebar-eyebrow">CONNECTED LAYERS</span><IntegrationRow icon={<Zap size={14} />} label="AI Engine" value={health.provider} tone="violet" /><IntegrationRow icon={<Database size={14} />} label="Search" value={health.search} tone="blue" /></div>
        <div className="sidebar-profile"><span className="profile-avatar">{user.email.slice(0, 2).toUpperCase()}</span><span><strong>{user.email}</strong><small>Authenticated workspace</small></span></div>
        <button className="sidebar-logout" onClick={onLogout}><LogOut size={15} /> <span>Log out</span></button>
        <button className="sidebar-exit" onClick={onExit}><ChevronLeft size={15} /> Back to product site</button>
      </aside>

      <main className="app-main">
        <header className="app-topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="app-breadcrumb"><span>Nexus AI</span><ChevronRight size={13} /><strong>{activeLabel}</strong></div><div className="app-topbar__actions"><div className="demo-pill"><span className="demo-pill__pulse" /> {health.connected ? 'Backend connected' : 'Demo Mode'}</div><button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button><div className="topbar-avatar">{user.email.slice(0, 2).toUpperCase()}</div></div></header>
        <div className="app-content">
          <div className="app-page-heading"><div><span className="eyebrow">{view === 'overview' ? 'WORKSPACE / 01' : `WORKSPACE / ${String(navItems.findIndex((item) => item.id === view) + 1).padStart(2, '0')}`}</span><h1>{activeLabel}</h1></div><div className="app-page-heading__status"><StatusDot tone={health.connected ? 'green' : 'amber'} /><span>{health.connected ? 'API connected' : 'AI Online'}</span><span className="muted-separator">·</span><span>{health.connected ? 'Live data' : 'Demo data'}</span></div></div>
          {error && <div className="alert-banner"><CircleHelp size={16} /><span>{error}</span><button onClick={() => setError(null)}><X size={15} /></button></div>}
          {view === 'overview' && <OverviewView stats={stats} documents={documents} onNavigate={selectView} onAsk={() => selectView('ask')} />}
          {view === 'documents' && <DocumentsView documents={documents} uploadProgress={uploadProgress} fileRef={fileRef} onDrop={onDrop} onFileChange={onFileChange} onBrowse={() => fileRef.current?.click()} onDelete={deleteDocument} onReset={resetSamples} />}
          {view === 'ask' && <AskView documents={documents} messages={activeMessages} composer={composer} setComposer={setComposer} generating={generating} retrievalOpen={retrievalOpen} setRetrievalOpen={setRetrievalOpen} onSend={sendMessage} onStop={stopGeneration} onClear={clearConversation} onSource={setSelectedSource} onSuggested={(question) => void sendMessage(question)} onAttach={() => fileRef.current?.click()} onSettings={() => selectView('settings')} onCopy={copyAnswer} onFeedback={setFeedback} onRegenerate={regenerateLast} />}
          {view === 'settings' && <SettingsView health={health} />}
        </div>
      </main>
      {selectedSource && <SourceDrawer source={selectedSource} onClose={() => setSelectedSource(null)} />}
      <input ref={fileRef} type="file" hidden accept=".pdf,application/pdf" onChange={onFileChange} />
    </div>
  )
}

function IntegrationRow({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return <div className="integration-row"><IconBadge tone={tone as 'violet' | 'blue'}>{icon}</IconBadge><span><small>{label}</small><strong>{value.split(' · ')[0]}</strong></span><StatusDot tone="green" /></div>
}

function OverviewView({ stats, documents, onNavigate, onAsk }: { stats: DashboardStats | null; documents: DocumentRecord[]; onNavigate: (view: AppView) => void; onAsk: () => void }) {
  return <div className="dashboard-view"><div className="demo-notice"><IconBadge tone="violet"><Sparkles size={15} /></IconBadge><div>{stats?.live ? <><strong>Your Nexus AI workspace</strong><p>The numbers below are live: they count your own PDFs and the questions you have asked.</p></> : <><strong>You’re exploring Nexus AI</strong><p>Sample documents and grounded responses are loaded. Connect the secure Groq backend to use your own knowledge base.</p></>}</div><button className="button button--subtle button--small" onClick={() => onNavigate('settings')}>View AI settings <ArrowUpRight size={14} /></button></div><div className="metrics-grid"><MetricCard label="Documents" value={String(stats?.documents ?? 12)} detail={stats?.live ? 'your uploaded PDFs' : 'demo / sample library'} icon={<FileText size={16} />} /><MetricCard label="Indexed chunks" value={(stats?.chunks ?? 4281).toLocaleString()} detail={stats?.live ? 'searchable text passages' : 'demo / hybrid-ready'} icon={<Layers3 size={16} />} /><MetricCard label="Questions answered" value={(stats?.questions ?? 1284).toLocaleString()} detail={stats?.live ? 'asked in your workspace' : 'demo activity'} icon={<MessageCircle size={16} />} /><MetricCard label="Avg. response" value={stats?.live ? (stats.avgLatencyMs ? `${(stats.avgLatencyMs / 1000).toFixed(1)}s` : '—') : '1.2s'} detail="retrieval + generation" icon={<Zap size={16} />} /><MetricCard label={stats?.live ? 'Answers with sources' : 'Retrieval accuracy'} value={stats?.live ? (stats.questions ? `${Math.round(stats.groundedRate * 100)}%` : '—') : '94%'} detail={stats?.live ? 'questions that found sources' : 'sample benchmark'} icon={<BarChart3 size={16} />} /></div><div className="overview-grid"><section className="panel overview-focus"><div className="panel-heading"><div><span className="eyebrow">NEXUS AI · GROQ</span><h2>Ask your documents</h2></div><button className="text-button" onClick={onAsk}>Open Nexus AI <ArrowRight size={14} /></button></div><div className="overview-ai-copy"><strong>Upload a PDF, then ask a question.</strong><p>Answers appear in the Nexus AI tab with the source passages used to generate them.</p></div><div className="focus-input" onClick={onAsk}>Ask Nexus AI about your documents... <Send size={14} /></div></section><section className="panel overview-voice"><div className="panel-heading"><div><span className="eyebrow">GROQ AI MODEL</span><h2>Fast, grounded answers</h2></div><IconBadge tone="violet"><Sparkles size={16} /></IconBadge></div><div className="overview-ai-copy"><strong>One focused chatbot for your knowledge base.</strong><p>Secure backend inference, source citations, and retrieval details in one calm workspace.</p></div><button className="button button--outline button--small button--full" onClick={onAsk}>Ask Nexus AI <MessageCircle size={14} /></button></section></div><section className="panel overview-documents"><div className="panel-heading"><div><span className="eyebrow">KNOWLEDGE BASE</span><h2>Recent documents</h2></div><button className="text-button" onClick={() => onNavigate('documents')}>Manage documents <ArrowRight size={14} /></button></div><div className="recent-docs">{documents.slice(0, 3).map((document) => <DocumentRow key={document.id} document={document} compact />)}</div></section></div>
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <div className="metric-card"><div className="metric-card__top"><span>{label}</span><IconBadge tone="violet">{icon}</IconBadge></div><strong>{value}</strong><small>{detail}</small></div>
}

function DocumentsView({ documents, uploadProgress, fileRef, onDrop, onFileChange, onBrowse, onDelete, onReset }: { documents: DocumentRecord[]; uploadProgress: Record<string, number>; fileRef: React.RefObject<HTMLInputElement | null>; onDrop: (event: DragEvent<HTMLDivElement>) => void; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onBrowse: () => void; onDelete: (id: string) => void; onReset: () => void }) {
  return <div className="documents-view"><section className="panel upload-panel"><div><span className="eyebrow">KNOWLEDGE INGESTION</span><h2>Upload your knowledge</h2><p>Drop a selectable-text PDF your team already trusts. Nexus AI extracts, chunks, stores, and retrieves it for grounded answers.</p></div><div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={onBrowse} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onBrowse()}><div className="upload-zone__icon"><UploadCloud size={22} /></div><strong>Drop a PDF here or browse files</strong><span>Selectable PDF <b>·</b> up to 25 MB</span><input ref={fileRef} type="file" hidden accept=".pdf,application/pdf" multiple onChange={onFileChange} /></div></section><section className="panel document-library"><div className="panel-heading"><div><span className="eyebrow">INDEXED LIBRARY</span><h2>{documents.length} documents</h2></div><div className="library-actions"><span className="library-filter"><Search size={14} /> All documents</span><button className="button button--subtle button--small" onClick={onReset}><History size={14} /> Reset samples</button><button className="button button--primary button--small" onClick={onBrowse}><Plus size={14} /> Add document</button></div></div><div className="document-list">{documents.length ? documents.map((document) => <DocumentRow key={document.id} document={document} upload={uploadProgress[document.id]} onDelete={() => onDelete(document.id)} />) : <EmptyState icon={<FileText size={20} />} title="Your library is empty" copy="Upload a selectable-text PDF to start building your knowledge base." />}</div></section></div>
}

function DocumentRow({ document, upload, onDelete, compact = false }: { document: DocumentRecord; upload?: number; onDelete?: () => void; compact?: boolean }) {
  const isReady = document.status === 'Ready'
  return <div className={`document-row ${compact ? 'document-row--compact' : ''}`}><div className={`file-icon file-icon--${document.type.toLowerCase()}`}>{document.type === 'MD' ? <FileCode2 size={17} /> : <FileText size={17} />}</div><div className="document-row__name"><strong>{document.name}</strong><span>{document.type} · {document.size}</span></div>{!compact && <div className="document-row__status"><span className={`processing-status ${isReady ? 'is-ready' : document.status === 'Error' ? 'is-error' : 'is-processing'}`}>{isReady ? <Check size={13} /> : document.status === 'Error' ? <X size={13} /> : <Loader2 className="spin" size={13} />}{document.status}</span>{upload !== undefined && !isReady && <div className="upload-progress"><i style={{ width: `${upload}%` }} /></div>}</div>}{!compact && <span className="document-row__chunks">{document.chunks ? `${document.chunks.toLocaleString()} chunks` : '—'}</span>}<span className={`indexed-state ${isReady ? 'is-ready' : ''}`}>{isReady ? <><CheckCircle2 size={14} /> Indexed</> : 'Processing'}</span>{!compact && onDelete && <button className="icon-button icon-button--danger" onClick={onDelete} aria-label={`Delete ${document.name}`}><Trash2 size={15} /></button>}</div>
}

function AskView({ documents, messages, composer, setComposer, generating, retrievalOpen, setRetrievalOpen, onSend, onStop, onClear, onSource, onSuggested, onAttach, onSettings, onCopy, onFeedback, onRegenerate }: { documents: DocumentRecord[]; messages: ChatMessage[]; composer: string; setComposer: (value: string) => void; generating: boolean; retrievalOpen: boolean; setRetrievalOpen: (value: boolean) => void; onSend: (value?: string) => void; onStop: () => void; onClear: () => void; onSource: (source: Source) => void; onSuggested: (question: string) => void; onAttach: () => void; onSettings: () => void; onCopy: (content: string) => void; onFeedback: (id: string, feedback: 'up' | 'down') => void; onRegenerate: () => void }) {
  const onSubmit = (event: FormEvent) => { event.preventDefault(); onSend() }
  const onComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!generating && composer.trim()) onSend() } }
  return <div className="assistant-layout"><section className="panel assistant-panel"><div className="assistant-header"><div className="assistant-header__identity"><div className="assistant-avatar"><Sparkles size={18} /></div><div><div className="assistant-title-row"><h2>Nexus AI</h2><span className="status-badge"><StatusDot /> Groq AI Online</span></div><p>Ask questions about your uploaded knowledge. Nexus AI retrieves relevant information and generates grounded answers.</p></div></div><div className="assistant-header__actions"><button className="icon-button" onClick={onClear} aria-label="Clear conversation"><Trash2 size={16} /></button><button className="icon-button"><MoreHorizontal size={17} /></button></div></div><div className="chat-scroll"><div className="chat-context"><span><Database size={13} /> {documents.length} documents indexed</span><span><Sparkles size={13} /> Groq AI · grounded mode</span></div>{messages.length === 0 ? <WelcomeState onSuggested={onSuggested} /> : <div className="message-stack">{messages.map((message) => <MessageBubble key={message.id} message={message} onSource={onSource} onCopy={onCopy} onFeedback={onFeedback} onRegenerate={onRegenerate} />)}{generating && <div className="thinking-indicator"><span className="mini-avatar"><Sparkles size={12} /></span><span>Retrieving context</span><i /><i /><i /></div>}</div>}</div><div className="assistant-composer-wrap"><form className="assistant-composer" onSubmit={onSubmit}><div className="composer-top"><textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask Nexus AI about your documents..." rows={2} disabled={generating} /><div className="composer-actions"><button type="button" className="composer-tool" onClick={onAttach} aria-label="Attach document"><Paperclip size={16} /></button><span className="composer-hint">Enter to send · Shift + Enter for new line</span>{generating ? <button type="button" className="send-button send-button--stop" onClick={onStop} aria-label="Stop generation"><Square size={14} fill="currentColor" /></button> : <button type="submit" className="send-button" disabled={!composer.trim()} aria-label="Send question"><Send size={15} /></button>}</div></div></form><div className="composer-footer"><span><ShieldCheck size={13} /> Answers are grounded in your indexed sources</span><span>Groq AI · <button className="composer-settings-link" onClick={onSettings}>Configure backend</button></span></div></div></section><aside className="assistant-rail"><RetrievalSummary open={retrievalOpen} onToggle={() => setRetrievalOpen(!retrievalOpen)} /></aside></div>
}

function WelcomeState({ onSuggested }: { onSuggested: (question: string) => void }) {
  return <div className="welcome-state"><div className="welcome-state__orb"><div><Sparkles size={22} /></div></div><span className="eyebrow">NEXUS AI / KNOWLEDGE ASSISTANT</span><h3>Hi, I’m Nexus AI.</h3><p>Upload a document and ask me anything about its contents. Every answer comes with the source context behind it.</p><div className="suggested-grid">{suggestedQuestions.map((question) => <button key={question} onClick={() => onSuggested(question)}>{question}<ArrowUpRight size={13} /></button>)}</div></div>
}

function MessageBubble({ message, onSource, onCopy, onFeedback, onRegenerate }: { message: ChatMessage; onSource: (source: Source) => void; onCopy: (content: string) => void; onFeedback: (id: string, feedback: 'up' | 'down') => void; onRegenerate: () => void }) {
  const isUser = message.role === 'user'
  return <div className={`message-row message-row--${message.role}`}><div className={`message-avatar ${isUser ? 'message-avatar--user' : ''}`}>{isUser ? 'BT' : <Sparkles size={14} />}</div><div className="message-content"><span className="message-role">{isUser ? 'You' : 'Nexus AI'} <small>{message.createdAt}</small></span><div className="message-text">{message.isStreaming && !message.content ? <span className="inline-loading"><Loader2 className="spin" size={14} /> Searching your knowledge base…</span> : renderAnswer(message.content)}</div>{!isUser && message.sources?.length ? <><div className="source-chips source-chips--stacked">{message.sources.map((source) => <button key={source.id} onClick={() => onSource(source)}><FileText size={12} /><span>{source.document}</span><small>p. {source.page}</small><ArrowUpRight size={12} /></button>)}</div>{message.retrieval && <div className="retrieval-meta"><span><Layers3 size={12} /> Hybrid Retrieval</span><span>{message.retrieval.bm25 && message.retrieval.vector ? 'Full-text + Vector' : message.retrieval.vector ? 'Vector' : 'Full-text'}</span><span>{message.retrieval.sourceCount} sources</span><span>{message.retrieval.latency}</span><button aria-label="Copy answer" onClick={() => onCopy(message.content)}><Copy size={12} /></button><button aria-label="Regenerate answer" onClick={onRegenerate}><History size={12} /></button><button className={message.feedback === 'up' ? 'is-selected' : ''} aria-label="Good answer" onClick={() => onFeedback(message.id, 'up')}>↑</button><button className={message.feedback === 'down' ? 'is-selected' : ''} aria-label="Bad answer" onClick={() => onFeedback(message.id, 'down')}>↓</button></div>}</> : null}</div></div>
}

function renderAnswer(content: string) {
  if (!content) return null
  return content.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => segment.startsWith('**') && segment.endsWith('**') ? <strong key={index}>{segment.slice(2, -2)}</strong> : <span key={index}>{segment}</span>)
}

function VoicePanel() {
  const [state, setState] = useState<VoiceState>('Ready')
  const [notice, setNotice] = useState('Click to start talking')
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle')

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const toggleVoice = async () => {
    if (state !== 'Ready') {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (timerRef.current) window.clearTimeout(timerRef.current)
      setState('Ready')
      setNotice('Click to start talking')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('denied')
      setNotice('Microphone access is not supported in this browser.')
      return
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const session = await service.startVoiceSession()
      setPermission('granted')
      setState('Listening')
      setNotice(session.transport === 'demo' ? 'Listening… demo transport ready' : `Listening… ${session.transport} transport ready`)
      if (session.transport === 'demo') {
        timerRef.current = window.setTimeout(() => {
          setState('Thinking')
          setNotice('Searching your documents… no audio is played in Demo Mode')
          timerRef.current = window.setTimeout(() => {
            setState('Speaking')
            setNotice('Grounded response ready · connect TTS for live audio')
            timerRef.current = window.setTimeout(() => {
              setState('Listening')
              setNotice('Listening… ask a follow-up question')
            }, 2300)
          }, 1200)
        }, 1800)
      }
    } catch {
      setPermission('denied')
      setNotice('Microphone permission was denied. You can still explore the text assistant.')
    }
  }

  return <section className="panel voice-panel"><div className="panel-heading"><div><span className="eyebrow">VOICE ASSISTANT</span><h2>Talk to Nexus AI</h2><p>Have a conversation with your knowledge base.</p></div><button className="icon-button"><MoreHorizontal size={17} /></button></div><div className={`voice-state voice-state--${state.toLowerCase()}`}><StatusDot tone={state === 'Ready' ? 'green' : 'violet'} /> {state}<span>·</span><small>{notice}</small></div><VoiceOrb state={state} /><div className="voice-transcript"><div className="transcript-line transcript-line--user"><span>You</span><p>What’s the main conclusion of this report?</p></div><div className="transcript-line transcript-line--ai"><span>Nexus AI</span><p>{state === 'Listening' ? 'Listening for your question…' : 'Revenue increased 18%, primarily driven by enterprise accounts and recurring platform usage.'}</p></div></div><button className={`button ${state === 'Ready' ? 'button--primary' : 'button--soft'} button--large button--full voice-start`} onClick={toggleVoice}>{state === 'Ready' ? <><Mic size={17} /> Start talking</> : <><Square size={14} fill="currentColor" /> End conversation</>}<span>{permission === 'granted' ? 'mic ready' : 'browser mic'}</span></button><div className="voice-note"><Waves size={14} /> Modular voice layer · WebRTC / WebSocket / Pipecat ready</div></section>
}

function VoiceView({ onAsk }: { onAsk: () => void }) {
  return <div className="voice-view"><div className="voice-view__grid"><VoicePanel /><section className="panel voice-architecture"><div className="panel-heading"><div><span className="eyebrow">REALTIME ARCHITECTURE</span><h2>One knowledge base.<br />A more natural interface.</h2></div><IconBadge tone="violet"><Waves size={16} /></IconBadge></div><p className="voice-architecture__lead">The voice layer is intentionally modular. Your browser microphone connects to a transport, then shares the same retrieval and answer contract as text chat.</p><div className="voice-stack">{[['01', 'Browser microphone', 'Permission + audio capture', <Mic size={15} />], ['02', 'Realtime transport', 'WebRTC · WebSocket · Pipecat', <Cloud size={15} />], ['03', 'Speech pipeline', 'STT → retrieval → TTS', <Waves size={15} />], ['04', 'Shared knowledge base', 'Node · Groq · Neon pgvector', <Database size={15} />]].map(([number, title, copy, icon]) => <div className="voice-stack__row" key={String(number)}><span>{number}</span><IconBadge tone={number === '04' ? 'green' : 'violet'}>{icon}</IconBadge><div><strong>{title}</strong><small>{copy}</small></div><ArrowRight size={15} /></div>)}</div><div className="voice-architecture__foot"><span><CheckCircle2 size={14} /> No prerecorded audio</span><button className="text-button" onClick={onAsk}>Use text assistant <ArrowRight size={14} /></button></div></section></div><section className="panel voice-demo-note"><div><span className="eyebrow">DEMO BEHAVIOR</span><h3>Permission first. Claims second.</h3><p>When you start talking, Nexus AI requests browser microphone access and reflects the real permission state. The demo does not pretend a realtime backend is connected; plug your WebRTC, STT, TTS, and LLM transport into the same service boundary when you’re ready.</p></div><div className="voice-demo-note__pill"><StatusDot tone="amber" /><span>Realtime backend not connected</span><small>Demo adapter stays honest</small></div></section></div>
}

function VoiceOrb({ state, compact = false }: { state: VoiceState; compact?: boolean }) {
  const bars = Array.from({ length: compact ? 14 : 22 })
  return <div className={`voice-orb-wrap ${compact ? 'voice-orb-wrap--compact' : ''} voice-orb-wrap--${state.toLowerCase()}`}><div className="voice-orb__rings"><div className="voice-orb"><span className="voice-orb__core"><span /></span></div></div><div className="orb-wave">{bars.map((_, index) => <i key={index} style={{ height: `${compact ? 8 + ((index * 7) % 15) : 10 + ((index * 13) % 32)}px` }} />)}</div></div>
}

function RetrievalSummary({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return <section className={`panel retrieval-summary ${open ? 'is-open' : ''}`}><button className="retrieval-summary__toggle" onClick={onToggle}><span><Layers3 size={16} /> Retrieval Details</span><ChevronDown size={16} /></button>{open && <RetrievalPipeline compact />}</section>
}

function RetrievalView({ onSource }: { onSource: (source: Source) => void }) {
  return <div className="retrieval-view"><section className="panel retrieval-hero"><div><span className="eyebrow">RETRIEVAL OBSERVABILITY</span><h2>Context, before completion.</h2><p>See how Nexus AI moves from a question to the relevant passages that make an answer trustworthy.</p></div><div className="retrieval-stat"><span>HYBRID SCORE</span><strong>0.91</strong><small>sample query / revenue</small></div></section><RetrievalPipeline /><section className="panel source-library"><div className="panel-heading"><div><span className="eyebrow">TOP SOURCES</span><h2>Evidence in view</h2></div><span className="status-badge"><StatusDot /> 3 sources</span></div><div className="source-library__grid">{[...demoSources.report, ...demoSources.policy].map((source) => <button className="source-card" key={source.id} onClick={() => onSource(source)}><div><FileText size={17} /><span>{source.document}</span><small>Page {source.page} · {source.section}</small></div><strong>{source.score.toFixed(2)}</strong><p>{source.content}</p><ArrowUpRight size={15} /></button>)}</div></section></div>
}

function RetrievalPipeline({ compact = false }: { compact?: boolean }) {
  const nodes = ['Query', 'Hybrid Search', 'Full-text + Vector', 'Rank Fusion / RRF', 'Top Relevant Chunks', 'LLM Generation']
  return <div className={`retrieval-pipeline ${compact ? 'retrieval-pipeline--compact' : ''}`}>{nodes.map((node, index) => <div className="pipeline-node" key={node}><span className="pipeline-node__index">{String(index + 1).padStart(2, '0')}</span><div><strong>{node}</strong><small>{index === 0 ? 'What you ask' : index === 1 ? 'Parallel retrieval' : index === 2 ? 'Keyword + semantic signal' : index === 3 ? 'Rank the evidence' : index === 4 ? 'Context window' : 'Grounded response'}</small></div>{index < nodes.length - 1 && <div className="pipeline-line"><i style={{ animationDelay: `${index * 0.2}s` }} /></div>}</div>)}</div>
}

function SourceDrawer({ source, onClose }: { source: Source; onClose: () => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="source-drawer" onClick={(event) => event.stopPropagation()}><div className="source-drawer__header"><div><span className="eyebrow">SOURCE PREVIEW</span><h2>{source.document}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close source preview"><X size={17} /></button></div><div className="source-drawer__meta"><span><FileText size={13} /> Page {source.page}</span><span><BookOpen size={13} /> {source.section}</span><span className="score-pill">Score {source.score.toFixed(2)}</span></div><div className="source-drawer__content"><span className="eyebrow">RETRIEVED CONTEXT</span><div className="document-page"><div className="document-page__line document-page__line--title">{source.section}</div><div className="document-page__line" /><div className="document-page__line document-page__line--short" /><p><mark>{source.content}</mark></p><div className="document-page__line" /><div className="document-page__line document-page__line--short" /><div className="document-page__line" /></div><div className="drawer-explanation"><IconBadge tone="violet"><Sparkles size={14} /></IconBadge><p>This exact passage was selected by hybrid retrieval and sent as context to the generation layer.</p></div></div><div className="source-drawer__footer"><span><Layers3 size={13} /> Full-text + Vector</span><span>Retrieved just now</span></div></aside></div>
}

function ConversationsView({ conversations, search, setSearch, activeId, onSelect, onNew, onDelete }: { conversations: typeof initialConversation[]; search: string; setSearch: (value: string) => void; activeId: string; onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  return <div className="conversations-view"><section className="panel conversation-list-panel"><div className="panel-heading"><div><span className="eyebrow">MEMORY LAYER</span><h2>Conversation history</h2></div><button className="button button--primary button--small" onClick={onNew}><Plus size={14} /> New conversation</button></div><div className="conversation-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></div><div className="conversation-list">{conversations.map((conversation) => <div className={`conversation-row ${activeId === conversation.id ? 'is-active' : ''}`} key={conversation.id}><button onClick={() => onSelect(conversation.id)}><span className="conversation-row__icon"><MessageCircle size={16} /></span><span><strong>{conversation.title}</strong><small>{conversation.preview}</small><em>{conversation.updated}</em></span></button><button className="icon-button icon-button--danger" onClick={() => onDelete(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 size={14} /></button></div>)}</div>{!conversations.length && <EmptyState icon={<History size={20} />} title="No conversations found" copy="Start a new conversation to keep your research trail close." />}</section><aside className="panel conversation-side"><IconBadge tone="violet"><History size={17} /></IconBadge><h3>Keep the trail.</h3><p>Nexus AI conversations are designed to keep questions, sources, and follow-ups together.</p><div className="conversation-side__line"><Check size={14} /> Source citations stay attached</div><div className="conversation-side__line"><Check size={14} /> Ask follow-up questions</div><div className="conversation-side__line"><Check size={14} /> Delete or start fresh anytime</div></aside></div>
}

function SettingsView({ health }: { health: { connected: boolean; provider: string; search: string } }) {
  const pipeline = ['PDF', 'Text extraction', 'Chunking', 'Embeddings', 'Vector DB', 'Search', 'LLM API', 'Answer']
  return <div className="settings-view"><section className="panel settings-panel"><div className="panel-heading"><div><span className="eyebrow">NEXUS AI CONFIGURATION</span><h2>Connect your Groq intelligence stack</h2></div><span className="status-badge"><StatusDot tone={health.connected ? 'green' : 'amber'} /> {health.connected ? 'Backend connected' : 'Demo adapter'}</span></div><p className="settings-lead">Nexus AI keeps model access behind the backend. Three Groq API keys can be rotated server-side for resilience, while Neon Postgres stores extracted PDFs and chunks. None of these secrets are exposed in the browser.</p><div className="settings-grid"><SettingCard icon={<Zap size={17} />} title="Groq GPT model" value={health.provider} copy="Use the configured Groq-hosted GPT model through the secure backend adapter." endpoint="POST /api/chat/stream" tone="violet" /><SettingCard icon={<Database size={17} />} title="Neon Postgres chunks" value={health.search} copy="Uploaded PDF text and overlapping chunks persist in Neon before retrieval and answer generation." endpoint="GET /api/documents" tone="blue" /><SettingCard icon={<ShieldCheck size={17} />} title="Three-key rotation" value="Backend only" copy="GROQ_API_KEY_1, GROQ_API_KEY_2, and GROQ_API_KEY_3 rotate on rate limits and transient provider errors." endpoint="Server environment" tone="green" /></div></section><section className="panel pipeline-panel"><div className="panel-heading"><div><span className="eyebrow">DOCUMENT INTELLIGENCE PIPELINE</span><h2>From PDF to grounded answer</h2></div><span className="code-pill">RAG</span></div><div className="settings-pipeline">{pipeline.map((step, index) => <div className="settings-pipeline__step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>{index < pipeline.length - 1 && <ArrowRight size={14} />}</div>)}</div><p className="pipeline-caption">PDF → Text extraction → Chunking → Embeddings → Vector DB → Search → LLM API → Answer</p></section><section className="panel api-contract"><div className="panel-heading"><div><span className="eyebrow">API CONTRACT</span><h2>Backend endpoints</h2></div><span className="code-pill">/api</span></div><div className="endpoint-list">{['GET  /health', 'GET  /documents', 'POST /documents/upload', 'POST /chat/stream'].map((endpoint) => <div key={endpoint}><span className={endpoint.startsWith('POST') ? 'method-post' : 'method-get'}>{endpoint.slice(0, 4)}</span><code>{endpoint.slice(6)}</code><CheckCircle2 size={14} /></div>)}</div></section></div>
}

function SettingCard({ icon, title, value, copy, endpoint, tone }: { icon: ReactNode; title: string; value: string; copy: string; endpoint: string; tone: 'violet' | 'blue' | 'green' }) {
  return <article className="setting-card"><IconBadge tone={tone}>{icon}</IconBadge><span className="eyebrow">{title}</span><h3>{value}</h3><p>{copy}</p><code>{endpoint}</code></article>
}

function EmptyState({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="empty-state"><IconBadge tone="violet">{icon}</IconBadge><h3>{title}</h3><p>{copy}</p></div>
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => window.location.pathname.startsWith('/app') ? 'app' : window.location.pathname.startsWith('/docs') ? 'docs' : window.location.pathname.startsWith('/signup') ? 'signup' : window.location.pathname.startsWith('/login') ? 'login' : 'landing')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname.startsWith('/app') ? 'app' : window.location.pathname.startsWith('/docs') ? 'docs' : window.location.pathname.startsWith('/signup') ? 'signup' : window.location.pathname.startsWith('/login') ? 'login' : 'landing')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then((response) => response.json()).then((payload) => setAuthUser(payload.user ?? null)).catch(() => setAuthUser(null)).finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    const privateRoute = route === 'app' || route === 'login' || route === 'signup'
    document.title = route === 'signup' ? 'Create a Nexus AI account' : route === 'login' ? 'Sign in to Nexus AI' : route === 'app' ? 'Nexus AI Workspace' : route === 'docs' ? 'Nexus AI Documentation — RAG Knowledge Assistant' : 'Nexus AI — AI Document Q&A and RAG Knowledge Assistant'
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots) }
    robots.setAttribute('content', privateRoute ? 'noindex,nofollow' : 'index,follow')
  }, [route])

  const navigate = (next: AppRoute) => {
    const path = next === 'app' ? '/app' : next === 'docs' ? '/docs' : next === 'login' ? '/login' : next === 'signup' ? '/signup' : '/'
    window.history.pushState({}, '', path)
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const enterApp = () => navigate(authUser ? 'app' : 'login')
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined); setAuthUser(null); navigate('landing') }

  if (!authChecked) return <div className="auth-loading"><BrandMark /><span>Loading secure session…</span></div>
  if (route === 'docs') return <DocsPage onBack={() => navigate('landing')} onEnter={enterApp} />
  if (route === 'login' || route === 'signup') return <AuthPage mode={route} onModeChange={(mode) => navigate(mode)} onSuccess={(user) => { setAuthUser(user); navigate('app') }} onBack={() => navigate('landing')} />
  if (route === 'app' && authUser) return <Workspace user={authUser} onExit={() => navigate('landing')} onLogout={logout} />
  if (route === 'app' && !authUser) return <AuthPage mode="login" onModeChange={(mode) => navigate(mode)} onSuccess={(user) => { setAuthUser(user); navigate('app') }} onBack={() => navigate('landing')} />
  return <LandingPage onEnter={enterApp} />
}

export default App
