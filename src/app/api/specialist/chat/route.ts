import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { ChatRequestSchema } from "@/lib/ai/schemas/specialist.schema";
import { runSpecialistChat } from "@/lib/ai/specialist/chat";
import { assertSameOrigin, enforceRateLimit, parseJsonBody, requireUser, withApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/specialist/chat – one specialist turn with knowledge retrieval. Stateless. */
export const POST = withApi("specialist.chat", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser(request);
  enforceRateLimit(user, "specialist");
  const body = await parseJsonBody(request, ChatRequestSchema);
  const response = await runSpecialistChat(getAIProvider(), body);
  return NextResponse.json(response);
});
