import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { AnswerRenderer } from "@/components/answer-renderer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParsedQuestionBlock {
  question: string;
  options: Partial<Record<"A" | "B" | "C" | "D", string>>;
  correctAnswer: string;
  explanation: string;
}

function normalizeQuestionBlock(input: string): string {
  let output = input.replace(/\r\n/g, "\n");
  output = output.replace(/\*\*(Question|Correct Answer|Explanation)\*\*/gi, "$1");
  output = output.replace(/\*\*([ABCD])\*\*/g, "$1");
  output = output.replace(/^(#+\s*)?(Question|Correct Answer|Explanation)\s*[:\-]?\s*/gim, "$2: ");
  output = output.replace(/^(#+\s*)?([ABCD])\s*[\)\].\-:]\s*/gim, "$2) ");
  return output;
}

function parseQuestionBlock(input: string): ParsedQuestionBlock | null {
  const lines = normalizeQuestionBlock(input).split("\n");
  const parsed: ParsedQuestionBlock = {
    question: "",
    options: {},
    correctAnswer: "",
    explanation: "",
  };

  let current: "question" | "A" | "B" | "C" | "D" | "correctAnswer" | "explanation" | null = null;

  const pushLine = (key: typeof current, value: string) => {
    if (!key || !value.trim()) return;
    if (key === "question" || key === "correctAnswer" || key === "explanation") {
      parsed[key] = `${parsed[key]}${parsed[key] ? "\n" : ""}${value.trim()}`;
      return;
    }
    parsed.options[key] = `${parsed.options[key] ?? ""}${parsed.options[key] ? "\n" : ""}${value.trim()}`;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pushLine(current, "");
      continue;
    }

    const questionMatch = line.match(/^question\b\s*[:\-]?\s*(.*)$/i);
    if (questionMatch) {
      current = "question";
      if (questionMatch[1]) pushLine(current, questionMatch[1]);
      continue;
    }

    const optionInlineMatch = line.match(/^([ABCD])[\)\]:.\-]\s*(.*)$/i);
    if (optionInlineMatch) {
      current = optionInlineMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
      if (optionInlineMatch[2]) pushLine(current, optionInlineMatch[2]);
      continue;
    }

    const optionHeadingMatch = line.match(/^([ABCD])$/i);
    if (optionHeadingMatch) {
      current = optionHeadingMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
      continue;
    }

    const correctMatch = line.match(/^correct answer\b\s*[:\-]?\s*(.*)$/i);
    if (correctMatch) {
      current = "correctAnswer";
      if (correctMatch[1]) pushLine(current, correctMatch[1]);
      continue;
    }

    const explanationMatch = line.match(/^explanation\b\s*[:\-]?\s*(.*)$/i);
    if (explanationMatch) {
      current = "explanation";
      if (explanationMatch[1]) pushLine(current, explanationMatch[1]);
      continue;
    }

    pushLine(current, line);
  }

  const hasQuestion = parsed.question.trim().length > 0;
  const optionCount = (["A", "B", "C", "D"] as const).filter((key) => (parsed.options[key] ?? "").trim().length > 0).length;
  const hasExplanation = parsed.explanation.trim().length > 0;

  if (!hasQuestion || optionCount < 2 || !hasExplanation) return null;
  return parsed;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {text}
    </ReactMarkdown>
  );
}

interface QuestionBlockRendererProps {
  text: string;
}

export function QuestionBlockRenderer({ text }: QuestionBlockRendererProps) {
  const parsed = parseQuestionBlock(text);

  if (!parsed) {
    return <AnswerRenderer answer={text} />;
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">MCAT Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-base leading-relaxed">
            <MarkdownText text={parsed.question} />
          </div>

          <div className="space-y-3">
            {(["A", "B", "C", "D"] as const).map((key) => {
              const option = parsed.options[key];
              if (!option) return null;
              return (
                <div key={key} className="rounded-lg border bg-background/70 p-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5">
                      {key}
                    </Badge>
                    <div className="min-w-0 text-base leading-relaxed">
                      <MarkdownText text={option} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {parsed.correctAnswer ? (
            <div className="rounded-lg border border-primary/25 bg-primary/8 p-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Correct Answer</p>
              <div className="mt-1 text-base">
                <MarkdownText text={parsed.correctAnswer} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AnswerRenderer answer={parsed.explanation} />
    </div>
  );
}
