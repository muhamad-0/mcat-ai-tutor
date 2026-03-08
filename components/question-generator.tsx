"use client";

import { useEffect, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerRenderer } from "@/components/answer-renderer";
import { SourceCards } from "@/components/source-cards";
import { SourceCitation } from "@/lib/types";

export interface TopicSeed {
  id: number;
  text: string;
}

interface QuestionGeneratorProps {
  seed?: TopicSeed | null;
}

export function QuestionGenerator({ seed }: QuestionGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [questionBlock, setQuestionBlock] = useState("");
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!seed) return;
    setTopic(seed.text);
  }, [seed]);

  const generateQuestion = async () => {
    setError("");
    setQuestionBlock("");
    setSources([]);

    const trimmed = topic.trim();
    if (!trimmed) {
      setError("Enter a topic to generate a question.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });
      const payload = (await response.json()) as {
        questionBlock?: string;
        sources?: SourceCitation[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to generate question.");
        return;
      }

      setQuestionBlock(payload.questionBlock ?? "No question was returned.");
      setSources(payload.sources ?? []);
    } catch (requestError) {
      setError(`Request failed: ${String(requestError)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-b from-card via-card to-primary/5 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PenLine className="size-5" />
            </span>
            Generate an MCAT-style question
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Enter a topic and get a practice question with explanations drawn from your indexed materials.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topic-input" className="text-base font-semibold">
              Topic
            </label>
            <Input
              id="topic-input"
              placeholder="e.g. buoyancy, viscosity, Poiseuille's law, Bernoulli's equation"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="h-12 border-primary/20 bg-background/80 text-lg placeholder:text-base placeholder:text-muted-foreground"
            />
          </div>
          <Button
            size="lg"
            className="bg-primary text-base font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            onClick={generateQuestion}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Generating...
              </>
            ) : (
              "Generate question"
            )}
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive" className="rounded-lg">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card className="animate-in fade-in-50 duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              <Skeleton className="h-5 w-56" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </CardContent>
        </Card>
      ) : null}

      {questionBlock ? (
        <>
          <AnswerRenderer answer={questionBlock} />
          <SourceCards sources={sources} />
        </>
      ) : null}
    </div>
  );
}
