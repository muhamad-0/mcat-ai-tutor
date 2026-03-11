"use client";

import { useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ChatPanel, type QuestionSeed } from "@/components/chat-panel";
import { QuestionGenerator, type TopicSeed } from "@/components/question-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Atom, Beaker, Compass, Menu, MessageCircle, PenLine } from "lucide-react";

type TabValue = "explain" | "question";

const EXPLAIN_PROMPTS: Array<{ label: string; prompt: string; mode?: QuestionSeed["mode"] }> = [
  { label: "Bernoulli Basics", prompt: "Explain Bernoulli's principle like I am brand new to it." },
  { label: "Simple Version", prompt: "Explain why fluid moves faster in a narrow pipe.", mode: "simpler" },
  { label: "Tighter Summary", prompt: "Explain buoyancy in a tighter high-yield way.", mode: "tighter" },
  { label: "Another Framing", prompt: "Explain Bernoulli another way with intuition first.", mode: "another_way" },
  { label: "Analogy Focus", prompt: "Give another analogy for Bernoulli's principle.", mode: "another_analogy" },
];

const TOPIC_PROMPTS = ["buoyancy", "continuity equation", "hydrostatic pressure", "viscosity and Poiseuille flow"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabValue>("explain");
  const [questionSeed, setQuestionSeed] = useState<QuestionSeed | null>(null);
  const [topicSeed, setTopicSeed] = useState<TopicSeed | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const seedCounterRef = useRef(0);

  const applyExplainPrompt = (prompt: string, mode?: QuestionSeed["mode"]) => {
    seedCounterRef.current += 1;
    setActiveTab("explain");
    setQuestionSeed({
      id: seedCounterRef.current,
      text: prompt,
      mode,
    });
    setIsDrawerOpen(false);
  };

  const applyTopicPrompt = (topic: string) => {
    seedCounterRef.current += 1;
    setActiveTab("question");
    setTopicSeed({
      id: seedCounterRef.current,
      text: topic,
    });
    setIsDrawerOpen(false);
  };

  const sidePanel = (
    <div className="space-y-4">
      {activeTab === "explain" && (
        <Card className="border-primary/20 bg-gradient-to-b from-primary/10 to-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide text-muted-foreground">
              <Compass className="size-4 text-primary" />
              Quick Start Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXPLAIN_PROMPTS.map((item) => (
              <Button
                key={item.label}
                variant="outline"
                className="h-auto w-full justify-start border-primary/20 bg-background/70 px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
                onClick={() => applyExplainPrompt(item.prompt, item.mode)}
              >
                <span className="text-sm font-semibold">{item.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      {activeTab === "question" && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide text-muted-foreground">
              <Beaker className="size-4 shrink-0 text-primary" />
              <span>Practice Topics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TOPIC_PROMPTS.map((topic) => (
              <Button
                key={topic}
                variant="ghost"
                className="h-auto min-w-0 w-full justify-start whitespace-normal break-words rounded-lg px-3 py-2.5 text-left text-base font-medium transition-colors hover:bg-primary/8"
                onClick={() => applyTopicPrompt(topic)}
              >
                {topic}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Atom className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-wide">MCAT AI Tutor</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant={activeTab === "explain" ? "default" : "ghost"}
              size="default"
              onClick={() => setActiveTab("explain")}
            >
              <MessageCircle className="mr-1.5 size-4" />
              Explain
            </Button>
            <Button
              variant={activeTab === "question" ? "default" : "ghost"}
              size="default"
              onClick={() => setActiveTab("question")}
            >
              <PenLine className="mr-1.5 size-4" />
              Practice
            </Button>
          </div>
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden">
              <span className="sr-only">Open study tools</span>
              <span aria-hidden>
                <Menu className="size-4" />
              </span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Study Tools</SheetTitle>
              </SheetHeader>
              <div className="mt-5">{sidePanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ScrollArea className="h-[calc(100vh-7.5rem)] pr-3">{sidePanel}</ScrollArea>
          </div>
        </aside>

        <section className="space-y-6">
          <AppHeader />

          <Card className="border-primary/20 bg-card/85 shadow-sm">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1.5">
                  <TabsTrigger
                    value="explain"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold transition-all duration-200",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    )}
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    <span>Explain a concept</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="question"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold transition-all duration-200",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    )}
                  >
                    <PenLine className="size-4" aria-hidden />
                    <span>Generate question</span>
                  </TabsTrigger>
                </TabsList>
                <Separator className="my-5" />
                <TabsContent value="explain" className="mt-0 animate-in fade-in-25 duration-300">
                  <ChatPanel seed={questionSeed} />
                </TabsContent>
                <TabsContent value="question" className="mt-0 animate-in fade-in-25 duration-300">
                  <QuestionGenerator seed={topicSeed} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
