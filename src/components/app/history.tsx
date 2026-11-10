"use client";

import { Bookmark, BookmarkCheck, ChevronDown, Copy, ExternalLink, History as HistoryIcon, Repeat2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { childLabel } from "@/components/app/child-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { DemoBadge, EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { LEVEL_VISUAL, STYLE_VISUAL } from "@/components/translator/styles";
import { useAppData } from "@/lib/data/app-data";
import { FEEDBACK_LABELS, STYLE_META, type TranslationRecord } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export type HistoryFilter = { query: string; child: string; level: string; onlySaved: boolean; onlyFeedback: boolean };

/** Pure filter used by the history page (and unit-tested). */
export function filterTranslations(records: TranslationRecord[], filter: HistoryFilter, savedIds: Set<string>, feedbackIds: Set<string>): TranslationRecord[] {
  const query = filter.query.trim().toLowerCase();
  return records.filter((record) => {
    if (filter.child === "none" ? record.childProfileId !== null : filter.child !== "all" && record.childProfileId !== filter.child) return false;
    if (filter.level !== "all" && record.result.demandAnalysis.level !== filter.level) return false;
    if (filter.onlySaved && !savedIds.has(record.id)) return false;
    if (filter.onlyFeedback && !feedbackIds.has(record.id)) return false;
    if (!query) return true;
    const haystack = [record.original, record.situation, ...record.result.alternatives.map((a) => a.text)].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function useCopy() {
  const toast = useToast();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
    } catch {
      toast("Copying isn’t available in this browser.", "error");
    }
  };
}

function HistoryItem({ record, onDelete }: { record: TranslationRecord; onDelete(): void }) {
  const { children, saved, feedback, actions } = useAppData();
  const toast = useToast();
  const copy = useCopy();
  const [open, setOpen] = React.useState(false);
  const child = children.find((c) => c.id === record.childProfileId);
  const level = LEVEL_VISUAL[record.result.demandAnalysis.level];
  const savedHere = saved.filter((s) => s.translationId === record.id);
  const feedbackHere = feedback.filter((f) => f.translationId === record.id);
  const reuseHref = `/translator?text=${encodeURIComponent(record.original)}${record.situation ? `&situation=${encodeURIComponent(record.situation)}` : ""}`;

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 rounded-xl text-left">
          <span className="min-w-0">
            <span className="block font-display text-lg leading-snug text-ink-900">“{record.original}”</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
              <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time>
              <Badge tone={level.tone}>{level.label}</Badge>
              {child ? <Badge tone="outline">{childLabel(child.preferredName)}</Badge> : null}
              {savedHere.length > 0 ? <Badge><BookmarkCheck aria-hidden /> {savedHere.length} saved</Badge> : null}
              {feedbackHere.length > 0 ? <Badge tone="sky">{feedbackHere.length} feedback</Badge> : null}
              {record.isDemo ? <DemoBadge /> : null}
            </span>
          </span>
          <ChevronDown className={cn("mt-1.5 size-5 shrink-0 text-ink-500 transition-transform", open && "rotate-180")} aria-hidden />
        </button>

        {open ? (
          <div className="space-y-3 border-t border-ink-100 pt-3">
            {record.situation ? <p className="text-sm leading-relaxed text-ink-700"><span className="font-medium">Situation:</span> {record.situation}</p> : null}
            <ul className="space-y-2">
              {record.result.alternatives.map((alternative) => {
                const isSaved = savedHere.find((s) => s.alternativeId === alternative.id);
                const given = feedbackHere.find((f) => f.alternativeId === alternative.id);
                return (
                  <li key={alternative.id} className="rounded-2xl bg-cream-100 p-3">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE_VISUAL[alternative.style].chip)}>{STYLE_META[alternative.style].label}</span>
                      {given ? <span className="text-xs text-ink-500">Feedback: {FEEDBACK_LABELS[given.feedback]}</span> : null}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-900">{alternative.text}</p>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-8 px-2.5" onClick={() => void copy(alternative.text)}><Copy aria-hidden /> Copy</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5"
                        aria-pressed={Boolean(isSaved)}
                        onClick={async () => {
                          try {
                            if (isSaved) await actions.unsave(isSaved.id);
                            else await actions.saveAlternative({ translationId: record.id, childProfileId: record.childProfileId, alternativeId: alternative.id, style: alternative.style, text: alternative.text, original: record.original });
                            toast(isSaved ? "Removed from saved." : "Saved to your favourites.");
                          } catch {
                            toast("That didn’t save. Please try again.", "error");
                          }
                        }}
                      >
                        {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />} {isSaved ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary"><Link href={`/translator?reopen=${record.id}`}><ExternalLink aria-hidden /> Reopen</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={reuseHref}><Repeat2 aria-hidden /> Reuse wording</Link></Button>
              <Button size="sm" variant="outline" onClick={onDelete}><Trash2 aria-hidden /> Delete</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function HistoryView() {
  const { translations, saved, feedback, children, actions } = useAppData();
  const toast = useToast();
  const copy = useCopy();
  const params = useSearchParams();
  const [tab, setTab] = React.useState(params.get("view") === "saved" ? "saved" : "all");
  const [filter, setFilter] = React.useState<HistoryFilter>({ query: "", child: "all", level: "all", onlySaved: false, onlyFeedback: false });
  const [deleting, setDeleting] = React.useState<TranslationRecord | null>(null);

  const savedIds = React.useMemo(() => new Set(saved.map((s) => s.translationId)), [saved]);
  const feedbackIds = React.useMemo(() => new Set(feedback.map((f) => f.translationId)), [feedback]);
  const visible = React.useMemo(() => filterTranslations(translations, filter, savedIds, feedbackIds), [translations, filter, savedIds, feedbackIds]);
  const filtering = filter.query !== "" || filter.child !== "all" || filter.level !== "all" || filter.onlySaved || filter.onlyFeedback;

  return (
    <div>
      <PageHeader title="Translation History" description="Find, reopen and reuse what you have translated before." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="sm:w-auto">
          <TabsTrigger value="all" className="sm:px-6">All translations ({translations.length})</TabsTrigger>
          <TabsTrigger value="saved" className="sm:px-6">Favourites ({saved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {translations.length === 0 ? (
            <EmptyState icon={<HistoryIcon />} title="No translations yet" description="Once you translate something, it will be kept here for you (unless you switch history off in Settings)." action={<Button asChild><Link href="/translator">Open the translator</Link></Button>} />
          ) : (
            <>
              <Card>
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="history-search">Search</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden />
                      <Input id="history-search" type="search" className="pl-10" placeholder="Search your words or the alternatives" value={filter.query} onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="history-child">Child profile</Label>
                    <Select id="history-child" value={filter.child} onChange={(e) => setFilter((f) => ({ ...f, child: e.target.value }))}>
                      <option value="all">All</option>
                      {children.map((c) => <option key={c.id} value={c.id}>{childLabel(c.preferredName)}</option>)}
                      <option value="none">No profile</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="history-level">Demand level</Label>
                    <Select id="history-level" value={filter.level} onChange={(e) => setFilter((f) => ({ ...f, level: e.target.value }))}>
                      <option value="all">All</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                    <Button size="sm" variant={filter.onlySaved ? "secondary" : "outline"} aria-pressed={filter.onlySaved} onClick={() => setFilter((f) => ({ ...f, onlySaved: !f.onlySaved }))}><Bookmark aria-hidden /> With saved</Button>
                    <Button size="sm" variant={filter.onlyFeedback ? "secondary" : "outline"} aria-pressed={filter.onlyFeedback} onClick={() => setFilter((f) => ({ ...f, onlyFeedback: !f.onlyFeedback }))}>With feedback</Button>
                    {filtering ? <Button size="sm" variant="link" onClick={() => setFilter({ query: "", child: "all", level: "all", onlySaved: false, onlyFeedback: false })}>Clear filters</Button> : null}
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-ink-500" role="status">{visible.length} of {translations.length} shown</p>
              {visible.length === 0 ? (
                <EmptyState icon={<Search />} title="Nothing matches" description="Try a different word or clear the filters." />
              ) : (
                <ul className="space-y-3">{visible.map((record) => <li key={record.id}><HistoryItem record={record} onDelete={() => setDeleting(record)} /></li>)}</ul>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="saved">
          {saved.length === 0 ? (
            <EmptyState icon={<Bookmark />} title="No favourites yet" description="Tap “Save” on any alternative to keep the wording that works for you in one place." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {saved.map((item) => (
                <li key={item.id}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-4 sm:p-5">
                      <span className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE_VISUAL[item.style].chip)}>{STYLE_META[item.style].label}</span>
                      <p className="mt-2.5 font-display text-lg leading-snug text-ink-900">{item.text}</p>
                      <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-500">Instead of: “{item.original}”</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => void copy(item.text)}><Copy aria-hidden /> Copy</Button>
                        <Button asChild size="sm" variant="outline"><Link href={`/translator?reopen=${item.translationId}`}><ExternalLink aria-hidden /> Reopen</Link></Button>
                        <Button size="sm" variant="outline" onClick={async () => { try { await actions.unsave(item.id); toast("Removed from saved."); } catch { toast("That couldn’t be removed. Please try again.", "error"); } }}><Trash2 aria-hidden /> Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete this translation?" description="It will be removed from your history, along with any favourites and feedback attached to it.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await actions.deleteTranslation(deleting.id);
                  toast("Translation deleted.");
                } catch {
                  toast("That couldn’t be deleted. Please try again.", "error");
                }
                setDeleting(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
