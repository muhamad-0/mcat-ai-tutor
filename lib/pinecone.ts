import { Pinecone } from "@pinecone-database/pinecone";
import { getRequiredEnv } from "@/lib/utils";

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: getRequiredEnv("PINECONE_API_KEY"),
    });
  }
  return pineconeClient;
}

export function getPineconeIndexName(): string {
  return getRequiredEnv("PINECONE_INDEX_NAME");
}

export function getPineconeNamespaceName(): string {
  return process.env.PINECONE_NAMESPACE?.trim() || "default";
}

export function getPineconeIndex(namespace = getPineconeNamespaceName()) {
  return getPineconeClient().index(getPineconeIndexName()).namespace(namespace);
}

export async function assertPineconeIndexConfiguration(
  expectedDimension = 3072,
  expectedMetric = "cosine",
): Promise<void> {
  const client = getPineconeClient();
  const indexName = getPineconeIndexName();
  const indexInfo = await client.describeIndex(indexName);

  if (indexInfo.dimension !== expectedDimension) {
    throw new Error(
      `Pinecone index "${indexName}" has dimension ${indexInfo.dimension}. Expected ${expectedDimension}.`,
    );
  }

  if ((indexInfo.metric || "").toLowerCase() !== expectedMetric.toLowerCase()) {
    throw new Error(
      `Pinecone index "${indexName}" has metric "${indexInfo.metric}". Expected "${expectedMetric}".`,
    );
  }
}
