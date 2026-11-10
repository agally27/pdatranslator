"use client";

import { ArrowRight, Bookmark, Heart, Languages, Lightbulb, MessageCircleHeart, UserRound } from "lucide-react";
import Link from "next/link";
import { childLabel } from "@/components/app/child-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { COMMUNICATION_TIPS, DAILY_MESSAGES, greeting, pickByDay } from "@/lib/daily";
import { useAppData } from "@/lib/data/app-data";
import { STYLE_META } from "@/lib/types";
import { formatRelative, truncate } from "@/lib/utils";

export default function DashboardPage() {
  const { profile, selectedChild, translations, saved, preferences, children } = useAppData();
  const name = profile.displayName.trim();
  const tips = [pickByDay(COMMUNICATION_TIPS), pickByDay(COMMUNICATION_TIPS, new Date(), 3)];
  const confirmed = selectedChild ? preferences.filter((p) => p.childProfileId === selectedChild.id && p.category === "confirmed").length : 0;
  const toReview = selectedChild ? preferences.filter((p) => p.childProfileId === selectedChild.id && p.category !== "confirmed").length : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink-900 sm:text-3xl">{greeting()}{name ? `, ${name}` : ""}</h1>
        <p className="mt-1.5 text-ink-500">What would help right now?</p>
      </header>

      <section aria-label="Quick actions" className="grid gap-4 sm:grid-cols-2">
        <Link href="/translator" className="group rounded-(--radius-card) bg-linear-to-br from-sage-500 to-sage-700 p-6 text-white shadow-(--shadow-soft) transition-transform hover:-translate-y-0.5">
          <Languages className="size-7" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-white">Translate a sentence</h2>
          <p className="mt-1 text-sm leading-relaxed text-sage-50/90">Type or say what you want to communicate and get six lower-pressure ways to say it.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">Open translator <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
        </Link>
        <Link href="/specialist" className="group rounded-(--radius-card) border border-ink-100 bg-white/85 p-6 shadow-(--shadow-soft) transition-transform hover:-translate-y-0.5">
          <MessageCircleHeart className="size-7 text-sage-600" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-ink-900">Talk it through</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">Ask the PDA Specialist about a situation, a pattern you have noticed, or how you are doing.</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sage-700">Open specialist <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
        </Link>
      </section>

      <Card className="border-sage-200 bg-sage-50/70">
        <CardContent className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sage-600"><Heart className="size-5" aria-hidden /></div>
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-sage-700">A thought for today</h2>
            <p className="mt-1 font-display text-lg leading-snug text-ink-900">{pickByDay(DAILY_MESSAGES)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent translations</CardTitle>
            {translations.length > 0 ? <Button asChild variant="link" size="sm"><Link href="/history">View all</Link></Button> : null}
          </CardHeader>
          <CardContent>
            {translations.length === 0 ? (
              <EmptyState icon={<Languages />} title="Nothing here yet" description="Your recent translations will appear here so you can find them again." action={<Button asChild><Link href="/translator">Try the translator</Link></Button>} />
            ) : (
              <ul className="divide-y divide-ink-100">
                {translations.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link href={`/translator?reopen=${t.id}`} className="flex items-center justify-between gap-3 rounded-xl py-3 hover:bg-sage-50/60">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-900">“{truncate(t.original, 70)}”</span>
                        <span className="text-xs text-ink-500">{formatRelative(t.createdAt)} · {t.result.alternatives.length} alternatives</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink-300" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Selected child profile</CardTitle></CardHeader>
          <CardContent>
            {selectedChild ? (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-sage-100 text-sage-700"><UserRound className="size-5" aria-hidden /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{childLabel(selectedChild.preferredName)}</p>
                    {selectedChild.ageRange ? <p className="text-sm text-ink-500">Age {selectedChild.ageRange}</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{confirmed} confirmed preference{confirmed === 1 ? "" : "s"}</Badge>
                  {toReview > 0 ? <Badge tone="amber">{toReview} to review</Badge> : null}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/profiles">View profile</Link></Button>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-ink-500">
                  {children.length > 0 ? "No profile is selected. Choose one from the menu at the top of the page." : "A profile is optional, and helps tailor suggestions to your child."}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/profiles">{children.length > 0 ? "Manage profiles" : "Create a profile"}</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Saved translations</CardTitle>
            {saved.length > 0 ? <Button asChild variant="link" size="sm"><Link href="/history?view=saved">View all</Link></Button> : null}
          </CardHeader>
          <CardContent>
            {saved.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-500">Tap the bookmark on any alternative to keep it here for quick reference.</p>
            ) : (
              <ul className="space-y-3">
                {saved.slice(0, 3).map((s) => (
                  <li key={s.id} className="rounded-2xl bg-sage-50/70 p-3.5">
                    <p className="text-sm leading-relaxed text-ink-900">{s.text}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500"><Bookmark className="size-3" aria-hidden /> {STYLE_META[s.style].label}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Communication tips</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {tips.map((tip) => (
                <li key={tip.title} className="flex gap-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-soft-600" aria-hidden />
                  <div>
                    <p className="font-medium text-ink-900">{tip.title}</p>
                    <p className="text-sm leading-relaxed text-ink-500">{tip.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button asChild variant="link" size="sm" className="mt-3 px-0"><Link href="/knowledge">Explore the Knowledge Hub</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
