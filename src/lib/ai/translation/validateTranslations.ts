import type { AlternativeValidation, StyleId, ValidationChecks } from "@/lib/types";
import { ValidationSchema, type GeneratedAlternative } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import { allChecksPassing, lintAlternative } from "./heuristics";
import { hasPreference, type ValidateInput } from "./inputs";
import { PDA_FOUNDATION, escapeForPrompt, renderChildContext, renderOriginal, renderPreferences } from "./prompts";

/**
 * Stage 5 – independent review of every generated alternative.
 *
 * Two layers, and an alternative must pass both:
 *  1. a separate AI review call (the reviewer does not see the generator's explanation);
 *  2. the deterministic lint in heuristics.ts, which cannot be talked out of an obvious demand phrase.
 */
export async function validateTranslations(
  provider: AIProvider,
  input: ValidateInput,
): Promise<Map<StyleId, AlternativeValidation>> {
  const out = new Map<StyleId, AlternativeValidation>();
  if (input.alternatives.length === 0) return out;

  const review = await provider.generateObject({
    task: "validate",
    schemaName: "translation_validation",
    schema: ValidationSchema,
    input,
    maxTokens: 5000,
    system: `${PDA_FOUNDATION}\n\nYou are acting as an independent, sceptical reviewer. You did not write these alternatives. Fail anything doubtful.`,
    prompt: `Review each alternative wording against the original.

${renderOriginal(input.text, input.situation)}

The adult's intention: ${escapeForPrompt(input.intent.summary)}
${input.intent.involvesSafety ? `Safety boundary that must be kept: ${escapeForPrompt(input.intent.safetyNote)}` : "No safety boundary applies."}

${renderChildContext(input.childContext)}
${renderPreferences(input.preferences)}

Alternatives to review:
${input.alternatives.map((alt) => `<alternative style="${alt.style}">${escapeForPrompt(alt.text)}</alternative>`).join("\n")}

For each alternative return its style, these checks (true = acceptable), and a list of short issue descriptions for every failed check (empty if none):
- intentPreserved: the adult's intention and practical objective are still communicated.
- pressureReduced: it carries clearly less pressure than the original (no urgency, conditions or repeated-request wording).
- noDirectDemand: no direct instruction and no demand disguised as a question, a "let's" or praise.
- natural: a parent could say it naturally, out loud, in the moment.
- noFalseChoice: any choice offered is a real one the child can actually make.
- noUnrealisticPromise: it promises nothing the adult cannot guarantee and predicts no reaction.
- respectsAutonomy: it does not manipulate, trick, shame, bribe or threaten.
- fitsProfile: it does not conflict with the shared profile or confirmed preferences (true if none were shared).
- appropriate: it suits the situation and the stated approach (minimal = twelve words or fewer).
- safetyPreserved: any necessary safety boundary remains clear (true if no safety boundary applies).`,
  });

  const byStyle = new Map(review.results.map((r) => [r.style, r]));
  const noQuestions = hasPreference(input.preferences, "fewer_questions");

  for (const alt of input.alternatives) {
    out.set(alt.style, mergeValidation(alt, byStyle.get(alt.style), input.intent.involvesSafety, noQuestions));
  }
  return out;
}

function mergeValidation(
  alt: GeneratedAlternative,
  review: { checks: ValidationChecks; issues: string[] } | undefined,
  involvesSafety: boolean,
  noQuestions: boolean,
): AlternativeValidation {
  const checks: ValidationChecks = review ? { ...review.checks } : allChecksPassing();
  const issues = review ? review.issues.map((i) => i.trim()).filter(Boolean) : [];
  if (!review) {
    // The reviewer skipped this alternative: treat as unreviewed rather than passed.
    checks.appropriate = false;
    issues.push("This alternative was not covered by the independent review.");
  }
  for (const issue of lintAlternative(alt.text, { style: alt.style, involvesSafety, noQuestions })) {
    checks[issue.check] = false;
    if (!issues.includes(issue.message)) issues.push(issue.message);
  }
  const passed = Object.values(checks).every(Boolean);
  return { passed, checks, issues: passed ? [] : issues.slice(0, 6) };
}
