import { ArrowLeft, CalendarCheck, ExternalLink, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ARTICLES, getArticle } from "@/lib/knowledge/articles";
import { EVIDENCE_LABELS, KNOWLEDGE_CATEGORIES, type EvidenceClass } from "@/lib/knowledge/types";

const TONE: Record<EvidenceClass, "sage" | "sky" | "lilac" | "neutral" | "amber"> = {
  organisation_guidance: "sage", peer_reviewed: "sky", lived_experience: "lilac", general_guidance: "neutral", placeholder: "amber",
};

const SOURCE_TYPE = { organisation: "Organisation", peer_reviewed: "Peer-reviewed research", book: "Book", lived_experience: "Lived experience" } as const;

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getArticle(slug)?.title ?? "Article" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const category = KNOWLEDGE_CATEGORIES.find((c) => c.id === article.category);
  const evidence = EVIDENCE_LABELS[article.evidence];
  const reviewed = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(article.reviewDate));

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/knowledge" className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-medium text-sage-700 hover:text-sage-900">
        <ArrowLeft className="size-4" aria-hidden /> Knowledge Hub
      </Link>

      <header className="mt-3">
        <p className="text-sm font-medium uppercase tracking-wide text-sage-600">{category?.label}</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-ink-900">{article.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-700">{article.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <Badge tone={TONE[article.evidence]}>{evidence.label}</Badge>
          <span className="inline-flex items-center gap-1.5"><CalendarCheck className="size-4" aria-hidden /> Reviewed {reviewed}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{evidence.description}</p>
      </header>

      <div className="prose-calm mt-6 text-[17px] text-ink-900">
        {article.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>

      {article.practicalExamples.length > 0 ? (
        <Card className="mt-6 border-sage-200 bg-sage-50/70">
          <CardContent>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900"><Lightbulb className="size-5 text-amber-soft-600" aria-hidden /> Practical examples</h2>
            <ul className="mt-3 space-y-2.5">
              {article.practicalExamples.map((example, index) => <li key={index} className="rounded-2xl bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-ink-900">{example}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-8" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-lg font-semibold text-ink-900">Sources</h2>
        {article.sources.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {article.status === "placeholder" ? "No sources yet – this article is waiting to be researched." : "No verified source is attached. Treat this article as general guidance."}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {article.sources.map((source) => (
              <li key={source.title} className="rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm leading-relaxed">
                <p className="text-ink-900">{source.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-500">
                  <span>{source.publisher}{source.year ? `, ${source.year}` : ""}</span>
                  <span>{SOURCE_TYPE[source.type]}</span>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-sage-700 underline underline-offset-2">
                      Visit <ExternalLink className="size-3" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 rounded-2xl bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-ink-500">
        This article is general information for parents and carers. It is not medical, psychological or legal advice and cannot
        take your child’s individual circumstances into account. If you are worried about your child, speak to your GP or the
        professionals who know them.
      </p>
    </article>
  );
}
