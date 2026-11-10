import {
  PREFERENCE_STATEMENTS,
  STYLE_IDS,
  type AlternativeValidation,
  type ChildContext,
  type ConfirmedPreference,
  type StyleId,
  type TranslationAlternative,
  type TranslationResult,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import type { GeneratedAlternative, TranslateRequest } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import { analyseIntent } from "./analyseIntent";
import { detectDemands } from "./detectDemands";
import { generateTranslations } from "./generateTranslations";
import { allChecksPassing } from "./heuristics";
import { firstInterest } from "./inputs";
import { validateTranslations } from "./validateTranslations";

/** How many times a failing alternative is regenerated before it is returned flagged. */
export const MAX_REGENERATION_ROUNDS = 2;

const PREFERRED_STYLE: Partial<Record<string, StyleId>> = {
  prefers_descriptive: "descriptive",
  prefers_minimal: "minimal",
  prefers_collaborative: "collaborative",
  humour_helps: "playful",
  reassurance_helps: "reassuring",
};

function hasAnyContext(context: ChildContext | null | undefined): context is ChildContext {
  return Boolean(context && Object.values(context).some((v) => typeof v === "string" && v.trim() !== ""));
}

export function describePersonalisation(context: ChildContext | null, preferences: ConfirmedPreference[]): string[] {
  const applied: string[] = [];
  for (const pref of preferences) {
    const known = (PREFERENCE_STATEMENTS as Record<string, string>)[pref.key];
    applied.push(`Confirmed preference: ${(pref.statement || known || "").replace(/\.$/, "")}`);
  }
  if (context) {
    if (firstInterest(context)) applied.push("Interests from the profile (for playful ideas)");
    if (context.sensorySensitivities.trim()) applied.push("Sensory sensitivities from the profile");
    if (context.approachesThatDontWork.trim()) applied.push("Approaches that do not work, from the profile");
    if (context.ageRange.trim()) applied.push("Age range from the profile");
  }
  return applied.filter((s) => s.trim().length > 22 || s.startsWith("Age"));
}

export function orderStyles(preferences: ConfirmedPreference[]): StyleId[] {
  const preferred = preferences.map((p) => PREFERRED_STYLE[p.key]).filter((s): s is StyleId => Boolean(s));
  return Array.from(new Set([...preferred, ...STYLE_IDS]));
}

/**
 * The full multi-stage translation workflow:
 * intent → demand analysis → (context) → generation → validation → regeneration of failures.
 */
export async function runTranslationPipeline(provider: AIProvider, request: TranslateRequest): Promise<TranslationResult> {
  const started = Date.now();
  const base = { text: request.text, situation: request.situation };
  const childContext = hasAnyContext(request.childContext) ? request.childContext : null;
  const preferences = request.preferences as ConfirmedPreference[];

  // Stages 1 and 2 are independent, so they run together.
  const [intent, demands] = await Promise.all([analyseIntent(provider, base), detectDemands(provider, base)]);

  // Stage 3 (context) is the assembly of situation, profile and confirmed preferences
  // that is passed into generation and validation below.
  const current = new Map<StyleId, GeneratedAlternative>();
  const validations = new Map<StyleId, AlternativeValidation>();
  const attempts = new Map<StyleId, number>();
  let overallExplanation = "";
  let pending: StyleId[] = [...STYLE_IDS];
  let previousIssues: Partial<Record<StyleId, string[]>> = {};

  for (let round = 0; round <= MAX_REGENERATION_ROUNDS && pending.length > 0; round++) {
    // Stage 4
    const generation = await generateTranslations(provider, {
      ...base, intent, demands, childContext, preferences,
      variant: request.variant, styles: pending, previousIssues,
    });
    if (round === 0) overallExplanation = generation.overallExplanation;
    for (const alt of generation.alternatives) {
      current.set(alt.style, alt);
      attempts.set(alt.style, (attempts.get(alt.style) ?? 0) + 1);
    }

    // Stage 5
    const produced = generation.alternatives.filter((alt) => pending.includes(alt.style));
    const reviewed = await validateTranslations(provider, { ...base, intent, alternatives: produced, childContext, preferences });
    for (const [style, validation] of reviewed) validations.set(style, validation);

    previousIssues = {};
    pending = STYLE_IDS.filter((style) => {
      const validation = validations.get(style);
      if (!current.has(style)) {
        previousIssues[style] = ["No alternative was produced for this approach."];
        return true;
      }
      if (validation && !validation.passed) {
        previousIssues[style] = validation.issues;
        return true;
      }
      return false;
    });
  }

  const alternatives: TranslationAlternative[] = orderStyles(preferences)
    .filter((style) => current.has(style))
    .map((style) => {
      const alt = current.get(style)!;
      return {
        id: uid("alt"),
        style,
        text: alt.text,
        explanation: alt.explanation,
        validation: validations.get(style) ?? { passed: false, checks: allChecksPassing(), issues: ["Not reviewed."] },
        attempts: attempts.get(style) ?? 1,
      };
    });

  return {
    original: request.text,
    situation: request.situation,
    intent,
    demandAnalysis: demands,
    alternatives,
    overallExplanation,
    personalisationApplied: describePersonalisation(childContext, preferences),
    meta: {
      provider: provider.id,
      model: provider.model,
      isDemo: !provider.isLive,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      profileUsed: Boolean(childContext) || preferences.length > 0,
    },
  };
}
