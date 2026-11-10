import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, enforceRateLimit, requireUser, withApi } from "@/lib/api";
import { searchArticles } from "@/lib/knowledge/search";

export const dynamic = "force-dynamic";

const QuerySchema = z.string().trim().min(1).max(200);

/** GET /api/knowledge/search?q= – keyword search over the knowledge base. */
export const GET = withApi("knowledge.search", async (request) => {
  const user = await requireUser(request);
  enforceRateLimit(user, "knowledge", 60);
  const parsed = QuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!parsed.success) throw new ApiError(400, "invalid_request", "Please enter a search term.");
  const results = searchArticles(parsed.data, { limit: 8, includePlaceholders: true }).map(({ article, score }) => ({
    slug: article.slug, title: article.title, summary: article.summary, category: article.category,
    evidence: article.evidence, status: article.status, score: Number(score.toFixed(3)),
  }));
  return NextResponse.json({ results });
});
