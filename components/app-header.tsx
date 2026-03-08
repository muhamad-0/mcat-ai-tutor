import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BrainCircuit, Sparkles } from "lucide-react";

export function AppHeader() {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/8 via-card to-accent/20 px-7 py-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className="gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm uppercase tracking-wider text-primary-foreground">
          <BrainCircuit className="size-3.5" aria-hidden />
          MCAT AI Tutor
        </Badge>
        <Badge variant="secondary" className="gap-1.5 rounded-full px-3 py-1.5 text-sm">
          <Sparkles className="size-3.5" aria-hidden />
          Fluid Dynamics
        </Badge>
      </div>
      <div className="mt-5 space-y-2">
        <h1 className="text-4xl font-semibold md:text-5xl">Ask smarter, practice faster, retain longer.</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Explain concepts in multiple tutor styles and generate MCAT-caliber practice questions grounded in your PDFs.
        </p>
      </div>
    </Card>
  );
}
