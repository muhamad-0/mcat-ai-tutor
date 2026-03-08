# MCAT AI Tutor Prototype

## 1. Instructions to Run the Prototype

### Prerequisites
- Node.js 20+ (Node 24 works)
- `pnpm` installed
- Pinecone index already created:
  - Name: `mcat-fluid-dynamics`
  - Type: dense
  - Dimension: `3072`
  - Metric: `cosine`
- API access through OpenRouter for:
  - `openai/gpt-4o` (generation + OCR fallback)
  - `openai/text-embedding-3-large` (embeddings)

### Required files
Place these PDFs under `knowledge/`:
- `knowledge/Source-Princeton Fluid Dynamics.pdf`
- `knowledge/Source-EK Fluid Dynamics.pdf`

### Environment setup
Create `.env.local` with:

```env
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
OPENROUTER_VISION_MODEL=openai/gpt-4o
PINECONE_API_KEY=
PINECONE_INDEX_NAME=mcat-fluid-dynamics
PINECONE_NAMESPACE=default
```

### Install and run

```bash
pnpm install
pnpm ingest
pnpm dev
```

Open `http://localhost:3000`.

### What `pnpm ingest` does
- Reads both PDFs page-by-page
- Extracts text; if pages are scanned/image-only, it uses OCR fallback via OpenRouter vision model
- Chunks content with overlap
- Embeds chunks with `openai/text-embedding-3-large`
- Upserts vectors + metadata into Pinecone namespace `default`

Expected output includes:
- pages processed
- chunks created
- vectors upserted
- per-file chunk counts

### Common troubleshooting
- `Missing required environment variable`: check `.env.local` and restart command
- `No chunks were created`: usually scanned PDFs; OCR fallback should handle this if OpenRouter key/model access is valid
- Pinecone dimension mismatch: index must be exactly `3072`
- Empty answers/sources: run ingestion again and verify vectors exist in Pinecone

---

## 2. Short Design Note (Architecture + Rationale)

### Product goal
The prototype is designed to teach MCAT fluid dynamics through retrieval-grounded tutoring, not generic chat. The focus is:
- high-quality retrieval
- tutor-style reasoning
- clear structure
- MCAT-oriented traps and memory hooks

The app supports two core workflows:
1. Concept explanation with style modes (`default`, `simpler`, `another_way`, `another_analogy`)
2. MCAT-style question generation on a chosen topic

### Why this architecture
The system uses a simple but production-friendly split:
- **Next.js App Router** for UI + API routes (Vercel-compatible)
- **scripts/ingest.ts** for one-time/offline ingestion
- **Pinecone** for vector retrieval
- **OpenRouter** for both embeddings/generation (single provider path)

This keeps operations straightforward:
- ingestion is explicit and repeatable
- runtime API calls are small and predictable
- deployment remains serverless-friendly

### Retrieval design
Retrieval quality is prioritized over visual complexity. The retrieval pipeline does:
1. Query embedding generation
2. Optional lightweight query expansion for “simpler”, “another way”, “analogy”, and trap-like intent
3. Pinecone top-k query
4. Deduplication and diversity filtering
5. Prompt context assembly with source metadata

The system avoids exposing raw vectors to the UI and always returns source cards (file/page/snippet) when available.

### Ingestion design
Ingestion is deterministic and idempotent:
- chunks are assigned stable IDs
- upsert safely overwrites existing records for same ID
- metadata is stored with each vector:
  - chunk text, source/file, page range, chunk index, topic hint, equations, content type

Chunking uses educationally coherent boundaries with overlap. This reduces answer fragmentation and improves continuity when explaining equations or conceptual chains.

### Prompting design
Prompting enforces a tutor structure and evidence discipline. Explanation outputs are constrained to:
- Toolkit
- Think Through It
- Analogy
- MCAT Trap
- Memory Rule

Prompt guards require:
- grounding in retrieved context
- no fabricated citations
- conservative behavior when context is weak
- readable equation formatting

Question-generation prompts produce MCAT-like distractors while keeping explanations in the same tutoring style.

### Equation rendering + readability
A practical issue in tutoring outputs is math formatting inconsistency. The UI renderer:
- supports Markdown + math (`remark-math` + `rehype-katex`)
- normalizes malformed model outputs (`\[...\]`, `\(...\)`, bracketed equations) into valid math delimiters
- preserves readable inline/display equations

This significantly improves Bernoulli/continuity/buoyancy responses where symbolic notation is frequent.

### UX rationale
The interface balances clarity and utility:
- sticky navbar for quick mode switching
- side panel with prompt starters and topic boosters
- tabbed flow for explain vs. question generation
- source cards for traceability

The goal is not heavy product complexity; it is fast learning loops:
- ask
- inspect grounded answer
- reframe in another mode
- practice with generated question

### Tradeoffs and limitations
- No advanced reranker yet (simple dense retrieval + dedupe/diversity)
- OCR fallback increases ingestion latency for scanned PDFs
- No long-term user history or analytics in MVP
- Non-streaming generation path kept for reliability/simplicity

These are intentional MVP decisions to keep the system robust and easy to deploy.

### Next extensions
- Add optional reranking for tougher edge cases
- Add answer confidence/coverage signals based on retrieved chunk scores
- Add structured eval set for known MCAT fluid dynamics queries
- Add session memory + saved question sets

