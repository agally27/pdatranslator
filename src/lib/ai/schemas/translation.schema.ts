import { z } from "zod";
import { DEMAND_TYPES, REFINE_ACTIONS, STYLE_IDS } from "@/lib/types";

/**
 * Schemas for every structured AI response in the translation workflow.
 * Kept deliberately simple (strings, booleans, enums, arrays) so they work with
 * the structured-output features of every supported provider. Length limits are
 * enforced after parsing in the pipeline rather than in the schema.
 */

export const StyleSchema = z.enum(STYLE_IDS);
export const DemandTypeSchema = z.enum(DEMAND_TYPES);

export const IntentSchema = z.object({
  summary: z.string(),
  practicalObjective: z.string(),
  topic: z.string(),
  involvesSafety: z.boolean(),
  safetyNote: z.string(),
});
export type IntentAnalysis = z.infer<typeof IntentSchema>;

export const DemandAnalysisSchema = z.object({
  level: z.enum(["low", "moderate", "high"]),
  reasoning: z.string(),
  triggers: z.array(
    z.object({
      type: DemandTypeSchema,
      phrase: z.string(),
      explanation: z.string(),
    }),
  ),
});
export type DemandAnalysis = z.infer<typeof DemandAnalysisSchema>;

export const GeneratedAlternativeSchema = z.object({
  style: StyleSchema,
  text: z.string(),
  explanation: z.string(),
});
export type GeneratedAlternative = z.infer<typeof GeneratedAlternativeSchema>;

export const GenerationSchema = z.object({
  alternatives: z.array(GeneratedAlternativeSchema),
  overallExplanation: z.string(),
});
export type Generation = z.infer<typeof GenerationSchema>;

export const ValidationChecksSchema = z.object({
  intentPreserved: z.boolean(),
  pressureReduced: z.boolean(),
  noDirectDemand: z.boolean(),
  natural: z.boolean(),
  noFalseChoice: z.boolean(),
  noUnrealisticPromise: z.boolean(),
  respectsAutonomy: z.boolean(),
  fitsProfile: z.boolean(),
  appropriate: z.boolean(),
  safetyPreserved: z.boolean(),
});

export const ValidationSchema = z.object({
  results: z.array(
    z.object({
      style: StyleSchema,
      checks: ValidationChecksSchema,
      issues: z.array(z.string()),
    }),
  ),
});
export type Validation = z.infer<typeof ValidationSchema>;

export const RefinementSchema = z.object({
  text: z.string(),
  explanation: z.string(),
});
export type Refinement = z.infer<typeof RefinementSchema>;

// ── API request schemas ─────────────────────────────────────────────────────

const shortText = (max: number) => z.string().trim().max(max);

export const ChildContextSchema = z.object({
  ageRange: shortText(40).default(""),
  communicationPreferences: shortText(600).default(""),
  preferredCommunicationStyle: shortText(300).default(""),
  sensorySensitivities: shortText(600).default(""),
  interests: shortText(300).default(""),
  anxietyTriggers: shortText(600).default(""),
  transitionDifficulties: shortText(600).default(""),
  responsesToQuestions: shortText(600).default(""),
  responsesToChoices: shortText(600).default(""),
  effectiveStrategies: shortText(600).default(""),
  approachesThatDontWork: shortText(600).default(""),
  notes: shortText(800).default(""),
});

export const ConfirmedPreferenceSchema = z.object({
  key: z.string().trim().max(40),
  statement: shortText(240),
});

export const TranslateRequestSchema = z.object({
  text: z.string().trim().min(1, "Please enter something to translate.").max(1000, "Please keep it under 1,000 characters."),
  situation: shortText(1500).default(""),
  inputMethod: z.enum(["text", "voice", "situation"]).default("text"),
  /** Only sent by the client when the parent has opted in to sharing profile details. */
  childContext: ChildContextSchema.nullish(),
  preferences: z.array(ConfirmedPreferenceSchema).max(30).default([]),
  /** Changes on "Try again" so a different set of alternatives is produced. */
  variant: z.number().int().min(0).max(1000).default(0),
});
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

export const RefineRequestSchema = z.object({
  action: z.enum(REFINE_ACTIONS),
  original: z.string().trim().min(1).max(1000),
  situation: shortText(1500).default(""),
  style: StyleSchema,
  currentText: z.string().trim().min(1).max(1200),
  intentSummary: shortText(600).default(""),
  topic: shortText(120).default(""),
  involvesSafety: z.boolean().default(false),
  triggers: z.array(z.object({ type: DemandTypeSchema, phrase: shortText(200) })).max(20).default([]),
  childContext: ChildContextSchema.nullish(),
  preferences: z.array(ConfirmedPreferenceSchema).max(30).default([]),
  variant: z.number().int().min(0).max(1000).default(1),
});
export type RefineRequest = z.infer<typeof RefineRequestSchema>;
