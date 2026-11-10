"use client";

import { Keyboard, MessageSquareText, Mic, RefreshCw, Sparkles, UserRound, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { childLabel } from "@/components/app/child-switcher";
import { ConsentDialog } from "@/components/app/consent-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { DemoBadge, PageHeader, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { errorMessage, postJson } from "@/lib/api-client";
import { useAppData } from "@/lib/data/app-data";
import { REFINE_LABELS, type FeedbackType, type InputMethod, type RefineAction, type TranslationAlternative, type TranslationResult } from "@/lib/types";
import { DemandAnalysisCard } from "./demand-analysis";
import { ResultCard } from "./result-card";
import { VoiceRecorder } from "./voice-recorder";

const STAGES = [
  "Understanding what you want to communicate…",
  "Looking for sources of pressure in the wording…",
  "Writing six different ways to say it…",
  "Checking each alternative…",
];

const EXAMPLES = ["Put your shoes on now, we’re going to be late!", "Can you turn the tablet off, please?", "You need to brush your teeth before bed."];

const MAX_TEXT = 1000;
const MAX_SITUATION = 1500;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Translator() {
  const { selectedChild, settings, aiContext, translations, saved, feedback, actions, config } = useAppData();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const [method, setMethod] = React.useState<InputMethod>("text");
  const [text, setText] = React.useState("");
  const [situation, setSituation] = React.useState("");
  const [transcriptDemo, setTranscriptDemo] = React.useState(false);
  const [hasTranscript, setHasTranscript] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TranslationResult | null>(null);
  const [recordId, setRecordId] = React.useState<string | null>(null);
  const [recordChildId, setRecordChildId] = React.useState<string | null>(null);
  const [variant, setVariant] = React.useState(0);
  const [refining, setRefining] = React.useState<Record<string, RefineAction | null>>({});
  const [consentOpen, setConsentOpen] = React.useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Reopen a previous translation (?reopen=id) or reuse its wording (?text=…).
  const reopenId = params.get("reopen");
  const reuseText = params.get("text");
  const handledRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = reopenId ? `reopen:${reopenId}` : reuseText ? `text:${reuseText}` : null;
    if (!key || handledRef.current === key) return;
    handledRef.current = key;
    if (reopenId) {
      const record = translations.find((t) => t.id === reopenId);
      if (record) {
        setText(record.original);
        setSituation(record.situation);
        setMethod(record.inputMethod === "voice" ? "text" : record.inputMethod);
        setResult(record.result);
        setRecordId(record.id);
        setRecordChildId(record.childProfileId);
      }
    } else if (reuseText) {
      setText(reuseText.slice(0, MAX_TEXT));
      setSituation((params.get("situation") ?? "").slice(0, MAX_SITUATION));
      setResult(null);
      setRecordId(null);
    }
    router.replace("/translator", { scroll: false });
  }, [reopenId, reuseText, translations, params, router]);

  React.useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), config?.ai.live ? 4500 : 500);
    return () => window.clearInterval(timer);
  }, [loading, config?.ai.live]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const effectiveText = method === "situation" && !text.trim() ? situation.trim() : text.trim();
  const canSubmit = effectiveText.length > 0 && !loading;

  const translate = async (nextVariant: number) => {
    if (!effectiveText) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStage(0);
    setError(null);
    const inputMethod: InputMethod = method === "voice" || (method === "text" && hasTranscript) ? "voice" : method;
    const sentSituation = method === "situation" && text.trim() ? situation.trim() : method === "situation" ? "" : situation.trim();
    try {
      const { result: next } = await postJson<{ result: TranslationResult }>(
        "/api/translate",
        { text: effectiveText, situation: sentSituation, inputMethod, childContext: aiContext.childContext, preferences: aiContext.preferences, variant: nextVariant },
        controller.signal,
      );
      setResult(next);
      setVariant(nextVariant);
      setRecordId(null);
      setRecordChildId(selectedChild?.id ?? null);
      if (settings.saveHistory) {
        try {
          const record = await actions.createTranslation({ childProfileId: selectedChild?.id ?? null, original: next.original, situation: next.situation, inputMethod, result: next });
          setRecordId(record.id);
        } catch {
          toast("Translated, but it couldn’t be saved to your history.", "error");
        }
      }
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(errorMessage(err));
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  /** Saving and feedback need a stored translation; create one on demand if history is switched off. */
  const ensureRecord = async (current: TranslationResult): Promise<string> => {
    if (recordId) return recordId;
    const record = await actions.createTranslation({
      childProfileId: recordChildId, original: current.original, situation: current.situation,
      inputMethod: method === "voice" ? "voice" : method, result: current,
    });
    setRecordId(record.id);
    return record.id;
  };

  const persistResult = async (next: TranslationResult) => {
    setResult(next);
    if (recordId) {
      try {
        await actions.updateTranslationResult(recordId, next);
      } catch {
        /* the on-screen result is still correct; history will show the earlier version */
      }
    }
  };

  const refine = async (alternative: TranslationAlternative, action: RefineAction) => {
    if (!result) return;
    setRefining((r) => ({ ...r, [alternative.id]: action }));
    try {
      const { alternative: refined } = await postJson<{ alternative: TranslationAlternative }>("/api/translate/refine", {
        action,
        original: result.original,
        situation: result.situation,
        style: alternative.style,
        currentText: alternative.text,
        intentSummary: result.intent.summary,
        topic: result.intent.topic,
        involvesSafety: result.intent.involvesSafety,
        triggers: result.demandAnalysis.triggers.map((t) => ({ type: t.type, phrase: t.phrase })),
        childContext: aiContext.childContext,
        preferences: aiContext.preferences,
        variant: variant + result.alternatives.length,
      });
      let alternatives: TranslationAlternative[];
      if (action === "another") {
        const index = result.alternatives.findIndex((a) => a.id === alternative.id);
        alternatives = [...result.alternatives.slice(0, index + 1), refined, ...result.alternatives.slice(index + 1)];
        toast("Added another alternative.");
      } else if (action === "explain") {
        alternatives = result.alternatives.map((a) => (a.id === alternative.id ? { ...a, explanation: refined.explanation } : a));
      } else {
        // Keep the id so saved/feedback state stays attached to the card.
        alternatives = result.alternatives.map((a) => (a.id === alternative.id ? { ...refined, id: a.id } : a));
        if (refined.text === alternative.text) toast(refined.explanation, "info");
      }
      await persistResult({ ...result, alternatives });
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setRefining((r) => ({ ...r, [alternative.id]: null }));
    }
  };

  const toggleSave = async (alternative: TranslationAlternative) => {
    if (!result) return;
    try {
      const id = await ensureRecord(result);
      const existing = saved.find((s) => s.translationId === id && s.alternativeId === alternative.id);
      if (existing) {
        await actions.unsave(existing.id);
        toast("Removed from saved.");
      } else {
        await actions.saveAlternative({ translationId: id, childProfileId: recordChildId, alternativeId: alternative.id, style: alternative.style, text: alternative.text, original: result.original });
        toast("Saved to your favourites.");
      }
    } catch {
      toast("That didn’t save. Please try again.", "error");
    }
  };

  const giveFeedback = async (alternative: TranslationAlternative, type: FeedbackType) => {
    if (!result) return;
    try {
      const id = await ensureRecord(result);
      await actions.addFeedback({ translationId: id, childProfileId: recordChildId, alternativeId: alternative.id, style: alternative.style, feedback: type });
      toast(recordChildId ? "Thank you – noted for this child’s profile." : "Thank you – feedback noted.");
    } catch {
      toast("Your feedback didn’t save. Please try again.", "error");
    }
  };

  const personalised = settings.shareProfileWithAi && Boolean(selectedChild);

  return (
    <div className="space-y-6">
      <PageHeader title="PDA Translator" description="Say it your way first. You’ll get six lower-pressure alternatives and an explanation of where the pressure sits." />

      <Card>
        <CardContent className="space-y-5">
          <Tabs value={method} onValueChange={(value) => setMethod(value as InputMethod)}>
            <TabsList aria-label="Input method">
              <TabsTrigger value="text"><Keyboard aria-hidden /> Text</TabsTrigger>
              <TabsTrigger value="voice"><Mic aria-hidden /> Voice</TabsTrigger>
              <TabsTrigger value="situation"><MessageSquareText aria-hidden /> Situation</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="translate-text">What do you want to say?</Label>
              <Textarea id="translate-text" value={text} maxLength={MAX_TEXT} rows={3} placeholder="For example: Put your shoes on now, we’re going to be late!" onChange={(e) => setText(e.target.value)} aria-describedby="text-count" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {text ? null : EXAMPLES.map((example) => (
                    <button key={example} type="button" onClick={() => setText(example)} className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-sage-300 hover:bg-sage-50">
                      {example}
                    </button>
                  ))}
                </div>
                <span id="text-count" className="ml-auto text-xs text-ink-500">{text.length}/{MAX_TEXT}</span>
              </div>
            </TabsContent>

            <TabsContent value="voice" className="space-y-4">
              <VoiceRecorder
                disabled={loading}
                onTranscript={(transcript, isDemo) => {
                  setText(transcript.slice(0, MAX_TEXT));
                  setTranscriptDemo(isDemo);
                  setHasTranscript(true);
                }}
              />
              {hasTranscript ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="transcript">Check and edit the transcript</Label>
                    {transcriptDemo ? <Badge tone="amber">Demo transcript – not your words</Badge> : null}
                  </div>
                  <Textarea id="transcript" value={text} maxLength={MAX_TEXT} rows={3} onChange={(e) => setText(e.target.value)} />
                  {transcriptDemo ? (
                    <p className="text-xs leading-relaxed text-ink-500">
                      Live transcription isn’t switched on yet, so an example sentence has been inserted and your recording was discarded. The site owner can enable it by adding an OpenAI API key.
                    </p>
                  ) : (
                    <p className="text-xs text-ink-500">Nothing is translated until you press the button below.</p>
                  )}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="situation" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="situation-main">What’s happening?</Label>
                <Textarea id="situation-main" value={situation} maxLength={MAX_SITUATION} rows={4} placeholder="For example: My child is refusing to get dressed. We need to leave for an appointment and they are becoming distressed." onChange={(e) => setSituation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="situation-text">What would you normally say? <span className="font-normal text-ink-500">(optional)</span></Label>
                <Textarea id="situation-text" value={text} maxLength={MAX_TEXT} rows={2} placeholder="For example: You need to get dressed now." onChange={(e) => setText(e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>

          {method !== "situation" ? (
            <details className="group rounded-2xl bg-cream-100 px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-ink-700 [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">+ Add some context (optional)</span>
                <span className="hidden group-open:inline">Context (optional)</span>
              </summary>
              <Textarea className="mt-3" aria-label="Context" value={situation} maxLength={MAX_SITUATION} rows={2} placeholder="Anything that would help – where you are, how the day is going…" onChange={(e) => setSituation(e.target.value)} />
            </details>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm">
            <UserRound className="size-4 shrink-0 text-sage-600" aria-hidden />
            {selectedChild ? (
              personalised ? (
                <span className="text-ink-700">Personalised for <strong>{childLabel(selectedChild.preferredName)}</strong> <span className="text-ink-500">(name is never sent)</span></span>
              ) : (
                <>
                  <span className="text-ink-700">Profile selected: <strong>{childLabel(selectedChild.preferredName)}</strong> – personalisation is off.</span>
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setConsentOpen(true)}>Turn on</Button>
                </>
              )
            ) : (
              <span className="text-ink-500">No child profile selected. <Link href="/profiles" className="font-medium text-sage-700 underline underline-offset-2">Add one</Link> for more tailored suggestions (optional).</span>
            )}
          </div>

          <Button size="lg" className="w-full sm:w-auto" disabled={!canSubmit} onClick={() => void translate(0)}>
            <Wand2 aria-hidden /> Translate
          </Button>
        </CardContent>
      </Card>

      <div ref={resultsRef} className="scroll-mt-20 space-y-4" aria-live="polite">
        {loading ? (
          <Card>
            <CardContent className="space-y-4" role="status">
              <p className="flex items-center gap-2.5 font-medium text-sage-800"><Sparkles className="size-4 animate-pulse-soft" aria-hidden /> {STAGES[stage]}</p>
              <Skeleton className="h-24" />
              <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
            </CardContent>
          </Card>
        ) : null}

        {error && !loading ? (
          <Card className="border-rose-soft-600/30">
            <CardContent role="alert">
              <p className="font-medium text-rose-soft-600">We couldn’t translate that just now</p>
              <p className="mt-1 text-sm text-ink-700">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void translate(variant)}><RefreshCw aria-hidden /> Try again</Button>
            </CardContent>
          </Card>
        ) : null}

        {result && !loading ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <h2 className="text-xl font-semibold text-ink-900">Your alternatives</h2>
              <div className="flex items-center gap-2">
                {result.meta.isDemo ? <DemoBadge /> : <Badge tone="outline">AI-generated</Badge>}
                <Button variant="outline" size="sm" onClick={() => void translate(variant + 1)} disabled={!effectiveText}>
                  <RefreshCw aria-hidden /> Try again
                </Button>
              </div>
            </div>

            <DemandAnalysisCard result={result} />

            {result.personalisationApplied.length > 0 ? (
              <div className="rounded-2xl border border-sage-200 bg-sage-50/70 px-4 py-3 text-sm text-sage-800">
                <p className="font-medium">Personalised using</p>
                <ul className="mt-1 list-disc pl-5 text-ink-700">{result.personalisationApplied.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {result.alternatives.map((alternative) => (
                <ResultCard
                  key={alternative.id}
                  alternative={alternative}
                  saved={Boolean(recordId && saved.some((s) => s.translationId === recordId && s.alternativeId === alternative.id))}
                  feedback={(recordId && feedback.find((f) => f.translationId === recordId && f.alternativeId === alternative.id)?.feedback) || null}
                  busyAction={refining[alternative.id] ?? null}
                  onCopy={async () => {
                    if (!(await copyText(alternative.text))) toast("Copying isn’t available in this browser.", "error");
                  }}
                  onToggleSave={() => void toggleSave(alternative)}
                  onFeedback={(type) => void giveFeedback(alternative, type)}
                  onRefine={(action) => void refine(alternative, action)}
                />
              ))}
            </div>

            <Card>
              <CardContent>
                <h2 className="text-base font-semibold text-ink-900">Why these are different from the original</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{result.overallExplanation}</p>
                <p className="mt-3 text-xs leading-relaxed text-ink-500">
                  Use “Adjust” on any card to {Object.values(REFINE_LABELS).slice(0, 5).map((l) => l.toLowerCase()).join(", ")} and more. These are suggestions, not clinical advice, and no wording can guarantee a particular response.
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} />
    </div>
  );
}
