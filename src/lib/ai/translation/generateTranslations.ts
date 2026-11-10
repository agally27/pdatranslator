import { STYLE_IDS } from "@/lib/types";
import { GenerationSchema, type Generation } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import type { GenerateInput } from "./inputs";
import { PDA_FOUNDATION, STYLE_GUIDE, escapeForPrompt, renderChildContext, renderOriginal, renderPreferences } from "./prompts";

/** Stage 4 – produce one genuinely different alternative per requested approach. */
export async function generateTranslations(provider: AIProvider, input: GenerateInput): Promise<Generation> {
  const retryNotes = Object.entries(input.previousIssues)
    .filter(([, issues]) => issues && issues.length > 0)
    .map(([style, issues]) => `- ${style}: ${issues!.map(escapeForPrompt).join(" ")}`)
    .join("\n");

  const result = await provider.generateObject({
    task: "generate",
    schemaName: "translation_alternatives",
    schema: GenerationSchema,
    input,
    maxTokens: 6000,
    system: PDA_FOUNDATION,
    prompt: `Rewrite the adult's wording as PDA-informed alternatives.

${renderOriginal(input.text, input.situation)}

What the adult is trying to achieve: ${escapeForPrompt(input.intent.summary)}
Practical objective: ${escapeForPrompt(input.intent.practicalObjective)}
${input.intent.involvesSafety ? `SAFETY: this involves a real safety boundary. ${escapeForPrompt(input.intent.safetyNote)} Every alternative must keep that boundary completely clear; reduce blame and urgency, not safety.` : "No safety boundary was identified."}

Pressure features found in the original:
${input.demands.triggers.map((t) => `- ${t.type}: “${escapeForPrompt(t.phrase)}”`).join("\n") || "- none"}

${renderChildContext(input.childContext)}
${renderPreferences(input.preferences)}

Write exactly one alternative for each of these approaches: ${input.styles.join(", ")}.
${STYLE_GUIDE}

Requirements:
- Each alternative must take a genuinely different approach, not the same sentence with softer words.
- Keep the adult's intention. Remove the pressure features listed above rather than hiding them.
- Prefer statements to questions. Any choice offered must be real. No bribes, threats, countdowns or conditions.
- Make no promises the adult cannot keep and no claims about how the child will react.
- Use the profile and confirmed preferences where they are relevant (interests for playfulness, sensory needs, what does not work). If nothing was shared, do not invent details about the child.
- One to three short sentences each; the minimal approach is twelve words or fewer.
- explanation: one or two sentences on which features of the wording changed and why that may lower pressure. Describe the language only.
${retryNotes ? `\nA previous attempt at these approaches failed review for the reasons below. Fix them:\n${retryNotes}\n` : ""}${input.variant > 0 ? `\nThis is a "try again" request (variation ${input.variant}): produce clearly different wording from an obvious first attempt.\n` : ""}
Also return overallExplanation: two or three sentences on how these alternatives differ from the original as a group. Include that none is guaranteed to work and the parent knows their child best.`,
  });

  // Keep only requested styles, one each, in canonical order.
  const seen = new Set<string>();
  const alternatives = result.alternatives
    .filter((alt) => input.styles.includes(alt.style) && !seen.has(alt.style) && seen.add(alt.style))
    .map((alt) => ({ ...alt, text: alt.text.trim(), explanation: alt.explanation.trim() }))
    .sort((a, b) => STYLE_IDS.indexOf(a.style) - STYLE_IDS.indexOf(b.style));
  return { alternatives, overallExplanation: result.overallExplanation.trim() };
}
