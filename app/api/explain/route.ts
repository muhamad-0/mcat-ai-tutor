import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateOpenRouterCompletion } from "@/lib/openrouter";
import { buildExplanationUserPrompt, getExplanationSystemPrompt } from "@/lib/prompts";
import { searchRelevantChunks } from "@/lib/retrieval";
import { enforceToolkitItemCount } from "@/lib/response-guards";
import { ExplainRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ExplainRequestSchema.parse(body);

    const retrieval = await searchRelevantChunks(parsed.question, 6, { mode: parsed.mode });
    const answer = await generateOpenRouterCompletion({
      systemPrompt: getExplanationSystemPrompt(parsed.mode),
      userPrompt: buildExplanationUserPrompt({
        question: parsed.question,
        context: retrieval.context,
        hasContext: retrieval.chunks.length > 0,
      }),
      temperature: parsed.mode === "another_analogy" ? 0.45 : parsed.mode === "tighter" ? 0.2 : 0.3,
      maxTokens: 950,
    });
    const normalizedAnswer = enforceToolkitItemCount(answer);

    return NextResponse.json({
      answer: normalizedAnswer,
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
