import { embedQuery as embedQueryVector } from "@/lib/embeddings";
import { getPineconeIndex } from "@/lib/pinecone";
import { ExplainMode, RetrievalResult, RetrievedChunk, SourceCitation } from "@/lib/types";
import { normalizeForComparison, pickSnippet } from "@/lib/utils";

interface RetrievalOptions {
  mode?: ExplainMode;
}

interface PineconeMatchShape {
  id?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export async function embedQuery(query: string): Promise<number[]> {
  return embedQueryVector(query);
}

function queryVariants(query: string, mode?: ExplainMode): string[] {
  const lower = query.toLowerCase();
  const variants = [query];

  if (mode === "simpler" || lower.includes("simpler")) {
    variants.push(`${query} basic intuition simple language`, `${query} first-principles explanation`);
  }

  if (mode === "tighter" || lower.includes("tighter") || lower.includes("concise") || lower.includes("brief")) {
    variants.push(`${query} concise core concept`, `${query} high-yield MCAT summary`);
  }

  if (mode === "another_way" || lower.includes("another way")) {
    variants.push(`${query} alternate explanation`, `${query} conceptual reframing`);
  }

  if (mode === "another_analogy" || lower.includes("analogy")) {
    variants.push(`${query} analogy intuition`, `${query} everyday analogy`);
  }

  if (lower.includes("mcat trap")) {
    variants.push(`${query} common MCAT misconception`);
  }

  return Array.from(new Set(variants));
}

function toRetrievedChunk(match: PineconeMatchShape): RetrievedChunk | null {
  if (!match?.id || !match?.metadata?.chunk_text) return null;
  return {
    id: String(match.id),
    score: Number(match.score || 0),
    metadata: {
      chunk_text: String(match.metadata.chunk_text),
      source: String(match.metadata.source || "Unknown source"),
      source_file: String(match.metadata.source_file || "Unknown file"),
      page_start: Number(match.metadata.page_start || 0),
      page_end: Number(match.metadata.page_end || 0),
      chunk_index: Number(match.metadata.chunk_index || 0),
      topic_hint: String(match.metadata.topic_hint || ""),
      equations: Array.isArray(match.metadata.equations)
        ? match.metadata.equations.map((item: unknown) => String(item))
        : [],
      content_type: String(match.metadata.content_type || "concept-explanation"),
    },
  };
}

function dedupeAndDiversify(candidates: RetrievedChunk[], minCount = 4, maxCount = 6): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk>();
  for (const chunk of candidates) {
    const existing = byId.get(chunk.id);
    if (!existing || chunk.score > existing.score) {
      byId.set(chunk.id, chunk);
    }
  }

  const textKeys = new Set<string>();
  const sourcePageCounts = new Map<string, number>();
  const sorted = Array.from(byId.values()).sort((a, b) => b.score - a.score);
  const selected: RetrievedChunk[] = [];

  for (const chunk of sorted) {
    const textKey = normalizeForComparison(chunk.metadata.chunk_text).slice(0, 220);
    if (textKeys.has(textKey)) continue;

    const sourcePageKey = `${chunk.metadata.source_file}:${chunk.metadata.page_start}`;
    const sourceCount = sourcePageCounts.get(sourcePageKey) ?? 0;

    if (sourceCount >= 2 && selected.length >= minCount) continue;

    textKeys.add(textKey);
    sourcePageCounts.set(sourcePageKey, sourceCount + 1);
    selected.push(chunk);

    if (selected.length >= maxCount) break;
  }

  return selected;
}

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "No reliable retrieval context was found.";
  return chunks
    .map(
      (chunk, idx) =>
        `[Chunk ${idx + 1}] ${chunk.metadata.source} | ${chunk.metadata.source_file} | pages ${chunk.metadata.page_start}-${chunk.metadata.page_end}\n${chunk.metadata.chunk_text}`,
    )
    .join("\n\n");
}

function toSources(chunks: RetrievedChunk[]): SourceCitation[] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    source: chunk.metadata.source,
    sourceFile: chunk.metadata.source_file,
    pageStart: chunk.metadata.page_start,
    pageEnd: chunk.metadata.page_end,
    snippet: pickSnippet(chunk.metadata.chunk_text, 260),
    chunkIndex: chunk.metadata.chunk_index,
    score: Number(chunk.score.toFixed(4)),
  }));
}

export async function searchRelevantChunks(
  query: string,
  topK = 6,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const variants = queryVariants(query, options.mode);
  const index = getPineconeIndex();
  const candidates: RetrievedChunk[] = [];

  for (const variant of variants) {
    const vector = await embedQuery(variant);
    const response = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    for (const match of response.matches ?? []) {
      const parsed = toRetrievedChunk(match);
      if (parsed) candidates.push(parsed);
    }
  }

  const chunks = dedupeAndDiversify(candidates, 4, Math.max(4, topK));
  return {
    chunks,
    sources: toSources(chunks),
    context: buildContext(chunks),
  };
}
