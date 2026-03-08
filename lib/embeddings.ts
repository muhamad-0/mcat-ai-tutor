import OpenAI from "openai";
import { getOpenRouterApiKey, getOptionalEnv, sleep } from "@/lib/utils";

const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-large";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;
const BATCH_SIZE = 20;
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

let embeddingClient: OpenAI | null = null;

function getEmbeddingClient(): OpenAI {
  if (!embeddingClient) {
    embeddingClient = new OpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: getOptionalEnv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
      defaultHeaders: {
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "MCAT AI Tutor Prototype",
      },
    });
  }
  return embeddingClient;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_MS * attempt);
      }
    }
  }
  throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${String(lastError)}`);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getEmbeddingClient();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await withRetry(
      () =>
        client.embeddings.create({
          model: getEmbeddingModelName(),
          input: batch,
        }),
      "Embedding batch request",
    );

    for (const item of response.data) {
      vectors.push(item.embedding);
    }
  }

  return vectors;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vector] = await embedTexts([query]);
  if (!vector) {
    throw new Error("Embedding API returned no vector for query.");
  }
  return vector;
}

export function getEmbeddingModelName(): string {
  return getOptionalEnv("OPENROUTER_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL);
}
