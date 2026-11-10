/**
 * Seeds / updates public.knowledge_articles from the bundled articles and,
 * when OPENAI_API_KEY is set, stores an embedding for each published article
 * (used when KNOWLEDGE_RETRIEVAL=vector).
 *
 *   npm run seed:knowledge
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (for example: `node --env-file=.env.local node_modules/.bin/tsx scripts/seed-knowledge.ts`).
 */
import { createClient } from "@supabase/supabase-js";
import { ARTICLES } from "../src/lib/knowledge/articles";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

async function embed(text: string): Promise<number[] | null> {
  if (!openaiKey) return null;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: embeddingModel, input: text.slice(0, 8000) }),
  });
  if (!response.ok) throw new Error(`Embedding request failed (${response.status})`);
  return ((await response.json()) as { data: { embedding: number[] }[] }).data[0].embedding;
}

async function main() {
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  if (!openaiKey) console.warn("OPENAI_API_KEY is not set: articles will be seeded without embeddings (keyword retrieval still works).");

  for (const article of ARTICLES) {
    const embedding = article.status === "published" ? await embed([article.title, article.summary, ...article.content].join("\n")) : null;
    const { error } = await supabase.from("knowledge_articles").upsert(
      {
        slug: article.slug, category: article.category, title: article.title, summary: article.summary,
        content: article.content, practical_examples: article.practicalExamples, sources: article.sources,
        evidence: article.evidence, review_date: article.reviewDate, tags: article.tags, status: article.status,
        ...(embedding ? { embedding } : {}),
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(`${article.slug}: ${error.message}`);
    console.log(`✓ ${article.slug}${embedding ? " (embedded)" : ""}`);
  }
  console.log(`Seeded ${ARTICLES.length} articles.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
