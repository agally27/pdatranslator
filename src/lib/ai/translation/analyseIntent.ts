import { IntentSchema, type IntentAnalysis } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import type { BaseInput } from "./inputs";
import { PDA_FOUNDATION, renderOriginal } from "./prompts";

/** Stage 1 – what is the speaker actually trying to achieve? */
export async function analyseIntent(provider: AIProvider, input: BaseInput): Promise<IntentAnalysis> {
  return provider.generateObject({
    task: "intent",
    schemaName: "intent_analysis",
    schema: IntentSchema,
    input,
    maxTokens: 2000,
    system: PDA_FOUNDATION,
    prompt: `Work out what the adult is really trying to communicate or achieve with the wording below.

${renderOriginal(input.text, input.situation)}

Return:
- summary: one sentence describing the adult's intention, without judgement.
- practicalObjective: the concrete thing the adult needs to happen (a short phrase).
- topic: a one- or two-word everyday category (for example "getting dressed", "mealtime", "school", "safety").
- involvesSafety: true only if there is a genuine risk of physical harm, a health necessity or another real safety boundary.
- safetyNote: if involvesSafety is true, one or two sentences on what boundary must be kept (and that in an emergency clear direct words and action come first). Otherwise an empty string.`,
  });
}
