import {
  PREFERENCE_STATEMENTS,
  type ChildContext,
  type ChildProfile,
  type CommunicationPreference,
  type ConfirmedPreference,
  type FeedbackType,
  type PreferenceCategory,
  type PreferenceKey,
  type StyleId,
  type TranslationFeedback,
  type UserSettings,
} from "@/lib/types";

/**
 * Personalisation engine.
 *
 * Turns structured feedback into tentative insights, and decides what may be
 * passed to the AI layer. Three categories are kept strictly apart:
 *
 *   confirmed   – stated or confirmed by the parent → the ONLY category used by the AI
 *   observation – the same signal seen in the parent's feedback at least twice
 *   suggestion  – a single signal; a tentative idea
 *
 * Nothing moves to "confirmed" unless the parent presses Confirm.
 */

type Rule = { style: StyleId | "any"; feedback: FeedbackType; key: Exclude<PreferenceKey, "custom"> };

export const INSIGHT_RULES: Rule[] = [
  { style: "descriptive", feedback: "worked", key: "prefers_descriptive" },
  { style: "playful", feedback: "worked", key: "humour_helps" },
  { style: "minimal", feedback: "worked", key: "prefers_minimal" },
  { style: "collaborative", feedback: "worked", key: "prefers_collaborative" },
  { style: "reassuring", feedback: "worked", key: "reassurance_helps" },
  { style: "autonomy", feedback: "still_demanding", key: "choices_pressure" },
  { style: "autonomy", feedback: "not_appropriate", key: "choices_pressure" },
  { style: "collaborative", feedback: "still_demanding", key: "fewer_questions" },
  { style: "any", feedback: "too_complicated", key: "short_explanations" },
];

export const OBSERVATION_THRESHOLD = 2;

export interface Insight {
  childProfileId: string | null;
  key: Exclude<PreferenceKey, "custom">;
  statement: string;
  category: Exclude<PreferenceCategory, "confirmed">;
  source: "feedback" | "ai";
  evidenceCount: number;
}

export function deriveInsights(feedback: TranslationFeedback[]): Insight[] {
  const counts = new Map<string, { childProfileId: string | null; key: Insight["key"]; count: number }>();
  for (const item of feedback) {
    for (const rule of INSIGHT_RULES) {
      if (rule.feedback !== item.feedback) continue;
      if (rule.style !== "any" && rule.style !== item.style) continue;
      const mapKey = `${item.childProfileId ?? "none"}:${rule.key}`;
      const entry = counts.get(mapKey) ?? { childProfileId: item.childProfileId, key: rule.key, count: 0 };
      entry.count += 1;
      counts.set(mapKey, entry);
    }
  }
  return Array.from(counts.values()).map(({ childProfileId, key, count }) => ({
    childProfileId,
    key,
    statement: PREFERENCE_STATEMENTS[key],
    category: count >= OBSERVATION_THRESHOLD ? "observation" : "suggestion",
    source: count >= OBSERVATION_THRESHOLD ? "feedback" : "ai",
    evidenceCount: count,
  }));
}

export interface InsightPlan {
  create: Insight[];
  update: { id: string; category: PreferenceCategory; source: CommunicationPreference["source"]; evidenceCount: number }[];
}

/**
 * Works out which preference rows to create or update after new feedback.
 * Confirmed preferences are never downgraded or re-categorised.
 */
export function planInsightSync(existing: CommunicationPreference[], feedback: TranslationFeedback[]): InsightPlan {
  const plan: InsightPlan = { create: [], update: [] };
  for (const insight of deriveInsights(feedback)) {
    const match = existing.find((p) => p.key === insight.key && p.childProfileId === insight.childProfileId);
    if (!match) {
      plan.create.push(insight);
    } else if (match.category === "confirmed") {
      if (match.evidenceCount !== insight.evidenceCount) {
        plan.update.push({ id: match.id, category: "confirmed", source: match.source, evidenceCount: insight.evidenceCount });
      }
    } else if (match.category !== insight.category || match.evidenceCount !== insight.evidenceCount) {
      plan.update.push({ id: match.id, category: insight.category, source: insight.source, evidenceCount: insight.evidenceCount });
    }
  }
  return plan;
}

/** The pseudonymised profile slice: every field except the preferred name. */
export function toChildContext(child: ChildProfile): ChildContext {
  return {
    ageRange: child.ageRange,
    communicationPreferences: child.communicationPreferences,
    preferredCommunicationStyle: child.preferredCommunicationStyle,
    sensorySensitivities: child.sensorySensitivities,
    interests: child.interests,
    anxietyTriggers: child.anxietyTriggers,
    transitionDifficulties: child.transitionDifficulties,
    responsesToQuestions: child.responsesToQuestions,
    responsesToChoices: child.responsesToChoices,
    effectiveStrategies: child.effectiveStrategies,
    approachesThatDontWork: child.approachesThatDontWork,
    notes: child.notes,
  };
}

/**
 * Builds what the client is allowed to send with an AI request.
 * Returns nothing unless the parent has opted in (settings.shareProfileWithAi).
 * Only parent-confirmed preferences are ever included.
 */
export function buildAiContext(
  child: ChildProfile | null | undefined,
  settings: Pick<UserSettings, "shareProfileWithAi"> | null | undefined,
  preferences: CommunicationPreference[],
): { childContext: ChildContext | null; preferences: ConfirmedPreference[] } {
  if (!child || !settings?.shareProfileWithAi) return { childContext: null, preferences: [] };
  return {
    childContext: toChildContext(child),
    preferences: preferences
      .filter((p) => p.category === "confirmed" && (p.childProfileId === child.id || p.childProfileId === null))
      .map((p) => ({ key: p.key, statement: p.statement })),
  };
}
