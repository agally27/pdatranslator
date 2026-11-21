import type { ChildContext, ConfirmedPreference, DemandTrigger, RefineAction, StyleId } from "@/lib/types";
import type { DemandAnalysis, GeneratedAlternative, IntentAnalysis } from "../schemas/translation.schema";

/** Structured inputs for each translation task (consumed directly by the mock provider). */
export interface BaseInput {
  text: string;
  situation: string;
}

export interface GenerateInput extends BaseInput {
  intent: IntentAnalysis;
  demands: DemandAnalysis;
  childContext: ChildContext | null;
  preferences: ConfirmedPreference[];
  variant: number;
  /** Styles to (re)generate. Defaults to all six. */
  styles: StyleId[];
  /** Validation issues from a failed attempt, keyed by style. */
  previousIssues: Partial<Record<StyleId, string[]>>;
}

export interface ValidateInput extends BaseInput {
  intent: IntentAnalysis;
  alternatives: GeneratedAlternative[];
  childContext: ChildContext | null;
  preferences: ConfirmedPreference[];
}

export interface RefineInput extends BaseInput {
  action: RefineAction;
  style: StyleId;
  currentText: string;
  intentSummary: string;
  topic: string;
  involvesSafety: boolean;
  triggers: Pick<DemandTrigger, "type" | "phrase">[];
  childContext: ChildContext | null;
  preferences: ConfirmedPreference[];
  variant: number;
  previousIssues: string[];
}

export function hasPreference(preferences: ConfirmedPreference[], key: string): boolean {
  return preferences.some((p) => p.key === key);
}

/** First interest from a comma/“and”-separated list, tidied for use in a sentence. */
export function firstInterest(childContext: ChildContext | null): string | null {
  const raw = childContext?.interests?.trim();
  if (!raw) return null;
  const first = raw.split(/,|;|\band\b|\n/)[0]?.trim();
  if (!first || first.length > 40) return null;
  return first.replace(/[.!?]+$/, "");
}
