import type { ConfirmedPreference, MessageSource } from "@/lib/types";
import { SpecialistReplySchema, type ChatRequest } from "../schemas/specialist.schema";
import type { AIProvider } from "../types";
import { buildSpecialistPrompt, buildSpecialistSystem, type SpecialistInput } from "./context";
import { getRetriever, type KnowledgeRetriever } from "./retrieval";
import { detectSafetyConcern, ensureSignpost } from "./safety";

export interface SpecialistResponse {
  reply: string;
  sources: MessageSource[];
  safetyFlag: boolean;
  suggestedTitle: string;
  meta: { provider: string; model: string; isDemo: boolean; retrievedSlugs: string[] };
}

function hasAnyContext(context: ChatRequest["childContext"]): boolean {
  return Boolean(context && Object.values(context).some((v) => typeof v === "string" && v.trim() !== ""));
}

/** One specialist turn: safety screen → retrieval → generation → source attribution. */
export async function runSpecialistChat(
  provider: AIProvider,
  request: ChatRequest,
  retriever: KnowledgeRetriever = getRetriever(),
): Promise<SpecialistResponse> {
  const latest = request.messages[request.messages.length - 1].content;
  const recentUserText = request.messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");

  const screened = detectSafetyConcern(latest);
  const passages = await retriever.retrieve(recentUserText, 3);

  const input: SpecialistInput = {
    messages: request.messages,
    childContext: hasAnyContext(request.childContext) ? request.childContext! : null,
    preferences: request.preferences as ConfirmedPreference[],
    passages,
    safetyConcern: screened,
  };

  const result = await provider.generateObject({
    task: "specialist",
    schemaName: "specialist_reply",
    schema: SpecialistReplySchema,
    input,
    maxTokens: 4000,
    system: buildSpecialistSystem(input),
    prompt: buildSpecialistPrompt(input),
  });

  const safetyFlag = screened || result.safetyConcern;
  // Only passages that were actually retrieved can be cited.
  const sources = passages
    .filter((p) => result.usedSourceSlugs.includes(p.slug))
    .map((p) => ({ slug: p.slug, title: p.title }));

  return {
    reply: safetyFlag ? ensureSignpost(result.reply) : result.reply.trim(),
    sources,
    safetyFlag,
    suggestedTitle: result.suggestedTitle.trim().slice(0, 60) || "New conversation",
    meta: { provider: provider.id, model: provider.model, isDemo: !provider.isLive, retrievedSlugs: passages.map((p) => p.slug) },
  };
}
