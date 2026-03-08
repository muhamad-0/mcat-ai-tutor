import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateOpenRouterCompletion } from "@/lib/openrouter";
import { buildQuestionGenerationUserPrompt, getQuestionGenerationSystemPrompt } from "@/lib/prompts";
import { searchRelevantChunks } from "@/lib/retrieval";
import { GenerateQuestionRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateQuestionRequestSchema.parse(body);

    const retrieval = await searchRelevantChunks(`${parsed.topic} fluid dynamics MCAT`, 6);
    const questionBlock = await generateOpenRouterCompletion({
      systemPrompt: getQuestionGenerationSystemPrompt(),
      userPrompt: buildQuestionGenerationUserPrompt({
        topic: parsed.topic,
        context: retrieval.context,
        hasContext: retrieval.chunks.length > 0,
      }),
      temperature: 0.35,
      maxTokens: 1000,
    });

    return NextResponse.json({
      questionBlock,
      sources: retrieval.sources,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request payload.",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

