import { DemandAnalysisSchema, type DemandAnalysis } from "../schemas/translation.schema";
import type { AIProvider } from "../types";
import { detectDemandsHeuristic } from "./heuristics";
import type { BaseInput } from "./inputs";
import { DEMAND_GUIDE, PDA_FOUNDATION, escapeForPrompt, renderOriginal } from "./prompts";

/** Stage 2 – which features of the wording could be experienced as pressure? */
export async function detectDemands(provider: AIProvider, input: BaseInput): Promise<DemandAnalysis> {
  const hints = detectDemandsHeuristic(input.text);
  const hintText =
    hints.triggers.length > 0
      ? hints.triggers.map((t) => `- ${t.type}: “${escapeForPrompt(t.phrase)}”`).join("\n")
      : "- none found by the pattern check";

  const result = await provider.generateObject({
    task: "demands",
    schemaName: "demand_analysis",
    schema: DemandAnalysisSchema,
    input,
    maxTokens: 3000,
    system: PDA_FOUNDATION,
    prompt: `Identify the features of the adult's wording that could be experienced as a demand or as pressure.

${renderOriginal(input.text, input.situation)}

Demand types you may use:
${DEMAND_GUIDE}

A simple pattern check already noticed the following. Use it as a starting point; correct it where it is wrong and add anything it missed:
${hintText}

Return:
- level: "low", "moderate" or "high" potential demand, judging the wording itself.
- reasoning: two or three plain sentences explaining the level by pointing to features of the language. State that this is an assessment of the wording, not a prediction of behaviour.
- triggers: up to eight items, each with the type, the exact phrase quoted from the original, and a one-sentence explanation.`,
  });

  return { ...result, triggers: result.triggers.slice(0, 8) };
}
