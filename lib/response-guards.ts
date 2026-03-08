const SECTION_HEADINGS = ["Toolkit", "Think Through It", "Analogy", "MCAT Trap", "Memory Rule"] as const;

function normalizeParsingText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(Question|Correct Answer|Explanation|Toolkit|Think Through It|Analogy|MCAT Trap|Memory Rule)\*\*/gi, "$1")
    .replace(/^#+\s*(Question|Correct Answer|Explanation|Toolkit|Think Through It|Analogy|MCAT Trap|Memory Rule)\s*:?/gim, "$1");
}

function nextSectionStartIndex(text: string): number {
  const matcher = /^\s*(Think Through It|Analogy|MCAT Trap|Memory Rule)\s*:?\s*$/im;
  const match = matcher.exec(text);
  return match?.index ?? -1;
}

function extractToolkitItems(toolkitBody: string): string[] {
  const lines = toolkitBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s+/, "").replace(/^\d+[\).\s]+/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return lines;

  const sentenceCandidates = toolkitBody
    .split(/[.;]\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 12);

  return sentenceCandidates;
}

export function enforceToolkitItemCount(answer: string, minItems = 3, maxItems = 5): string {
  const text = normalizeParsingText(answer);
  const toolkitHeaderMatch = /^\s*Toolkit\s*:?\s*$/im.exec(text);
  if (!toolkitHeaderMatch || toolkitHeaderMatch.index === undefined) return answer;

  const toolkitStart = toolkitHeaderMatch.index;
  const toolkitBodyStart = toolkitStart + toolkitHeaderMatch[0].length;
  const remaining = text.slice(toolkitBodyStart);
  const nextSectionIndex = nextSectionStartIndex(remaining);
  if (nextSectionIndex < 0) return answer;

  const toolkitBody = remaining.slice(0, nextSectionIndex).trim();
  const afterToolkit = remaining.slice(nextSectionIndex).trimStart();
  const beforeToolkit = text.slice(0, toolkitStart).trimEnd();

  const rawItems = extractToolkitItems(toolkitBody);
  const dedupedItems = Array.from(new Set(rawItems.map((item) => item.replace(/\s+/g, " ").trim()))).filter(Boolean);

  const fallbackItems = [
    "Define the key variables and units.",
    "Use the governing fluid relationship(s).",
    "Check direction/sign and common constraint assumptions.",
  ];

  const items = dedupedItems.slice(0, maxItems);
  while (items.length < minItems) {
    items.push(fallbackItems[items.length % fallbackItems.length]);
  }

  const toolkitSection = `Toolkit\n${items.map((item) => `- ${item}`).join("\n")}\n`;
  const rebuilt = [beforeToolkit, toolkitSection, afterToolkit].filter(Boolean).join("\n\n");
  return rebuilt.trim();
}

export function hasValidMcqStructure(questionBlock: string): boolean {
  const text = normalizeParsingText(questionBlock);
  const hasQuestion = /(^|\n)\s*Question\b/i.test(text) || text.includes("?");
  const hasAllOptions = (["A", "B", "C", "D"] as const).every((key) =>
    new RegExp(`(^|\\n)\\s*${key}[\\)\\].:\\-]\\s+`, "i").test(text) ||
    new RegExp(`(^|\\n)\\s*${key}\\s*$`, "im").test(text),
  );
  const hasCorrectAnswer = /(^|\n)\s*Correct Answer\b/i.test(text);
  const hasExplanation = /(^|\n)\s*Explanation\b/i.test(text);
  return hasQuestion && hasAllOptions && hasCorrectAnswer && hasExplanation;
}

export function buildMcqRetryInstruction(original: string): string {
  return `${original}

IMPORTANT: Return exactly and only this format:
Question: <single question stem>
A) <option A>
B) <option B>
C) <option C>
D) <option D>
Correct Answer: <letter and brief reason>
Explanation:
Toolkit
Think Through It
Analogy
MCAT Trap
Memory Rule`;
}

export function hasAllTutorSections(answer: string): boolean {
  const lowered = normalizeParsingText(answer).toLowerCase();
  return SECTION_HEADINGS.every((heading) => lowered.includes(heading.toLowerCase()));
}

