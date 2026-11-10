"use client";

import { Bookmark, BookmarkCheck, Check, ChevronDown, Copy, MessageSquareHeart, SlidersHorizontal, TriangleAlert } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/misc";
import { CHECK_LABELS } from "@/lib/ai/translation/heuristics";
import { FEEDBACK_LABELS, FEEDBACK_TYPES, REFINE_ACTIONS, REFINE_LABELS, STYLE_META, type FeedbackType, type RefineAction, type TranslationAlternative, type ValidationChecks } from "@/lib/types";
import { cn } from "@/lib/utils";
import { STYLE_VISUAL } from "./styles";

interface Props {
  alternative: TranslationAlternative;
  saved: boolean;
  feedback: FeedbackType | null;
  busyAction: RefineAction | null;
  onCopy(): void;
  onToggleSave(): void;
  onFeedback(type: FeedbackType): void;
  onRefine(action: RefineAction): void;
}

export function ResultCard({ alternative, saved, feedback, busyAction, onCopy, onToggleSave, onFeedback, onRefine }: Props) {
  const visual = STYLE_VISUAL[alternative.style];
  const meta = STYLE_META[alternative.style];
  const Icon = visual.icon;
  const [copied, setCopied] = React.useState(false);
  const [showChecks, setShowChecks] = React.useState(false);
  const failed = (Object.keys(alternative.validation.checks) as (keyof ValidationChecks)[]).filter((k) => !alternative.validation.checks[k]);

  return (
    <article
      aria-label={`${meta.label} alternative`}
      className={cn("animate-fade-up rounded-(--radius-card) border border-l-4 border-ink-100 bg-white/90 p-5 shadow-(--shadow-soft)", visual.border)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", visual.chip)}>
          <Icon className="size-4" aria-hidden /> {meta.label}
        </span>
        <span className="flex items-center gap-1.5">
          {alternative.refinedBy && alternative.refinedBy !== "explain" ? <Badge tone="neutral">{alternative.refinedBy === "another" ? "Extra alternative" : "Adjusted"}</Badge> : null}
          <span className="text-xs text-ink-500">{meta.tagline}</span>
        </span>
      </header>

      <p className="mt-4 font-display text-xl leading-snug text-ink-900" aria-busy={busyAction !== null}>{alternative.text}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-500">{alternative.explanation}</p>

      {!alternative.validation.passed ? (
        <div className="mt-3 rounded-2xl bg-amber-soft-100 p-3 text-sm text-amber-soft-600" role="note">
          <p className="flex items-center gap-2 font-medium"><TriangleAlert className="size-4" aria-hidden /> Use your judgement with this one</p>
          <p className="mt-1 leading-relaxed">It did not pass every automatic check{alternative.attempts > 1 ? ` after ${alternative.attempts} attempts` : ""}:</p>
          <ul className="mt-1 list-disc pl-5">
            {(alternative.validation.issues.length > 0 ? alternative.validation.issues : failed.map((k) => CHECK_LABELS[k])).map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      ) : (
        <div className="mt-3">
          <button type="button" onClick={() => setShowChecks((v) => !v)} aria-expanded={showChecks} className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-sage-700 hover:text-sage-900">
            <Check className="size-3.5" aria-hidden /> Passed {Object.keys(alternative.validation.checks).length} checks
            <ChevronDown className={cn("size-3.5 transition-transform", showChecks && "rotate-180")} aria-hidden />
          </button>
          {showChecks ? (
            <ul className="mt-2 grid gap-1 text-xs text-ink-500 sm:grid-cols-2">
              {(Object.keys(alternative.validation.checks) as (keyof ValidationChecks)[]).map((key) => (
                <li key={key} className="flex items-center gap-1.5"><Check className="size-3 text-sage-600" aria-hidden /> {CHECK_LABELS[key]}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onCopy();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant={saved ? "secondary" : "outline"} size="sm" onClick={onToggleSave} aria-pressed={saved}>
          {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />} {saved ? "Saved" : "Save"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={feedback ? "secondary" : "outline"} size="sm">
              <MessageSquareHeart aria-hidden /> {feedback ? FEEDBACK_LABELS[feedback] : "Feedback"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>How did this one go?</DropdownMenuLabel>
            {FEEDBACK_TYPES.map((type) => (
              <DropdownMenuItem key={type} onSelect={() => onFeedback(type)}>
                <span className="flex-1">{FEEDBACK_LABELS[type]}</span>
                {feedback === type ? <Check aria-label="Selected" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={busyAction !== null}>
              {busyAction ? <Spinner label="Adjusting" /> : <SlidersHorizontal aria-hidden />} Adjust
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Adjust this alternative</DropdownMenuLabel>
            {REFINE_ACTIONS.map((action) => (
              <DropdownMenuItem key={action} onSelect={() => onRefine(action)}>{REFINE_LABELS[action]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
    </article>
  );
}
