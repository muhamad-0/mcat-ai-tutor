"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AnswerRenderer } from "@/components/answer-renderer";
import { SourceCards } from "@/components/source-cards";
import { ExplainMode, SourceCitation } from "@/lib/types";

const MODE_OPTIONS: Array<{ value: ExplainMode; label: string }> = [
  { value: "default", label: "Standard explanation" },
  { value: "simpler", label: "Break it down simpler" },
  { value: "another_way", label: "Explain another way" },
  { value: "another_analogy", label: "Give me an analogy" },
];

export interface QuestionSeed {
  id: number;
  text: string;
  mode?: ExplainMode;
}

interface ChatPanelProps {
  seed?: QuestionSeed | null;
}

export function ChatPanel({ seed }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<ExplainMode>("default");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!seed) return;
    setQuestion(seed.text);
    if (seed.mode) setMode(seed.mode);
  }, [seed]);

  const submitQuestion = async () => {
    setError("");
    setAnswer("");
    setSources([]);

    const trimmed = question.trim();
    if (!trimmed) {
      setError("Enter a question to get started.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, mode }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        sources?: SourceCitation[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to generate an explanation.");
        return;
      }

      setAnswer(payload.answer ?? "No answer was returned.");
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
              <MessageCircle className="size-5" />
            </span>
            Ask anything about fluid dynamics
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Get clear explanations, analogies, and MCAT-style insights grounded in your course materials.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="explain-question" className="text-base font-semibold">
              Your question
            </label>
            <Textarea
              id="explain-question"
              placeholder="e.g. Explain Bernoulli's principle in simple terms, or: What's the difference between laminar and turbulent flow?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-h-36 resize-none border-primary/20 bg-background/80 text-lg placeholder:text-base placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:min-w-[220px]">
              <label htmlFor="mode-selector" className="text-base font-semibold">
                How would you like the explanation?
              </label>
              <Select value={mode} onValueChange={(value) => setMode(value as ExplainMode)}>
                <SelectTrigger id="mode-selector" className="h-11 border-primary/20 bg-background/80 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              className="w-full text-base font-semibold bg-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
              onClick={submitQuestion}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Thinking...
                </>
              ) : (
                "Get explanation"
              )}
            </Button>
          </div>
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
              <Skeleton className="h-5 w-48" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </CardContent>
        </Card>
      ) : null}

      {answer ? (
        <>
          <AnswerRenderer answer={answer} />
          <SourceCards sources={sources} />
        </>
      ) : null}
    </div>
  );
}
