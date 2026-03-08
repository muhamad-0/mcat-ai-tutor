import { z } from "zod";

export const ExplainModeSchema = z.enum([
  "default",
  "simpler",
  "another_way",
  "another_analogy",
]);

export type ExplainMode = z.infer<typeof ExplainModeSchema>;

export const ExplainRequestSchema = z.object({
  question: z.string().trim().min(5).max(600),
  mode: ExplainModeSchema.optional().default("default"),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export const GenerateQuestionRequestSchema = z.object({
  topic: z.string().trim().min(2).max(180),
});

export type GenerateQuestionRequest = z.infer<typeof GenerateQuestionRequestSchema>;

export interface ChunkMetadata {
  chunk_text: string;
  source: string;
  source_file: string;
  page_start: number;
  page_end: number;
  chunk_index: number;
  topic_hint: string;
  equations: string[];
  content_type: string;
}

export interface ChunkRecord extends ChunkMetadata {
  id: string;
}

export interface SourceCitation {
  id: string;
  source: string;
  sourceFile: string;
  pageStart: number;
  pageEnd: number;
  snippet: string;
  chunkIndex: number;
  score?: number;
}

export interface RetrievedChunk {
  id: string;
  score: number;
  metadata: ChunkMetadata;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  sources: SourceCitation[];
  context: string;
}

