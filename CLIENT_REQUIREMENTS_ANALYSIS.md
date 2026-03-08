# Client Requirements vs Current Implementation

## Implemented Features
- RAG prototype for MCAT fluid dynamics using the two required PDFs.
- Explanation engine with tutor-style structure:
  - `Toolkit`
  - `Think Through It`
  - `Analogy`
  - `MCAT Trap`
  - `Memory Rule`
- Explanation modes implemented:
  - `default`
  - `simpler`
  - `another_way`
  - `another_analogy`
- MCAT question generator:
  - `Question`
  - `A/B/C/D`
  - `Correct Answer`
  - `Explanation` (tutor style sections)
- End-to-end ingestion pipeline:
  - PDF read
  - chunking
  - embeddings
  - Pinecone upsert
- Retrieval pipeline:
  - query embedding
  - top-k search
  - dedupe/diversity filtering
  - context assembly
- Math rendering support:
  - markdown math + KaTeX
  - normalization for malformed model math output
- Delivery artifacts completed:
  - run instructions
  - short design note

## Coverage Against `req.md`
- **Task 1 - Explanation Engine:** **Met** (with required tutor style and asked explanation variations).
- **Task 2 - MCAT Question Generator:** **Met** (question, choices, answer, tutor-style explanation).
- **System Requirements (RAG pipeline):** **Met** (ingest -> chunk -> embed -> retrieve -> generate).
- **Math formatting requirement:** **Met** (LaTeX-friendly rendering + sanitization path).
- **Submission requirements:** **Met** (`PROTOTYPE_RUNBOOK_AND_DESIGN_NOTE.md` plus codebase).

## Differences from Client Requirements
- **Missing explicit "tighter explanations" mode** in API/UI.
  - Client asked for simpler, tighter, another way, another analogy.
  - Current implementation has simpler/another way/another analogy, but no dedicated tighter mode.
- **Provider path differs from the original wording in places:**
  - Current app uses OpenRouter for generation and embeddings model routing.
  - This still aligns with the exercise flexibility ("may use any tools/APIs"), but is an implementation choice to note.
- **Source citation UI is simplified** to source name + page only (per latest product decision), not full snippet/chunk display.

## Current End-to-End Flow

### Ingestion Flow
1. `pnpm ingest` loads `.env.local`.
2. Reads the two knowledge PDFs.
3. Extracts page text (OCR fallback used for scanned pages).
4. Chunks text with overlap and metadata.
5. Creates embeddings (`text-embedding-3-large` route).
6. Upserts vectors + metadata into Pinecone (`mcat-fluid-dynamics`, `default` namespace).

### Runtime Flow - Explain
1. User submits question + mode.
2. API validates input.
3. Retrieval runs query embedding + Pinecone search + dedupe/diversity.
4. Prompt is built with retrieved context and tutor-style constraints.
5. LLM generates structured answer.
6. UI renders sections and citations (name + page).

### Runtime Flow - Generate Question
1. User submits topic.
2. API validates input.
3. Retrieval gathers topic-relevant chunks.
4. LLM generates MCQ block.
5. UI parses and renders:
   - question stem
   - options
   - correct answer
   - tutor-style explanation sections

