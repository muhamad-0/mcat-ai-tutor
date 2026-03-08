import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateOpenRouterCompletion } from "@/lib/openrouter";
import { buildQuestionGenerationUserPrompt, getQuestionGenerationSystemPrompt } from "@/lib/prompts";
import { searchRelevantChunks } from "@/lib/retrieval";
import { buildMcqRetryInstruction, enforceToolkitItemCount, hasValidMcqStructure } from "@/lib/response-guards";
import { GenerateQuestionRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateQuestionRequestSchema.parse(body);

    const retrieval = await searchRelevantChunks(`${parsed.topic} fluid dynamics MCAT`, 6);
    const userPrompt = buildQuestionGenerationUserPrompt({
      topic: parsed.topic,
      context: retrieval.context,
      hasContext: retrieval.chunks.length > 0,
    });

    let questionBlock = await generateOpenRouterCompletion({
      systemPrompt: getQuestionGenerationSystemPrompt(),
      userPrompt,
      temperature: 0.35,
      maxTokens: 1000,
    });

    if (!hasValidMcqStructure(questionBlock)) {
      questionBlock = await generateOpenRouterCompletion({
        systemPrompt: getQuestionGenerationSystemPrompt(),
        userPrompt: buildMcqRetryInstruction(userPrompt),
        temperature: 0.2,
        maxTokens: 1100,
      });
    }

    const normalizedQuestionBlock = enforceToolkitItemCount(questionBlock);

    return NextResponse.json({
      questionBlock: normalizedQuestionBlock,
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
