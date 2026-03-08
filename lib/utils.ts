import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getOptionalEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    return fallback;
  }
  return value.trim();
}

export function getOpenRouterApiKey(): string {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) return openRouterKey;

  const legacyKey = process.env.OPENAI_API_KEY?.trim();
  if (legacyKey) return legacyKey;

  throw new Error("Missing required environment variable: OPENROUTER_API_KEY");
}

export function normalizePdfText(input: string): string {
  return input
    .replace(/\u00ad/g, "")
    .replace(/(\w)-\s*\n(\w)/g, "$1$2")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeForComparison(input: string): string {
  return input
    .toLowerCase()
    .replace(/[`*_>#-]/g, " ")
    .replace(/[^\w\s=+\-*/^().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickSnippet(input: string, maxLength = 240): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength).trimEnd()}...`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function makeChunkId(parts: Array<string | number>): string {
  return stableHash(parts.join("|"));
}
