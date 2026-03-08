import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenRouterApiKey, getOptionalEnv, sleep } from "@/lib/utils";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o";
const DEFAULT_VISION_MODEL = "openai/gpt-4o";
const OCR_MAX_RETRIES = 3;

let openRouterClient: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    openRouterClient = new OpenAI({
      apiKey: getOpenRouterApiKey(),
      baseURL: getOptionalEnv("OPENROUTER_BASE_URL", DEFAULT_OPENROUTER_BASE_URL),
      defaultHeaders: {
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "MCAT AI Tutor Prototype",
      },
    });
  }
  return openRouterClient;
}

export interface OpenRouterCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateOpenRouterCompletion({
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 900,
}: OpenRouterCompletionParams): Promise<string> {
  try {
    const client = getOpenRouterClient();
    const model = getOptionalEnv("OPENROUTER_MODEL", DEFAULT_MODEL);
    const response = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return text;
  } catch (error) {
    const maybeError = error as { status?: number; message?: string };
    const status = maybeError.status ? ` [status=${maybeError.status}]` : "";
    const message = maybeError.message || String(error);
    throw new Error(`OpenRouter request failed${status}: ${message}`);
  }
}

export async function extractTextFromImageWithOpenRouter(imageBase64: string): Promise<string> {
  const client = getOpenRouterClient();
  const model = getOptionalEnv("OPENROUTER_VISION_MODEL", DEFAULT_VISION_MODEL);
  let lastError: unknown = null;
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are OCR for MCAT study pages. Return plain text only. Keep equations readable in plain text. No commentary.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract all readable text from this page. If unreadable, return an empty string.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
          },
        },
      ],
    },
  ];

  for (let attempt = 1; attempt <= OCR_MAX_RETRIES; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 1500,
        messages,
      });

      const text = response.choices[0]?.message?.content?.trim() ?? "";
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < OCR_MAX_RETRIES) {
        await sleep(500 * attempt);
      }
    }
  }

  throw new Error(`OpenRouter OCR failed after ${OCR_MAX_RETRIES} attempts: ${String(lastError)}`);
}
