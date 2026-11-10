import { REFINE_LABELS, STYLE_META, type AlternativeValidation, type ConfirmedPreference, type TranslationAlternative } from "@/lib/types";
import { uid } from "@/lib/utils";
import { RefinementSchema, type RefineRequest } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import { allChecksPassing, lintAlternative } from "./heuristics";
import { hasPreference, type RefineInput } from "./inputs";
import { PDA_FOUNDATION, escapeForPrompt, renderChildContext, renderOriginal, renderPreferences } from "./prompts";

const ACTION_INSTRUCTIONS: Record<RefineRequest["action"], string> = {
  shorter: "Make it noticeably shorter while keeping the same approach and intention.",
  more_natural: "Make it sound more like relaxed, everyday spoken language from a parent.",
  more_playful: "Make it more playful (humour, imagination or the child's interests), unless that would blur a safety boundary.",
  less_demanding: "Reduce the remaining sense of demand even further: no urgency, no expectation of a reply, no hidden instruction.",
  remove_questions: "Rewrite it with no questions at all, using statements and thinking aloud instead.",
  explain: "Do not change the wording. Return the same text, and in explanation give three or four sentences on why this wording may carry less pressure than the original, pointing to specific features of the language.",
  another: "Write a clearly different alternative using the same approach.",
};

function lintToValidation(text: string, request: RefineRequest, noQuestions: boolean): AlternativeValidation {
  const checks = allChecksPassing();
  const issues: string[] = [];
  for (const issue of lintAlternative(text, {
    style: request.style,
    involvesSafety: request.involvesSafety,
    noQuestions: noQuestions || request.action === "remove_questions",
  })) {
    checks[issue.check] = false;
    issues.push(issue.message);
  }
  return { passed: issues.length === 0, checks, issues };
}

/** Applies one refine control to one alternative, re-checking the result with the lint. */
export async function refineAlternative(provider: AIProvider, request: RefineRequest): Promise<TranslationAlternative> {
  const preferences = request.preferences as ConfirmedPreference[];
  const noQuestions = hasPreference(preferences, "fewer_questions");
  let previousIssues: string[] = [];
  let best: { text: string; explanation: string; validation: AlternativeValidation } | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    attempts++;
    const input: RefineInput = {
      text: request.original,
      situation: request.situation,
      action: request.action,
      style: request.style,
      currentText: request.currentText,
      intentSummary: request.intentSummary,
      topic: request.topic,
      involvesSafety: request.involvesSafety,
      triggers: request.triggers,
      childContext: request.childContext ?? null,
      preferences,
      variant: request.variant + attempt,
      previousIssues,
    };
    const refined = await provider.generateObject({
      task: "refine",
      schemaName: "refined_alternative",
      schema: RefinementSchema,
      input,
      maxTokens: 2500,
      system: PDA_FOUNDATION,
      prompt: `Adjust one PDA-informed alternative at the parent's request ("${REFINE_LABELS[request.action]}").

${renderOriginal(request.original, request.situation)}

The adult's intention: ${escapeForPrompt(request.intentSummary || "not recorded")}
${request.involvesSafety ? "SAFETY: a real safety boundary applies and must stay completely clear." : ""}
Approach: ${request.style} – ${STYLE_META[request.style].description}
Pressure features in the original: ${request.triggers.map((t) => `${t.type} (“${escapeForPrompt(t.phrase)}”)`).join("; ") || "none recorded"}

${renderChildContext(request.childContext)}
${renderPreferences(preferences)}

Current wording:
<alternative style="${request.style}">${escapeForPrompt(request.currentText)}</alternative>

Task: ${ACTION_INSTRUCTIONS[request.action]}
Keep the adult's intention, stay within the ${request.style} approach, and follow every rule above.
${previousIssues.length ? `Your previous attempt had these problems – fix them: ${previousIssues.map(escapeForPrompt).join(" ")}` : ""}
Return text (the wording) and explanation (one or two sentences describing what changed in the language; for "Explain why", three or four sentences).`,
    });

    const text = refined.text.trim();
    const validation = lintToValidation(text, request, noQuestions);
    best = { text, explanation: refined.explanation.trim(), validation };
    if (validation.passed || request.action === "explain") break;
    previousIssues = validation.issues;
  }

  return {
    id: uid("alt"),
    style: request.style,
    text: best!.text,
    explanation: best!.explanation,
    validation: best!.validation,
    attempts,
    refinedBy: request.action,
  };
}
