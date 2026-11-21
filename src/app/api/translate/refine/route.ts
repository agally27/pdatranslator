import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { RefineRequestSchema } from "@/lib/ai/schemas/translation.schema";
import { refineAlternative } from "@/lib/ai/translation/refine";
import { assertSameOrigin, enforceRateLimit, parseJsonBody, requireUser, withApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/translate/refine – applies one refine control to one alternative. */
export const POST = withApi("translate.refine", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser(request);
  enforceRateLimit(user, "translate");
  const body = await parseJsonBody(request, RefineRequestSchema);
  const provider = getAIProvider();
  const alternative = await refineAlternative(provider, body);
  return NextResponse.json({ alternative, meta: { provider: provider.id, model: provider.model, isDemo: !provider.isLive } });
});
