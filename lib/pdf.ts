import { readFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { extractTextFromImageWithOpenRouter } from "@/lib/openrouter";
import { normalizePdfText } from "@/lib/utils";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfDocument {
  pages: ExtractedPdfPage[];
  totalPages: number;
}

interface ExtractPdfOptions {
  enableOcrFallback?: boolean;
  ocrMinCharsThreshold?: number;
  ocrScale?: number;
}

async function renderPageToBase64Png(page: PDFPageProxy, scale: number): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page
    .render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    })
    .promise;
  return canvas.toBuffer("image/png").toString("base64");
}

export async function extractPdfPages(
  filePath: string,
  options: ExtractPdfOptions = {},
): Promise<ExtractedPdfDocument> {
  const {
    enableOcrFallback = true,
    ocrMinCharsThreshold = 80,
    ocrScale = 1.4,
  } = options;
  const fileBytes = await readFile(filePath);
  const loadingTask = getDocument({
    data: new Uint8Array(fileBytes),
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pages: ExtractedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = (textContent.items as Array<{ str?: string; hasEOL?: boolean }>)
      .map((item) => `${item.str ?? ""}${item.hasEOL ? "\n" : " "}`)
      .join("");

    let normalized = normalizePdfText(text);
    if (enableOcrFallback && normalized.length < ocrMinCharsThreshold) {
      const pngBase64 = await renderPageToBase64Png(page, ocrScale);
      const ocrText = await extractTextFromImageWithOpenRouter(pngBase64);
      if (ocrText.trim().length > normalized.length) {
        normalized = normalizePdfText(ocrText);
      }
    }

    pages.push({
      pageNumber,
      text: normalized,
    });
  }

  return {
    pages,
    totalPages: pdf.numPages,
  };
}
