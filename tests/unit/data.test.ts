import { beforeEach, describe, expect, it } from "vitest";
import { filterTranslations } from "@/components/app/history";
import { MockProvider } from "@/lib/ai/providers/mock";
import { TranslateRequestSchema } from "@/lib/ai/schemas/translation.schema";
import { runTranslationPipeline } from "@/lib/ai/translation/pipeline";
import { sanitiseChildInput } from "@/lib/data/client";
import { DEMO_USER, seedDemoData } from "@/lib/data/demo-seed";
import { LOCAL_KEY_PREFIX, LocalDataClient, MemoryStorage } from "@/lib/data/local";
import { fromRow, toRow } from "@/lib/data/supabase";
import { buildAiContext, deriveInsights, planInsightSync, toChildContext } from "@/lib/personalisation/engine";
import type { TranslationFeedback, TranslationResult } from "@/lib/types";

let storage: MemoryStorage;
let client: LocalDataClient;
let result: TranslationResult;

beforeEach(async () => {
  storage = new MemoryStorage();
  client = new LocalDataClient("user-a", storage);
  result = await runTranslationPipeline(new MockProvider(), TranslateRequestSchema.parse({ text: "Put your shoes on now." }));
});

describe("child profiles", () => {
  it("creates a profile with every field optional and selects the first one", async () => {
    const empty = await client.createChildProfile({});
    expect(empty.preferredName).toBe("");
    expect((await client.getSettings()).selectedChildProfileId).toBe(empty.id);
    const second = await client.createChildProfile({ preferredName: "  Robin ", interests: "trains" });
    expect(second.preferredName).toBe("Robin");
    expect(await client.listChildProfiles()).toHaveLength(2);
    expect((await client.getSettings()).selectedChildProfileId).toBe(empty.id);
  });
  it("edits a profile", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin" });
    const updated = await client.updateChildProfile(child.id, { ageRange: "6–8", interests: "space" });
    expect(updated).toMatchObject({ preferredName: "Robin", ageRange: "6–8", interests: "space" });
    await expect(client.updateChildProfile("missing", { ageRange: "1" })).rejects.toThrow();
  });
  it("deletes a profile, its preferences and unlinks (but keeps) history", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin" });
    await client.createPreference({ childProfileId: child.id, key: "humour_helps", statement: "Humour can be helpful.", category: "confirmed", source: "parent", evidenceCount: 0 });
    const record = await client.createTranslation({ childProfileId: child.id, original: result.original, situation: "", inputMethod: "text", result });
    await client.deleteChildProfile(child.id);
    expect(await client.listChildProfiles()).toEqual([]);
    expect(await client.listPreferences()).toEqual([]);
    expect((await client.listTranslations())[0]).toMatchObject({ id: record.id, childProfileId: null });
    expect((await client.getSettings()).selectedChildProfileId).toBeNull();
  });
  it("trims, length-limits and drops unknown fields", () => {
    const clean = sanitiseChildInput({ preferredName: `  ${"x".repeat(100)}`, notes: "ok", diagnosis: "should not be stored" } as never);
    expect(clean.preferredName).toHaveLength(60);
    expect(clean).not.toHaveProperty("diagnosis");
  });
});

describe("translation history, favourites and feedback", () => {
  it("stores translations newest first and deletes with their dependants", async () => {
    const a = await client.createTranslation({ childProfileId: null, original: "one", situation: "", inputMethod: "text", result });
    await new Promise((r) => setTimeout(r, 2));
    const b = await client.createTranslation({ childProfileId: null, original: "two", situation: "at the park", inputMethod: "voice", result });
    expect((await client.listTranslations()).map((t) => t.id)).toEqual([b.id, a.id]);
    expect(b).toMatchObject({ isDemo: true, inputMethod: "voice", situation: "at the park" });

    const alt = result.alternatives[0];
    await client.saveAlternative({ translationId: a.id, childProfileId: null, alternativeId: alt.id, style: alt.style, text: alt.text, original: "one" });
    await client.addFeedback({ translationId: a.id, childProfileId: null, alternativeId: alt.id, style: alt.style, feedback: "worked" });
    await client.deleteTranslation(a.id);
    expect(await client.listSaved()).toEqual([]);
    expect(await client.listFeedback()).toEqual([]);
    await client.clearTranslations();
    expect(await client.listTranslations()).toEqual([]);
  });
  it("saves an alternative once and can unsave it", async () => {
    const record = await client.createTranslation({ childProfileId: null, original: "one", situation: "", inputMethod: "text", result });
    const alt = result.alternatives[1];
    const input = { translationId: record.id, childProfileId: null, alternativeId: alt.id, style: alt.style, text: alt.text, original: "one" };
    const first = await client.saveAlternative(input);
    const again = await client.saveAlternative(input);
    expect(again.id).toBe(first.id);
    expect(await client.listSaved()).toHaveLength(1);
    await client.unsave(first.id);
    expect(await client.listSaved()).toEqual([]);
  });
  it("keeps one feedback per alternative (latest wins) and persists refinements", async () => {
    const record = await client.createTranslation({ childProfileId: null, original: "one", situation: "", inputMethod: "text", result });
    const alt = result.alternatives[0];
    const base = { translationId: record.id, childProfileId: null, alternativeId: alt.id, style: alt.style };
    await client.addFeedback({ ...base, feedback: "worked" });
    await client.addFeedback({ ...base, feedback: "too_complicated" });
    expect((await client.listFeedback()).map((f) => f.feedback)).toEqual(["too_complicated"]);
    await client.updateTranslationResult(record.id, { ...result, overallExplanation: "changed" });
    expect((await client.listTranslations())[0].result.overallExplanation).toBe("changed");
  });
  it("searches and filters history", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin" });
    const teeth = await runTranslationPipeline(new MockProvider(), TranslateRequestSchema.parse({ text: "Dinner is ready." }));
    const a = await client.createTranslation({ childProfileId: child.id, original: result.original, situation: "", inputMethod: "text", result });
    const b = await client.createTranslation({ childProfileId: null, original: teeth.original, situation: "after football", inputMethod: "text", result: teeth });
    const all = await client.listTranslations();
    const f = { query: "", child: "all", level: "all", onlySaved: false, onlyFeedback: false };
    const ids = (over: Partial<typeof f>, saved: string[] = [], fb: string[] = []) => filterTranslations(all, { ...f, ...over }, new Set(saved), new Set(fb)).map((t) => t.id);
    expect(ids({ query: "SHOES" })).toEqual([a.id]);
    expect(ids({ query: "football" })).toEqual([b.id]);
    expect(ids({ query: "peak deliciousness" })).toEqual([b.id]); // matches alternative text
    expect(ids({ child: child.id })).toEqual([a.id]);
    expect(ids({ child: "none" })).toEqual([b.id]);
    expect(ids({ level: "low" })).toEqual([b.id]);
    expect(ids({ onlySaved: true }, [a.id])).toEqual([a.id]);
    expect(ids({ onlyFeedback: true })).toEqual([]);
    expect(ids({ query: "zzz" })).toEqual([]);
  });
});

describe("specialist conversations", () => {
  it("creates, renames, orders and deletes conversations with their messages", async () => {
    const c = await client.createConversation({ title: "", childProfileId: null });
    expect(c.title).toBe("New conversation");
    await client.addMessage({ conversationId: c.id, role: "user", content: "hello", sources: [], isDemo: false, safetyFlag: false });
    await client.addMessage({ conversationId: c.id, role: "assistant", content: "hi", sources: [{ slug: "what-is-pda", title: "What is a PDA profile?" }], isDemo: true, safetyFlag: false });
    const messages = await client.listMessages(c.id);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(messages[1].sources[0].slug).toBe("what-is-pda");
    await client.renameConversation(c.id, "Mornings");
    expect((await client.listConversations())[0].title).toBe("Mornings");
    await expect(client.addMessage({ conversationId: "nope", role: "user", content: "x", sources: [], isDemo: false, safetyFlag: false })).rejects.toThrow();
    await client.deleteConversation(c.id);
    expect(await client.listConversations()).toEqual([]);
    expect(await client.listMessages(c.id)).toEqual([]);
  });
});

describe("personalisation engine", () => {
  const fb = (style: TranslationFeedback["style"], feedback: TranslationFeedback["feedback"], childProfileId: string | null = "c1", n = 0): TranslationFeedback =>
    ({ id: `f${n}${style}${feedback}`, userId: "u", translationId: `t${n}`, childProfileId, alternativeId: "a", style, feedback, createdAt: "" });

  it("turns a single signal into a suggestion and a repeated one into an observation – never confirmed", () => {
    expect(deriveInsights([fb("playful", "worked")])).toEqual([expect.objectContaining({ key: "humour_helps", category: "suggestion", source: "ai", evidenceCount: 1 })]);
    const repeated = deriveInsights([fb("playful", "worked", "c1", 1), fb("playful", "worked", "c1", 2)]);
    expect(repeated[0]).toMatchObject({ category: "observation", source: "feedback", evidenceCount: 2 });
    expect(deriveInsights([fb("autonomy", "still_demanding"), fb("minimal", "too_complicated"), fb("descriptive", "too_complicated", "c1", 3)]).map((i) => [i.key, i.category]))
      .toEqual([["choices_pressure", "suggestion"], ["short_explanations", "observation"]]);
    expect(deriveInsights([fb("playful", "didnt_work")])).toEqual([]);
  });
  it("keeps children separate", () => {
    const insights = deriveInsights([fb("playful", "worked", "c1", 1), fb("playful", "worked", "c2", 2)]);
    expect(insights).toHaveLength(2);
    expect(insights.every((i) => i.category === "suggestion")).toBe(true);
  });
  it("never downgrades or auto-confirms when syncing", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin" });
    const confirmed = await client.createPreference({ childProfileId: child.id, key: "humour_helps", statement: "Humour can be helpful.", category: "confirmed", source: "parent", evidenceCount: 0 });
    const feedback = [fb("playful", "worked", child.id, 1), fb("autonomy", "still_demanding", child.id, 2)];
    const plan = planInsightSync(await client.listPreferences(), feedback);
    expect(plan.create.map((i) => [i.key, i.category])).toEqual([["choices_pressure", "suggestion"]]);
    expect(plan.update).toEqual([{ id: confirmed.id, category: "confirmed", source: "parent", evidenceCount: 1 }]);
    expect([...plan.create, ...plan.update].some((x) => x.category === "confirmed" && "key" in x)).toBe(false);
  });
  it("only shares context after opt-in, never the name, and only confirmed preferences", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin Smith", interests: "trains" });
    await client.createPreference({ childProfileId: child.id, key: "humour_helps", statement: "Humour can be helpful.", category: "confirmed", source: "parent", evidenceCount: 0 });
    await client.createPreference({ childProfileId: child.id, key: "fewer_questions", statement: "Responds better to fewer questions.", category: "observation", source: "feedback", evidenceCount: 2 });
    await client.createPreference({ childProfileId: "other-child", key: "time_anxiety", statement: "x", category: "confirmed", source: "parent", evidenceCount: 0 });
    const prefs = await client.listPreferences();

    expect(buildAiContext(child, { shareProfileWithAi: false }, prefs)).toEqual({ childContext: null, preferences: [] });
    expect(buildAiContext(null, { shareProfileWithAi: true }, prefs)).toEqual({ childContext: null, preferences: [] });
    const shared = buildAiContext(child, { shareProfileWithAi: true }, prefs);
    expect(shared.preferences).toEqual([{ key: "humour_helps", statement: "Humour can be helpful." }]);
    expect(JSON.stringify(shared)).not.toMatch(/Robin|Smith|preferredName/);
    expect(toChildContext(child).interests).toBe("trains");
  });
  it("defaults to not sharing profile data", async () => {
    expect((await client.getSettings()).shareProfileWithAi).toBe(false);
  });
});

describe("data isolation, export and deletion", () => {
  it("keeps each user's data in a separate namespace", async () => {
    const other = new LocalDataClient("user-b", storage);
    await client.createChildProfile({ preferredName: "Robin" });
    await client.createConversation({ title: "Private", childProfileId: null });
    expect(await other.listChildProfiles()).toEqual([]);
    expect(await other.listConversations()).toEqual([]);
    await other.createChildProfile({ preferredName: "Alex" });
    await other.deleteAllData();
    expect(await client.listChildProfiles()).toHaveLength(1);
    expect(storage.getItem(`${LOCAL_KEY_PREFIX}user-b`)).toBeNull();
  });
  it("exports everything the user has stored", async () => {
    const child = await client.createChildProfile({ preferredName: "Robin" });
    await client.createTranslation({ childProfileId: child.id, original: "one", situation: "", inputMethod: "text", result });
    const data = await client.exportAll();
    expect(data.format).toBe("pda-companion-export-v1");
    expect(data.childProfiles).toHaveLength(1);
    expect(data.translations).toHaveLength(1);
    expect(Object.keys(data)).toEqual(expect.arrayContaining(["profile", "settings", "communicationPreferences", "translationFeedback", "savedTranslations", "conversations", "messages"]));
  });
  it("deletes all data", async () => {
    await client.createChildProfile({ preferredName: "Robin" });
    await client.deleteAllData();
    expect(await client.listChildProfiles()).toEqual([]);
  });
  it("recovers from corrupted storage", async () => {
    storage.setItem(`${LOCAL_KEY_PREFIX}user-a`, "{not json");
    expect(await client.listChildProfiles()).toEqual([]);
  });
});

describe("demo seed", () => {
  it("creates an example profile, translations, favourites and a conversation exactly once", async () => {
    const demo = new LocalDataClient(DEMO_USER.id, storage, DEMO_USER.displayName);
    await seedDemoData(demo);
    await seedDemoData(demo);
    const data = await demo.exportAll();
    expect(data.childProfiles).toHaveLength(1);
    expect(data.childProfiles[0].preferredName).toMatch(/example/);
    expect(data.translations).toHaveLength(3);
    expect(data.translations.every((t) => t.isDemo && t.result.alternatives.length === 6)).toBe(true);
    expect(data.savedTranslations).toHaveLength(2);
    expect(data.communicationPreferences.map((p) => p.category).sort()).toEqual(["confirmed", "observation", "suggestion"]);
    expect(data.messages.filter((m) => m.role === "assistant").every((m) => m.isDemo)).toBe(true);
    expect(data.settings.shareProfileWithAi).toBe(false);
  });
});

describe("supabase row mapping", () => {
  it("converts between camelCase and snake_case at the top level only", () => {
    expect(toRow({ userId: "u", childProfileId: null, result: { isDemo: true } })).toEqual({ user_id: "u", child_profile_id: null, result: { isDemo: true } });
    expect(fromRow({ user_id: "u", share_profile_with_ai: false, result: { isDemo: true } })).toEqual({ userId: "u", shareProfileWithAi: false, result: { isDemo: true } });
  });
});
