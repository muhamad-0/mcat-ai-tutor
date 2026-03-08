import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Brain,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

const SECTION_ORDER = [
  "Toolkit",
  "Think Through It",
  "Analogy",
  "MCAT Trap",
  "Memory Rule",
] as const;

type SectionName = (typeof SECTION_ORDER)[number];

const SECTION_META: Record<
  SectionName,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  Toolkit: { icon: BookOpen, accent: "text-primary" },
  "Think Through It": { icon: Brain, accent: "text-blue-600 dark:text-blue-400" },
  Analogy: { icon: Lightbulb, accent: "text-amber-600 dark:text-amber-400" },
  "MCAT Trap": { icon: AlertTriangle, accent: "text-destructive" },
  "Memory Rule": { icon: GraduationCap, accent: "text-emerald-600 dark:text-emerald-400" },
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSectionLabels(input: string): string {
  let output = input.replace(/\r\n/g, "\n");
  const headings = [...SECTION_ORDER];

  for (const heading of headings) {
    const escaped = escapeRegex(heading);

    // Turn markdown/bold heading variants into plain heading lines.
    output = output.replace(
      new RegExp(`(^|\\n)\\s*[#>*-]*\\s*\\*{0,2}${escaped}\\*{0,2}\\s*:?[ \\t]*`, "gim"),
      `$1${heading}\n`,
    );

    // Split inline headings that appear after sentence text.
    output = output.replace(
      new RegExp(`([.?!])\\s+\\*{0,2}${escaped}\\*{0,2}\\s*:?[ \\t]*`, "gi"),
      `$1\n\n${heading}\n`,
    );

    // Split headings chained in same paragraph: "... Toolkit ... Think Through It ..."
    output = output.replace(
      new RegExp(`\\s+\\*{0,2}${escaped}\\*{0,2}\\s*:?[ \\t]+`, "gi"),
      `\n${heading}\n`,
    );
  }

  return output.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeHeading(line: string): SectionName | null {
  const cleaned = line.replace(/^#{1,4}\s*/, "").replace(/:$/, "").trim().toLowerCase();
  if (cleaned === "toolkit") return "Toolkit";
  if (cleaned === "think through it") return "Think Through It";
  if (cleaned === "analogy") return "Analogy";
  if (cleaned === "mcat trap") return "MCAT Trap";
  if (cleaned === "memory rule") return "Memory Rule";
  return null;
}

function parseSections(answer: string): Partial<Record<SectionName, string>> | null {
  const lines = normalizeSectionLabels(answer).split(/\r?\n/);
  const sections: Partial<Record<SectionName, string>> = {};
  let current: SectionName | null = null;

  for (const rawLine of lines) {
    const heading = normalizeHeading(rawLine.trim());
    if (heading) {
      current = heading;
      sections[current] = "";
      continue;
    }

    if (!current) continue;
    sections[current] = `${sections[current] ?? ""}${rawLine}\n`;
  }

  const filledCount = SECTION_ORDER.filter(
    (section) => (sections[section] || "").trim().length > 0
  ).length;
  if (filledCount < 3) return null;
  return sections;
}

function cleanMathPayload(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^\$+/, "")
    .replace(/\$+$/, "")
    .replace(/^\\\[/, "")
    .replace(/\\\]$/, "")
    .replace(/^\\\(/, "")
    .replace(/\\\)$/, "")
    .replace(/\\\\(?=[()[\]{}])/g, "\\")
    .replace(/\\\\([a-zA-Z]+)/g, "\\$1")
    .trim();

  // Recover common LaTeX commands when model omits the leading backslash.
  return cleaned.replace(
    /(^|[^\\])\b(frac|text|rho|sqrt|cdot|times|Delta|approx|left|right)\b/g,
    "$1\\\\$2",
  );
}

function isEquationLikeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 160) return false;
  if (!/=/.test(trimmed)) return false;
  if (/[.?!]\s*$/.test(trimmed)) return false;
  return /\\(frac|rho|text|sqrt|cdot|times|Delta|approx)|[_^{}]/.test(trimmed);
}

function normalizeTutorMath(text: string): string {
  let output = text.replace(/\r\n/g, "\n");

  // Unescape model-produced dollar signs so math delimiters are parsable.
  output = output.replace(/\\\$/g, "$");

  // Convert escaped LaTeX delimiters to markdown math delimiters.
  output = output.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, expr) => `$$${cleanMathPayload(expr)}$$`);
  output = output.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);

  // Clean malformed existing delimiter blocks, e.g. $$$P...$$ or $...$ with stray dollars.
  output = output.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => `$$${cleanMathPayload(expr)}$$`);
  output = output.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);

  // Convert literal bracket equation lines like: [ p_1 + ... = p_2 + ... ]
  output = output.replace(/^\s*\[(.*)\]\s*$/gm, (_m, expr) => {
    const cleaned = cleanMathPayload(expr);
    return /[\\_^=]/.test(cleaned) ? `$$${cleaned}$$` : `[${expr}]`;
  });

  const lines = output.split("\n").map((line) => {
    // If $$...$$ appears inline with other sentence text, convert it to inline $...$.
    if (line.includes("$$") && !/^\s*\$\$[\s\S]*\$\$\s*$/.test(line.trim())) {
      line = line.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.includes("$")) return line;
    if (isEquationLikeLine(trimmed)) {
      return `$$${cleanMathPayload(trimmed)}$$`;
    }
    return line;
  });

  return lines.join("\n");
}

const markdownComponents = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-7 last:mb-0 text-foreground/90" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-4 list-disc space-y-1.5 [&>li]:leading-7" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-4 list-decimal space-y-1.5 [&>li]:leading-7" {...props} />
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-2 mt-5 text-lg font-semibold tracking-tight" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-4 text-base font-semibold" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="mb-2 mt-3 text-sm font-semibold" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-4 border-l-4 border-primary/50 bg-primary/5 pl-4 italic text-muted-foreground"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/50" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-2 text-left font-medium" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t px-4 py-2" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b last:border-b-0" {...props} />
  ),
  code: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <pre className="my-4 overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-relaxed">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    );
  },
};

function MarkdownBlock({ text }: { text: string }) {
  const normalized = normalizeTutorMath(text);

  return (
    <div className="prose-p:mb-4 prose-ul:mb-4 prose-ol:mb-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

interface AnswerRendererProps {
  answer: string;
}

export function AnswerRenderer({ answer }: AnswerRendererProps) {
  const parsedSections = parseSections(answer);

  if (!parsedSections) {
    return (
      <Card className="border-primary/20 bg-gradient-to-b from-card to-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="size-5 text-primary" aria-hidden />
            Here&apos;s the answer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-base leading-relaxed">
          <MarkdownBlock text={answer} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {SECTION_ORDER.map((sectionName) => {
        const content = (parsedSections[sectionName] ?? "").trim();
        if (!content) return null;

        const meta = SECTION_META[sectionName];
        const Icon = meta.icon;

        return (
          <Card
            key={sectionName}
            className="overflow-hidden border-l-4 border-l-primary/30 transition-shadow hover:shadow-md"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ${meta.accent}`}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                {sectionName}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-base leading-relaxed">
              <MarkdownBlock text={content} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
