import { BookMarked } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceCitation } from "@/lib/types";

interface SourceCardsProps {
  sources: SourceCitation[];
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

  return cleaned.replace(
    /(^|[^\\])\b(frac|text|rho|sqrt|cdot|times|Delta|approx|left|right)\b/g,
    "$1\\\\$2",
  );
}

function normalizeSourceSnippet(text: string): string {
  let output = text.replace(/\r\n/g, "\n").replace(/\\\$/g, "$");
  output = output.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_m, expr) => `$$${cleanMathPayload(expr)}$$`);
  output = output.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);
  output = output.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => `$$${cleanMathPayload(expr)}$$`);
  output = output.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);

  return output
    .split("\n")
    .map((line) => {
      if (line.includes("$$") && !/^\s*\$\$[\s\S]*\$\$\s*$/.test(line.trim())) {
        return line.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => `$${cleanMathPayload(expr)}$`);
      }
      return line;
    })
    .join("\n");
}

export function SourceCards({ sources }: SourceCardsProps) {
  if (sources.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6">
          <BookMarked className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No sources were used for this response.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookMarked className="size-4" aria-hidden />
        Cited sources
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((source) => (
          <Card key={source.id} className="overflow-hidden border-primary/10 transition-shadow hover:shadow-md">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-base font-semibold leading-snug">{source.source}</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs font-normal">
                  {source.sourceFile}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                  p. {source.pageStart}
                  {source.pageEnd !== source.pageStart ? `-${source.pageEnd}` : ""}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  Chunk {source.chunkIndex}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-28 rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    p: (props) => <p className="mb-2 last:mb-0" {...props} />,
                    code: ({ children, ...props }) => (
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    ),
                  }}
                >
                  {normalizeSourceSnippet(source.snippet)}
                </ReactMarkdown>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
