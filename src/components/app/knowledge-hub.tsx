"use client";

import { ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ARTICLES } from "@/lib/knowledge/articles";
import { searchArticles } from "@/lib/knowledge/search";
import { EVIDENCE_LABELS, KNOWLEDGE_CATEGORIES, type EvidenceClass, type KnowledgeArticle } from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

export const EVIDENCE_TONE: Record<EvidenceClass, "sage" | "sky" | "lilac" | "neutral" | "amber"> = {
  organisation_guidance: "sage",
  peer_reviewed: "sky",
  lived_experience: "lilac",
  general_guidance: "neutral",
  placeholder: "amber",
};

function ArticleLink({ article }: { article: KnowledgeArticle }) {
  return (
    <Link href={`/knowledge/${article.slug}`} className="group flex h-full flex-col rounded-(--radius-card) border border-ink-100 bg-white/85 p-5 shadow-(--shadow-soft) transition-transform hover:-translate-y-0.5">
      <Badge tone={EVIDENCE_TONE[article.evidence]} className="self-start">{EVIDENCE_LABELS[article.evidence].label}</Badge>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink-900">{article.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">{article.summary}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sage-700">Read <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
    </Link>
  );
}

export function KnowledgeHub() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const results = React.useMemo(() => (query.trim() ? searchArticles(query, { limit: 12, includePlaceholders: true }).map((hit) => hit.article) : null), [query]);
  const categories = KNOWLEDGE_CATEGORIES.filter((c) => category === "all" || c.id === category);

  return (
    <div>
      <PageHeader title="PDA Knowledge Hub" description="Short articles with sources and an honest evidence label. Research into PDA is still developing, so every article says what it is based on." />

      <div className="mb-5 space-y-1.5">
        <Label htmlFor="knowledge-search" className="sr-only">Search the Knowledge Hub</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden />
          <Input id="knowledge-search" type="search" className="pl-10" placeholder="Search, for example “transitions” or “school”" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {results ? (
        <section aria-label="Search results">
          <p className="mb-3 text-sm text-ink-500" role="status">{results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”</p>
          {results.length === 0 ? (
            <EmptyState icon={<BookOpen />} title="No articles found" description="Try a different word. The PDA Specialist can also help with questions the Hub does not cover yet." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">{results.map((article) => <li key={article.slug}><ArticleLink article={article} /></li>)}</ul>
          )}
        </section>
      ) : (
        <>
          <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
            {[{ id: "all", label: "All topics" }, ...KNOWLEDGE_CATEGORIES].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cn("min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors", category === c.id ? "border-sage-600 bg-sage-600 text-white" : "border-ink-200 bg-white/80 text-ink-700 hover:border-sage-300")}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {categories.map((c) => {
              const articles = ARTICLES.filter((a) => a.category === c.id);
              return (
                <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                  <h2 id={`cat-${c.id}`} className="text-xl font-semibold text-ink-900">{c.label}</h2>
                  <p className="mt-0.5 text-sm text-ink-500">{c.blurb}</p>
                  {articles.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-sage-200 px-4 py-4 text-sm text-ink-500">Articles for this topic are being researched.</p>
                  ) : (
                    <ul className="mt-3 grid gap-4 sm:grid-cols-2">{articles.map((article) => <li key={article.slug}><ArticleLink article={article} /></li>)}</ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
