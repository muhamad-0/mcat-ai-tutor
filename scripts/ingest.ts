import { access } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { chunkDocument } from "../lib/chunking";
import { embedTexts, getEmbeddingModelName } from "../lib/embeddings";
import {
  assertPineconeIndexConfiguration,
  getPineconeIndex,
  getPineconeIndexName,
  getPineconeNamespaceName,
} from "../lib/pinecone";
import { extractPdfPages } from "../lib/pdf";
import { ChunkRecord } from "../lib/types";
import { getOpenRouterApiKey, getRequiredEnv } from "../lib/utils";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const SOURCE_FILES = [
  "Source-Princeton Fluid Dynamics.pdf",
  "Source-EK Fluid Dynamics.pdf",
] as const;
const UPSERT_BATCH_SIZE = 100;

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

interface IngestStats {
  pagesProcessed: number;
  chunksCreated: number;
  vectorsUpserted: number;
  byFile: Record<string, { pages: number; chunks: number; vectors: number }>;
}

function sourceLabel(fileName: string): string {
  return fileName.replace(/^Source-?/i, "").replace(/\.pdf$/i, "");
}

async function ensurePdfExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Missing required PDF: ${filePath}`);
  }
}

async function upsertChunkBatch(chunks: ChunkRecord[], embeddings: number[][]): Promise<number> {
  const index = getPineconeIndex();
  let upserted = 0;

  for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
    const chunkBatch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
    const embeddingBatch = embeddings.slice(i, i + UPSERT_BATCH_SIZE);

    const records = chunkBatch.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddingBatch[idx],
      metadata: {
        chunk_text: chunk.chunk_text,
        source: chunk.source,
        source_file: chunk.source_file,
        page_start: chunk.page_start,
        page_end: chunk.page_end,
        chunk_index: chunk.chunk_index,
        topic_hint: chunk.topic_hint,
        equations: chunk.equations,
        content_type: chunk.content_type,
      },
    }));

    await index.upsert({ records });
    upserted += records.length;
  }

  return upserted;
}

async function ingest(): Promise<void> {
  getOpenRouterApiKey();
  getRequiredEnv("PINECONE_API_KEY");
  getRequiredEnv("PINECONE_INDEX_NAME");

  for (const fileName of SOURCE_FILES) {
    await ensurePdfExists(path.join(KNOWLEDGE_DIR, fileName));
  }

  await assertPineconeIndexConfiguration(3072, "cosine");

  const allChunks: ChunkRecord[] = [];
  const stats: IngestStats = {
    pagesProcessed: 0,
    chunksCreated: 0,
    vectorsUpserted: 0,
    byFile: {},
  };

  for (const fileName of SOURCE_FILES) {
    const filePath = path.join(KNOWLEDGE_DIR, fileName);
    const extracted = await extractPdfPages(filePath);

    const chunks = chunkDocument({
      source: sourceLabel(fileName),
      sourceFile: fileName,
      pages: extracted.pages,
      targetChars: 1000,
      overlapChars: 150,
    });

    allChunks.push(...chunks);
    stats.pagesProcessed += extracted.totalPages;
    stats.chunksCreated += chunks.length;
    stats.byFile[fileName] = {
      pages: extracted.totalPages,
      chunks: chunks.length,
      vectors: chunks.length,
    };
  }

  if (allChunks.length === 0) {
    throw new Error("No chunks were created. Check PDF parsing and chunking logic.");
  }

  const embeddings = await embedTexts(allChunks.map((chunk) => chunk.chunk_text));
  if (embeddings.length !== allChunks.length) {
    throw new Error(`Embedding count mismatch: expected ${allChunks.length}, got ${embeddings.length}`);
  }

  const expectedDimension = embeddings[0]?.length || 0;
  if (expectedDimension !== 3072) {
    throw new Error(`Embedding dimension mismatch: expected 3072, got ${expectedDimension}`);
  }

  stats.vectorsUpserted = await upsertChunkBatch(allChunks, embeddings);

  console.log("\nIngestion completed.");
  console.log(`Index: ${getPineconeIndexName()}`);
  console.log(`Namespace: ${getPineconeNamespaceName()}`);
  console.log(`Embedding model: ${getEmbeddingModelName()}`);
  console.log(`Pages processed: ${stats.pagesProcessed}`);
  console.log(`Chunks created: ${stats.chunksCreated}`);
  console.log(`Vectors upserted: ${stats.vectorsUpserted}`);
  console.log("Source breakdown:");
  Object.entries(stats.byFile).forEach(([fileName, fileStats]) => {
    console.log(
      `- ${fileName}: pages=${fileStats.pages}, chunks=${fileStats.chunks}, vectors=${fileStats.vectors}`,
    );
  });
}

ingest().catch((error) => {
  console.error("Ingestion failed.");
  console.error(error);
  process.exitCode = 1;
});
