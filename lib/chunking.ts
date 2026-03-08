import { ChunkRecord } from "@/lib/types";
import { makeChunkId, normalizeForComparison, normalizePdfText } from "@/lib/utils";
import { ExtractedPdfPage } from "@/lib/pdf";

interface ChunkingOptions {
  source: string;
  sourceFile: string;
  pages: ExtractedPdfPage[];
  targetChars?: number;
  overlapChars?: number;
}

interface Segment {
  page: number;
  text: string;
}

const DEFAULT_TARGET_CHARS = 1000;
const DEFAULT_OVERLAP_CHARS = 150;
const MIN_CHUNK_CHARS = 220;

function splitParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];

  const sentenceParts = paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentenceParts.length <= 1) {
    const chunks: string[] = [];
    for (let i = 0; i < paragraph.length; i += maxChars) {
      chunks.push(paragraph.slice(i, i + maxChars).trim());
    }
    return chunks.filter(Boolean);
  }

  const output: string[] = [];
  let current = "";
  for (const sentence of sentenceParts) {
    if (!current) {
      current = sentence;
      continue;
    }
    if (current.length + sentence.length + 1 <= maxChars) {
      current = `${current} ${sentence}`;
      continue;
    }
    output.push(current.trim());
    current = sentence;
  }
  if (current.trim()) output.push(current.trim());
  return output;
}

function collectSegments(pages: ExtractedPdfPage[], maxChars: number): Segment[] {
  const segments: Segment[] = [];
  for (const page of pages) {
    if (!page.text.trim()) continue;
    const paragraphs = normalizePdfText(page.text)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40);

    for (const paragraph of paragraphs) {
      const parts = splitParagraph(paragraph, Math.floor(maxChars * 0.75));
      for (const part of parts) {
        if (part.length >= 40) {
          segments.push({ page: page.pageNumber, text: part });
        }
      }
    }
  }
  return segments;
}

function inferTopicHint(text: string): string {
  const lower = text.toLowerCase();
  const topics: string[] = [];
  if (lower.includes("bernoulli")) topics.push("bernoulli");
  if (lower.includes("continuity")) topics.push("continuity equation");
  if (lower.includes("poiseuille")) topics.push("poiseuille flow");
  if (lower.includes("viscosity")) topics.push("viscosity");
  if (lower.includes("pressure")) topics.push("pressure");
  if (lower.includes("buoy")) topics.push("buoyancy");
  if (lower.includes("archimedes")) topics.push("archimedes");
  if (lower.includes("density")) topics.push("density");
  if (lower.includes("flow rate")) topics.push("flow rate");
  if (lower.includes("hydrostatic")) topics.push("hydrostatics");
  return topics.length ? topics.join(", ") : "fluid dynamics fundamentals";
}

function inferEquations(text: string): string[] {
  const equationCandidates = text
    .split(/\n|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) =>
      /[=]/.test(line) &&
      /(p|v|rho|ρ|g|h|q|a|f|m|d|r|pi|π|\d)/i.test(line.replace(/\s+/g, "")),
    );

  const unique = Array.from(new Set(equationCandidates));
  return unique.slice(0, 3);
}

function inferContentType(text: string): string {
  const lower = text.toLowerCase();
  const equationCount = inferEquations(text).length;
  if (equationCount >= 2) return "equation-heavy";
  if (lower.includes("example") || lower.includes("consider")) return "worked-example";
  if (lower.includes("therefore") || lower.includes("thus")) return "derivation";
  return "concept-explanation";
}

export function chunkDocument({
  source,
  sourceFile,
  pages,
  targetChars = DEFAULT_TARGET_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS,
}: ChunkingOptions): ChunkRecord[] {
  const segments = collectSegments(pages, targetChars);
  if (segments.length === 0) return [];

  const chunks: Array<{ text: string; pageStart: number; pageEnd: number }> = [];
  let currentText = "";
  let currentPageStart = segments[0].page;
  let currentPageEnd = segments[0].page;

  const flush = () => {
    const trimmed = currentText.trim();
    if (!trimmed) return;
    chunks.push({
      text: trimmed,
      pageStart: currentPageStart,
      pageEnd: currentPageEnd,
    });
  };

  for (const segment of segments) {
    if (!currentText) {
      currentText = segment.text;
      currentPageStart = segment.page;
      currentPageEnd = segment.page;
      continue;
    }

    if (currentText.length + segment.text.length + 2 <= targetChars) {
      currentText = `${currentText}\n\n${segment.text}`;
      currentPageEnd = segment.page;
      continue;
    }

    flush();

    const overlap = currentText.slice(-overlapChars).trim();
    currentText = overlap ? `${overlap}\n\n${segment.text}` : segment.text;
    currentPageStart = overlap ? currentPageEnd : segment.page;
    currentPageEnd = segment.page;
  }
  flush();

  const merged: Array<{ text: string; pageStart: number; pageEnd: number }> = [];
  for (const chunk of chunks) {
    if (chunk.text.length < MIN_CHUNK_CHARS && merged.length > 0) {
      const previous = merged[merged.length - 1];
      previous.text = `${previous.text}\n\n${chunk.text}`.trim();
      previous.pageEnd = chunk.pageEnd;
    } else {
      merged.push(chunk);
    }
  }

  return merged.map((chunk, idx) => {
    const normalized = normalizePdfText(chunk.text);
    return {
      id: makeChunkId([sourceFile, chunk.pageStart, chunk.pageEnd, idx, normalizeForComparison(normalized)]),
      chunk_text: normalized,
      source,
      source_file: sourceFile,
      page_start: chunk.pageStart,
      page_end: chunk.pageEnd,
      chunk_index: idx,
      topic_hint: inferTopicHint(normalized),
      equations: inferEquations(normalized),
      content_type: inferContentType(normalized),
    };
  });
}

