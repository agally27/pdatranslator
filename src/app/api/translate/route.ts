import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { TranslateRequestSchema } from "@/lib/ai/schemas/translation.schema";
import { runTranslationPipeline } from "@/lib/ai/translation/pipeline";
import { assertSameOrigin, enforceRateLimit, parseJsonBody, requireUser, withApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/translate – runs the full multi-stage translation workflow. Stateless: nothing is stored server-side. */
export const POST = withApi("translate", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser(request);
  enforceRateLimit(user, "translate");
  const body = await parseJsonBody(request, TranslateRequestSchema);
  const result = await runTranslationPipeline(getAIProvider(), body);
  return NextResponse.json({ result });
});
