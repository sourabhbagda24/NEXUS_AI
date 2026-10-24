# Nexus AI — AI Document Intelligence

Nexus AI is a premium AI SaaS portfolio demo for Beyond Tech Intelligence. It combines a landing page with a responsive document workspace for grounded chat, source preview, hybrid retrieval visualization, conversation history, document ingestion states, and a modular browser voice layer.

## Run locally

```bash
pnpm install
pnpm dev
```

The app is served on port `3000`. The public routes are `/` for the product site and `/app` for the workspace.

## Demo mode

With no `VITE_NEXUS_AI_API_URL` configured, the frontend uses an explicit Demo Mode adapter. It preloads `Annual_Report.pdf`, `Company_Policy.pdf`, and `Product_Documentation.md`, stages document uploads through Uploading → Extracting → Chunking → Generating embeddings → Indexing → Ready, and answers sample questions with source citations.

## Backend integration seam

Set `VITE_NEXUS_AI_API_URL` to point the frontend at a FastAPI service. The backend adapter expects relative-compatible endpoints:

- `GET /api/health`
- `GET /api/documents`
- `POST /api/documents/upload`
- `DELETE /api/documents/{id}`
- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/voice/session`
- `GET /api/documents/{id}/sources`

The frontend never contains Groq, database, or AWS credentials. LLM and retrieval secrets stay inside the backend `LLMProvider` and search services. The voice surface handles real microphone permission flow and is prepared for WebRTC, WebSocket, Pipecat, STT, TTS, and LLM transport without pretending a realtime provider is connected in Demo Mode.

## Hybrid retrieval

Uploaded PDFs are chunked (about 900 characters, 150 overlap) and each chunk is embedded locally with `Xenova/all-MiniLM-L6-v2` (384 dimensions, via `@huggingface/transformers`). Chunks live in Neon Postgres with a `tsvector` column (full-text, GIN index) and a `vector(384)` column (pgvector, HNSW index). Each question runs both searches in parallel, merges the ranked lists with Reciprocal Rank Fusion (k = 60), and sends the top six chunks to the Groq model.

The first upload or question downloads the embedding model (about 25 MB) once and caches it. Chunks stored before pgvector was enabled are embedded automatically at server start. If pgvector or the embedding model is unavailable, the server falls back to full-text only, and then to `ILIKE` matching.

## RAG evaluation

The `eval/` folder measures how good retrieval and answers actually are. See `eval/README.md`.

```bash
npm run eval:generate   # sample chunks from your database and write ~30 test questions
npm run eval:run        # Hit@k, MRR and nDCG for keyword vs vector vs hybrid
npm run eval:judge      # also scores answer faithfulness and correctness with an LLM judge
```

## Checks

```bash
pnpm typecheck
pnpm build
```
