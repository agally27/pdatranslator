import { publicConfig, serverConfig } from "@/lib/config";
import { ARTICLES } from "@/lib/knowledge/articles";
import { searchArticles } from "@/lib/knowledge/search";
import { EVIDENCE_LABELS, type KnowledgeArticle } from "@/lib/knowledge/types";
import { logger, errorName } from "@/lib/logger";

/**
 * Retrieval-augmented generation: the specialist is always given relevant
 * passages from the curated knowledge base instead of relying on model memory.
 */
export interface RetrievedPassage {
  slug: string;
  title: string;
  evidence: string;
  text: string;
  sources: string[];
}

export interface KnowledgeRetriever {
  retrieve(query: string, limit: number): Promise<RetrievedPassage[]>;
}

function toPassage(article: KnowledgeArticle): RetrievedPassage {
  return {
    slug: article.slug,
    title: article.title,
    evidence: EVIDENCE_LABELS[article.evidence].label,
    text: [article.summary, ...article.content].join("\n"),
    sources: article.sources.map((s) => `${s.publisher}${s.year ? ` (${s.year})` : ""}`),
  };
}

/** Default retriever: weighted keyword search over the bundled articles. No external calls. */
export class KeywordRetriever implements KnowledgeRetriever {
  async retrieve(query: string, limit: number): Promise<RetrievedPassage[]> {
    return searchArticles(query, { limit }).map((hit) => toPassage(hit.article));
  }
}

/**
 * Optional retriever: semantic search with pgvector.
 * Requires Supabase, OPENAI_API_KEY and `npm run seed:knowledge` (see docs/AI_FOUNDATION.md).
 * Falls back to keyword search on any failure.
 */
export class VectorRetriever implements KnowledgeRetriever {
  constructor(private fallback: KnowledgeRetriever = new KeywordRetriever(), private fetchImpl: typeof fetch = fetch) {}

  async retrieve(query: string, limit: number): Promise<RetrievedPassage[]> {
    const config = serverConfig();
    if (!publicConfig.supabaseConfigured || !config.openaiApiKey) return this.fallback.retrieve(query, limit);
    try {
      const embeddingResponse = await this.fetchImpl("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiApiKey}` },
        body: JSON.stringify({ model: config.embeddingModel, input: query.slice(0, 2000) }),
      });
      if (!embeddingResponse.ok) throw new Error(`embedding ${embeddingResponse.status}`);
      const embedding = ((await embeddingResponse.json()) as { data: { embedding: number[] }[] }).data[0].embedding;

      // knowledge_articles is readable with the anon key (published rows only).
      const rpc = await this.fetchImpl(`${publicConfig.supabaseUrl}/rest/v1/rpc/match_knowledge_articles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicConfig.supabaseAnonKey!,
          Authorization: `Bearer ${publicConfig.supabaseAnonKey}`,
        },
        body: JSON.stringify({ query_embedding: embedding, match_count: limit }),
      });
      if (!rpc.ok) throw new Error(`rpc ${rpc.status}`);
      const rows = (await rpc.json()) as { slug: string }[];
      const passages = rows
        .map((row) => ARTICLES.find((a) => a.slug === row.slug && a.status === "published"))
        .filter((a): a is KnowledgeArticle => Boolean(a))
        .map(toPassage);
      return passages.length > 0 ? passages : this.fallback.retrieve(query, limit);
    } catch (err) {
      logger.warn("knowledge.vector_fallback", { error: errorName(err) });
      return this.fallback.retrieve(query, limit);
    }
  }
}

export function getRetriever(): KnowledgeRetriever {
  return serverConfig().knowledgeRetrieval === "vector" ? new VectorRetriever() : new KeywordRetriever();
}
