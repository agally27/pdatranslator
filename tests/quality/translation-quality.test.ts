import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/ai/providers/mock";
import { TranslateRequestSchema } from "@/lib/ai/schemas/translation.schema";
import { lintAlternative, wordCount } from "@/lib/ai/translation/heuristics";
import { runTranslationPipeline } from "@/lib/ai/translation/pipeline";
import { STYLE_IDS } from "@/lib/types";
import { SCENARIOS } from "./scenarios";

/**
 * Translation quality suite.
 *
 * Runs every scenario through the full pipeline (with the demo provider, so it
 * needs no credentials) and applies automated checks for semantic
 * preservation, naturalness, hidden demands and safety.
 *
 * Passing this suite shows the pipeline and its guard-rails behave as
 * designed. It is NOT clinical validation of any wording.
 * To evaluate a live model, see docs/TESTING_GUIDE.md ("Live evaluation").
 */
const provider = new MockProvider();
const LEVELS = { low: 0, moderate: 1, high: 2 } as const;

describe("scenario set", () => {
  it("contains at least 100 scenarios with unique ids", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });

  it("covers every required category", () => {
    const categories = new Set(SCENARIOS.map((s) => s.category));
    for (const c of ["direct", "indirect", "disguised", "question", "transition", "safety", "medical", "school", "eating", "personal-care", "sleep", "play", "family"]) {
      expect(categories.has(c as never), c).toBe(true);
    }
  });
});

describe.each(SCENARIOS)("$id – “$text”", (scenario) => {
  const run = () => runTranslationPipeline(provider, TranslateRequestSchema.parse({ text: scenario.text, situation: scenario.situation ?? "" }));

  it("produces six distinct, validated alternatives", async () => {
    const result = await run();

    // All six communication approaches, once each.
    expect(result.alternatives.map((a) => a.style).sort()).toEqual([...STYLE_IDS].sort());
    // Genuinely different wording, and none simply repeats the original.
    const texts = result.alternatives.map((a) => a.text.toLowerCase());
    expect(new Set(texts).size).toBe(6);
    for (const text of texts) expect(text).not.toBe(scenario.text.toLowerCase());

    for (const alt of result.alternatives) {
      // Validation stage passed (intent preserved, no demand, natural, safe…).
      expect(alt.validation.passed, `${alt.style}: ${alt.text} → ${alt.validation.issues.join("; ")}`).toBe(true);
      expect(alt.validation.checks.intentPreserved, `${alt.style} intent`).toBe(true);
      expect(alt.validation.checks.safetyPreserved, `${alt.style} safety`).toBe(true);

      // Hidden demands: independent re-check with the lint.
      const issues = lintAlternative(alt.text, { style: alt.style, involvesSafety: result.intent.involvesSafety });
      expect(issues, `${alt.style}: ${alt.text}`).toEqual([]);

      // Naturalness: sayable length, complete sentence, no leftovers.
      const words = wordCount(alt.text);
      expect(words).toBeGreaterThanOrEqual(2);
      expect(words).toBeLessThanOrEqual(60);
      expect(alt.text).toMatch(/^[A-Z“"'I]/);
      expect(alt.text).not.toMatch(/\s{2,}|undefined|[{}]/);
      expect(alt.explanation.length).toBeGreaterThan(20);
      // No guarantees about reactions.
      expect(`${alt.text} ${alt.explanation}`).not.toMatch(/guarantee|will definitely|always works/i);
    }

    const minimal = result.alternatives.find((a) => a.style === "minimal")!;
    expect(wordCount(minimal.text)).toBeLessThanOrEqual(12);
    expect(result.meta.isDemo).toBe(true);
  });

  it("analyses the demands in the original wording", async () => {
    const result = await run();
    const found = new Set(result.demandAnalysis.triggers.map((t) => t.type));
    for (const expected of scenario.expectTriggers) expect(found.has(expected), `expected ${expected}; found ${[...found].join(", ")}`).toBe(true);
    if (scenario.minLevel) expect(LEVELS[result.demandAnalysis.level]).toBeGreaterThanOrEqual(LEVELS[scenario.minLevel]);
    if (scenario.expectTriggers.length === 0) expect(result.demandAnalysis.level).toBe("low");
    expect(result.demandAnalysis.reasoning.length).toBeGreaterThan(20);
    expect(result.intent.summary.length).toBeGreaterThan(10);
  });

  it("handles safety correctly", async () => {
    const result = await run();
    expect(result.intent.involvesSafety).toBe(Boolean(scenario.safety));
    if (scenario.safety) {
      expect(result.intent.safetyNote.length).toBeGreaterThan(20);
      for (const alt of result.alternatives) expect(alt.validation.checks.safetyPreserved).toBe(true);
    }
  });
});
