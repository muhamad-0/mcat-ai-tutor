import { ExplainMode } from "@/lib/types";

const PROMPT_GUARDS = `
Rules you must obey:
- Use only the provided retrieval context as factual grounding.
- If context is weak, state that briefly and answer conservatively.
- Never invent chapter/page citations.
- Never claim the PDFs contain a claim unless context supports it.
- Use Markdown math delimiters for all equations:
  - Inline: $...$
  - Display: $$...$$
- Never wrap equations in square brackets like [ ... ].
- Avoid hallucinated formulas and values.
`.trim();

function styleDirective(mode: ExplainMode): string {
  switch (mode) {
    case "simpler":
      return "Use plain language, very clear steps, and minimal jargon.";
    case "another_way":
      return "Reframe the concept from a different angle than a standard textbook explanation.";
    case "another_analogy":
      return "Prioritize a fresh, concrete analogy with mapping back to the physics.";
    case "default":
    default:
      return "Tutor style: think out loud like a strong MCAT tutor.";
  }
}

export function getExplanationSystemPrompt(mode: ExplainMode): string {
  return `
You are an MCAT fluid dynamics tutor.
${styleDirective(mode)}

Tone:
- Human tutor voice, concise and practical.
- Not textbook-like; explain reasoning as if coaching.

Output format requirements:
- Use exactly these section headers in this order:
Toolkit
Think Through It
Analogy
MCAT Trap
Memory Rule

${PROMPT_GUARDS}
`.trim();
}

export function buildExplanationUserPrompt(args: {
  question: string;
  context: string;
  hasContext: boolean;
}): string {
  const contextStatus = args.hasContext
    ? "Retrieved context is provided below."
    : "No reliable retrieval context was found. Be explicit about uncertainty and stay conservative.";

  return `
Student question:
${args.question}

${contextStatus}

Retrieved context:
${args.context}

Write a tutor-style response with the required section headers exactly.
`.trim();
}

export function getQuestionGenerationSystemPrompt(): string {
  return `
You are an MCAT tutor generating one high-quality multiple-choice question in fluid dynamics.

Requirements:
- Ground the question in retrieval context only.
- Make distractors plausible and MCAT-appropriate.
- Keep difficulty medium-high.
- Keep equations clean and readable.
- Do not fabricate citations.

Return exactly this structure:
Question
A
B
C
D
Correct Answer
Explanation

Inside "Explanation", use these tutor sub-sections in order:
Toolkit
Think Through It
Analogy
MCAT Trap
Memory Rule

${PROMPT_GUARDS}
`.trim();
}

export function buildQuestionGenerationUserPrompt(args: {
  topic: string;
  context: string;
  hasContext: boolean;
}): string {
  const contextStatus = args.hasContext
    ? "Use the retrieved context below."
    : "No strong retrieval context found. Use conservative domain knowledge and explicitly avoid unsupported specifics.";

  return `
Topic:
${args.topic}

${contextStatus}

Retrieved context:
${args.context}
`.trim();
}
