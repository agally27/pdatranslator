import { MockProvider } from "@/lib/ai/providers/mock";
import { TranslateRequestSchema } from "@/lib/ai/schemas/translation.schema";
import { runSpecialistChat } from "@/lib/ai/specialist/chat";
import { KeywordRetriever } from "@/lib/ai/specialist/retrieval";
import { runTranslationPipeline } from "@/lib/ai/translation/pipeline";
import { PREFERENCE_STATEMENTS } from "@/lib/types";
import type { LocalDataClient } from "./local";

export const DEMO_USER = { id: "demo-user", email: "demo@pda-companion.local", displayName: "Demo parent" };

/**
 * Fills a fresh demo account with a fictional child profile and example
 * activity, so every screen has something to show. All example content is
 * produced by the built-in demo engine and labelled as such.
 */
export async function seedDemoData(client: LocalDataClient): Promise<void> {
  if (client.isSeeded()) return;
  const provider = new MockProvider();

  const child = await client.createChildProfile({
    preferredName: "Sam (example)",
    ageRange: "7",
    communicationPreferences: "Prefers indirect comments to being asked directly. Likes time to think.",
    preferredCommunicationStyle: "Humour and role play",
    sensorySensitivities: "Scratchy labels, loud hand dryers, strong mint toothpaste",
    interests: "dinosaurs, Minecraft, trampolining",
    anxietyTriggers: "Being rushed, surprises, crowded places",
    transitionDifficulties: "Coming off screens; leaving the house in the morning",
    responsesToQuestions: "Direct questions often get “I don't know” or silence.",
    responsesToChoices: "Two options can be okay on a good day; more is too many.",
    effectiveStrategies: "Silly voices, racing the timer he sets himself, me doing it alongside",
    approachesThatDontWork: "Reward charts, counting to three, repeating the request",
    notes: "This is a fictional example profile. Edit or delete it at any time.",
  });

  await client.createPreference({ childProfileId: child.id, key: "humour_helps", statement: PREFERENCE_STATEMENTS.humour_helps, category: "confirmed", source: "parent", evidenceCount: 0 });
  await client.createPreference({ childProfileId: child.id, key: "fewer_questions", statement: PREFERENCE_STATEMENTS.fewer_questions, category: "observation", source: "feedback", evidenceCount: 2 });
  await client.createPreference({ childProfileId: child.id, key: "time_anxiety", statement: PREFERENCE_STATEMENTS.time_anxiety, category: "suggestion", source: "ai", evidenceCount: 1 });

  const examples: { text: string; situation: string }[] = [
    { text: "Put your shoes on now, we're going to be late!", situation: "" },
    { text: "Can you please turn the tablet off and come for dinner?", situation: "He has been playing Minecraft for an hour and dinner is on the table." },
    { text: "You need to brush your teeth before bed.", situation: "" },
  ];
  const records = [];
  for (const example of examples) {
    const request = TranslateRequestSchema.parse({ ...example, inputMethod: example.situation ? "situation" : "text" });
    const result = await runTranslationPipeline(provider, request);
    records.push(await client.createTranslation({ childProfileId: child.id, original: example.text, situation: example.situation, inputMethod: request.inputMethod, result }));
  }

  const first = records[0];
  const playful = first.result.alternatives.find((a) => a.style === "playful")!;
  const descriptive = records[2].result.alternatives.find((a) => a.style === "descriptive")!;
  await client.saveAlternative({ translationId: first.id, childProfileId: child.id, alternativeId: playful.id, style: playful.style, text: playful.text, original: first.original });
  await client.saveAlternative({ translationId: records[2].id, childProfileId: child.id, alternativeId: descriptive.id, style: descriptive.style, text: descriptive.text, original: records[2].original });
  await client.addFeedback({ translationId: first.id, childProfileId: child.id, alternativeId: playful.id, style: "playful", feedback: "worked" });

  const question = "How can I approach a difficult morning?";
  const reply = await runSpecialistChat(provider, { messages: [{ role: "user", content: question }], childContext: null, preferences: [] }, new KeywordRetriever());
  const conversation = await client.createConversation({ title: reply.suggestedTitle, childProfileId: child.id });
  await client.addMessage({ conversationId: conversation.id, role: "user", content: question, sources: [], isDemo: false, safetyFlag: false });
  await client.addMessage({ conversationId: conversation.id, role: "assistant", content: reply.reply, sources: reply.sources, isDemo: true, safetyFlag: reply.safetyFlag });

  client.markSeeded();
}
