import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceCitation } from "@/lib/types";
import { BookMarked } from "lucide-react";

interface SourceCardsProps {
  sources: SourceCitation[];
}

export function SourceCards({ sources }: SourceCardsProps) {
  if (sources.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6">
          <BookMarked className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No sources were used for this response.
          </p>
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
              <CardTitle className="text-sm font-semibold leading-snug">{source.source}</CardTitle>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs font-normal">
                  {source.sourceFile}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal">
                  p. {source.pageStart}
                  {source.pageEnd !== source.pageStart ? `–${source.pageEnd}` : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-28 rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {source.snippet}
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

