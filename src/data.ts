import type { ChatResponse, DocumentRecord, Source } from './services'

export const demoDocuments: DocumentRecord[] = [
  {
    id: 'annual-report',
    name: 'Annual_Report.pdf',
    type: 'PDF',
    size: '2.4 MB',
    status: 'Ready',
    chunks: 1842,
    indexed: true,
    updated: '2 min ago',
  },
  {
    id: 'company-policy',
    name: 'Company_Policy.pdf',
    type: 'PDF',
    size: '842 KB',
    status: 'Ready',
    chunks: 986,
    indexed: true,
    updated: '8 min ago',
  },
  {
    id: 'product-docs',
    name: 'Product_Documentation.md',
    type: 'MD',
    size: '184 KB',
    status: 'Ready',
    chunks: 432,
    indexed: true,
    updated: '14 min ago',
  },
]

export const demoSources: Record<string, Source[]> = {
  report: [
    {
      id: 'report-revenue',
      documentId: 'annual-report',
      document: 'Annual_Report.pdf',
      page: 12,
      section: 'Revenue Analysis',
      content: 'Annual revenue increased by 18% year over year to $42.6M, primarily driven by expansion in enterprise accounts and a 24% increase in recurring platform usage.',
      score: 0.91,
    },
    {
      id: 'report-outlook',
      documentId: 'annual-report',
      document: 'Annual_Report.pdf',
      page: 18,
      section: 'Forward Outlook',
      content: 'The company expects continued momentum in enterprise demand while investing in data infrastructure, customer success, and responsible AI capabilities.',
      score: 0.86,
    },
  ],
  policy: [
    {
      id: 'policy-risk',
      documentId: 'company-policy',
      document: 'Company_Policy.pdf',
      page: 4,
      section: 'Risk Management',
      content: 'Material operational risks must be reviewed quarterly, documented with an owner, and escalated when mitigation milestones are missed.',
      score: 0.88,
    },
  ],
  product: [
    {
      id: 'product-retrieval',
      documentId: 'product-docs',
      document: 'Product_Documentation.md',
      page: 7,
      section: 'Hybrid Retrieval',
      content: 'Nexus AI combines full-text keyword retrieval with vector semantic retrieval, then applies reciprocal rank fusion before sending the top relevant chunks to the generation layer.',
      score: 0.94,
    },
  ],
}

const responseFor = (answer: string, sources: Source[], latency = '1.2s', method: ChatResponse['retrieval']['method'] = 'hybrid'): ChatResponse => ({
  answer,
  sources,
  retrieval: { method, bm25: method === 'hybrid', vector: method === 'hybrid', sourceCount: sources.length, latency },
})

export function conversationForQuery(query: string): ChatResponse | null {
  const normalized = query.trim().toLowerCase().replace(/[!?.,]+$/g, '')
  if (/^(hi|hii|hello|hey|yo|sup|what'?s up)(\s|$)/.test(normalized)) return responseFor('Hi! I’m Nexus AI. What’s up? You can chat with me normally, or ask me anything about your uploaded PDFs.', [], 'instant', 'conversation')
  if (/^how are you( doing)?( today)?$/.test(normalized)) return responseFor('I’m doing well and ready to help. Ask me about your documents, or just keep the conversation going.', [], 'instant', 'conversation')
  if (/^(who are you|what are you|what can you do)(\s|$)/.test(normalized)) return responseFor('I’m Nexus AI, a document intelligence assistant. I can have a normal conversation and answer PDF questions with grounded source citations.', [], 'instant', 'conversation')
  if (/^(thanks|thank you|thx)(\s|$)/.test(normalized)) return responseFor('You’re welcome. Send me another question whenever you’re ready.', [], 'instant', 'conversation')
  if (/^(bye|goodbye|see you)(\s|$)/.test(normalized)) return responseFor('See you later. I’ll be here when you need to search your knowledge base again.', [], 'instant', 'conversation')
  return null
}

export function answerForQuery(query: string, documents: DocumentRecord[]): ChatResponse {
  const normalized = query.toLowerCase()
  const conversation = conversationForQuery(query)
  if (conversation) return conversation
  const sourceSet = normalized.includes('risk') || normalized.includes('policy') ? demoSources.policy : normalized.includes('retriev') || normalized.includes('search') ? demoSources.product : demoSources.report
  const hasDocs = documents.some((document) => document.indexed)
  if (!hasDocs) {
    return responseFor('Upload a document first and I’ll ground the answer in its content. Your sources will appear here once the knowledge base has been indexed.', [], '—')
  }
  if (normalized.includes('key finding') || normalized.includes('summar')) {
    return responseFor('The report’s central finding is strong, measured growth: annual revenue increased **18% to $42.6M**, with enterprise accounts and recurring platform usage contributing most of the lift. It also points to continued investment in data infrastructure and responsible AI as the next operating priorities.', demoSources.report)
  }
  if (normalized.includes('risk')) {
    return responseFor('The policy frames risk management as an operating rhythm rather than a one-time review. Material risks should be reviewed quarterly, assigned a clear owner, and escalated when mitigation milestones slip. That creates an auditable path from detection to action.', demoSources.policy)
  }
  if (normalized.includes('retriev') || normalized.includes('search')) {
    return responseFor('Nexus AI uses **hybrid retrieval**: full-text search catches exact language and product terms, while vector search finds semantically related passages. Reciprocal rank fusion combines both lists, then the top chunks are assembled as grounded context for the LLM.', demoSources.product)
  }
  if (normalized.includes('compare')) {
    return responseFor('The annual report focuses on business momentum and investment priorities, while the company policy defines the controls that keep execution accountable. In short: the report explains **where the business is going**; the policy explains **how risk is managed along the way**.', [...demoSources.report.slice(0, 1), ...demoSources.policy])
  }
  return responseFor('The knowledge base points to an 18% annual revenue increase, primarily driven by enterprise expansion and recurring platform usage. The same documents emphasize disciplined risk reviews and continued investment in the data foundation that supports the product.', sourceSet)
}

export const capabilities = [
  { label: '01 / Ask', title: 'Ask anything', copy: 'Natural-language questions with answers grounded in your own documents.', icon: 'spark' },
  { label: '02 / Search', title: 'Search with signal', copy: 'Keyword precision meets semantic retrieval for context that holds up.', icon: 'search' },
  { label: '03 / Chat', title: 'Chat with context', copy: 'Ask follow-up questions in one focused assistant with document-aware context.', icon: 'spark' },
  { label: '04 / Engine', title: 'Hybrid retrieval', copy: 'Rank fusion brings exact terms and meaning together before generation.', icon: 'layers' },
  { label: '05 / Trust', title: 'Grounded answers', copy: 'Every response can show its sources, passages, and retrieval signal.', icon: 'quote' },
  { label: '06 / API', title: 'API first', copy: 'FastAPI keeps the frontend clean while model, retrieval, and document operations stay composable.', icon: 'api' },
  { label: '07 / Secure', title: 'Backend controlled', copy: 'API keys and sensitive operations stay behind the backend boundary where they belong.', icon: 'shield' },
]

export const architectureSteps = [
  ['PDF / DOCX / MD', 'Source files enter the knowledge base.'],
  ['Document processing', 'Text is extracted with page context intact.'],
  ['Chunking + embeddings', 'Content becomes retrievable, meaning-rich units.'],
  ['Neon Postgres', 'One database holds both full-text and pgvector indexes.'],
  ['Hybrid retrieval', 'Full-text + vector search feed rank fusion.'],
  ['Context assembly', 'Relevant passages become grounded context.'],
  ['Groq LLM', 'Fast inference turns context into a useful answer.'],
  ['Nexus AI', 'Text chat and voice share the same source of truth.'],
]

export const howItWorks = [
  ['01', 'Upload', 'Drop in the documents your team already trusts.'],
  ['02', 'Process', 'Nexus AI extracts and chunks content while preserving context.'],
  ['03', 'Index', 'Postgres full-text and pgvector indexes make each passage discoverable in milliseconds.'],
  ['04', 'Retrieve', 'Hybrid full-text + vector search finds the strongest evidence.'],
  ['05', 'Answer', 'Groq generates a grounded response and shows its work.'],
]
