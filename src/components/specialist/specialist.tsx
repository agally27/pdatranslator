"use client";

import { BookOpen, MessageCircleHeart, MessagesSquare, MoreHorizontal, Pencil, Plus, SendHorizonal, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { childLabel } from "@/components/app/child-switcher";
import { ConsentDialog } from "@/components/app/consent-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DemoBadge, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { errorMessage, postJson } from "@/lib/api-client";
import { useAppData } from "@/lib/data/app-data";
import type { Conversation, Message, MessageSource } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { MessageText } from "./message-text";

export const STARTERS = [
  "Help me understand what happened today.",
  "How can I approach a difficult morning?",
  "Why might this language feel demanding?",
  "Help me communicate with school.",
  "What can I try when my child is overwhelmed?",
  "I am struggling and need some support.",
];

interface ChatResponse {
  reply: string;
  sources: MessageSource[];
  safetyFlag: boolean;
  suggestedTitle: string;
  meta: { isDemo: boolean };
}

function ConversationList({ conversations, activeId, onSelect, onRename, onDelete }: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect(id: string): void;
  onRename(conversation: Conversation): void;
  onDelete(conversation: Conversation): void;
}) {
  if (conversations.length === 0) return <p className="px-2 py-3 text-sm text-ink-500">No conversations yet.</p>;
  return (
    <ul className="space-y-1">
      {conversations.map((conversation) => (
        <li key={conversation.id} className={cn("group flex items-center gap-1 rounded-2xl pr-1", activeId === conversation.id ? "bg-sage-100" : "hover:bg-sage-50")}>
          <button type="button" onClick={() => onSelect(conversation.id)} aria-current={activeId === conversation.id ? "true" : undefined} className="min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-left">
            <span className="block truncate text-sm font-medium text-ink-900">{conversation.title}</span>
            <span className="text-xs text-ink-500">{formatRelative(conversation.updatedAt)}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-white" aria-label={`Options for ${conversation.title}`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onRename(conversation)}><Pencil /> Rename</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(conversation)}><Trash2 /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}

export function Specialist() {
  const { conversations, client, actions, aiContext, selectedChild, settings } = useAppData();
  const toast = useToast();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [listOpen, setListOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState<Conversation | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [deleting, setDeleting] = React.useState<Conversation | null>(null);
  const [consentOpen, setConsentOpen] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const skipLoadRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipLoadRef.current === activeId) {
      skipLoadRef.current = null;
      return;
    }
    let active = true;
    setLoadingMessages(true);
    setError(null);
    client
      .listMessages(activeId)
      .then((rows) => active && setMessages(rows))
      .catch(() => active && setError("We couldn’t load this conversation. Please try again."))
      .finally(() => active && setLoadingMessages(false));
    return () => {
      active = false;
    };
  }, [activeId, client]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setListOpen(false);
  };

  const send = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    let conversationId = activeId;
    let isNew = false;
    try {
      if (!conversationId) {
        const conversation = await actions.createConversation("New conversation");
        conversationId = conversation.id;
        isNew = true;
        skipLoadRef.current = conversation.id;
        setActiveId(conversation.id);
      }
      const userMessage = await client.addMessage({ conversationId, role: "user", content: trimmed, sources: [], isDemo: false, safetyFlag: false });
      const history = [...messages, userMessage];
      setMessages(history);

      const response = await postJson<ChatResponse>("/api/specialist/chat", {
        messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        childContext: aiContext.childContext,
        preferences: aiContext.preferences,
      });
      const reply = await client.addMessage({ conversationId, role: "assistant", content: response.reply, sources: response.sources, isDemo: response.meta.isDemo, safetyFlag: response.safetyFlag });
      setMessages((current) => [...current, reply]);
      if (isNew && response.suggestedTitle) await actions.renameConversation(conversationId, response.suggestedTitle);
      actions.touchConversation(conversationId);
    } catch (err) {
      setError(errorMessage(err));
      setDraft((current) => current || trimmed);
    } finally {
      setSending(false);
    }
  };

  const retryLast = () => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (!last || sending) return;
    // The user's message is already stored; ask again without duplicating it.
    setSending(true);
    setError(null);
    setDraft("");
    postJson<ChatResponse>("/api/specialist/chat", {
      messages: messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      childContext: aiContext.childContext,
      preferences: aiContext.preferences,
    })
      .then(async (response) => {
        const reply = await client.addMessage({ conversationId: last.conversationId, role: "assistant", content: response.reply, sources: response.sources, isDemo: response.meta.isDemo, safetyFlag: response.safetyFlag });
        setMessages((current) => [...current, reply]);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setSending(false));
  };

  const awaitingReply = messages.length > 0 && messages[messages.length - 1].role === "user" && !sending;
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const listProps = {
    conversations,
    activeId,
    onSelect: (id: string) => { setActiveId(id); setListOpen(false); },
    onRename: (c: Conversation) => { setRenameValue(c.title); setRenaming(c); },
    onDelete: (c: Conversation) => setDeleting(c),
  };

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] min-h-[26rem] gap-5 lg:h-[calc(100dvh-8.5rem)]">
      <aside className="hidden w-64 shrink-0 flex-col rounded-(--radius-card) border border-ink-100 bg-white/70 p-3 md:flex" aria-label="Conversations">
        <Button variant="secondary" className="mb-3 w-full" onClick={startNew}><Plus aria-hidden /> New conversation</Button>
        <div className="min-h-0 flex-1 overflow-y-auto"><ConversationList {...listProps} /></div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-(--radius-card) border border-ink-100 bg-white/80 shadow-(--shadow-soft)" aria-label="Conversation with the PDA Specialist">
        <header className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold text-ink-900">{active?.title ?? "PDA Specialist"}</h1>
            <p className="truncate text-xs text-ink-500">
              An AI assistant, not a clinician.
              {selectedChild ? (settings.shareProfileWithAi ? ` Using ${childLabel(selectedChild.preferredName)}’s profile.` : " Profile personalisation is off.") : ""}
              {selectedChild && !settings.shareProfileWithAi ? <button type="button" className="ml-1 font-medium text-sage-700 underline underline-offset-2" onClick={() => setConsentOpen(true)}>Turn on</button> : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            <Button variant="outline" size="icon-sm" onClick={() => setListOpen(true)} aria-label="Show conversations"><MessagesSquare aria-hidden /></Button>
            <Button variant="secondary" size="icon-sm" onClick={startNew} aria-label="New conversation"><Plus aria-hidden /></Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" role="log" aria-live="polite" aria-label="Messages">
          {loadingMessages ? (
            <div className="space-y-3"><Skeleton className="ml-auto h-12 w-2/3" /><Skeleton className="h-28 w-5/6" /></div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-sage-100 text-sage-700"><MessageCircleHeart className="size-6" aria-hidden /></div>
              <h2 className="text-xl font-semibold text-ink-900">What’s on your mind?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">Describe a situation in your own words, or start with one of these.</p>
              <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                {STARTERS.map((starter) => (
                  <button key={starter} type="button" disabled={sending} onClick={() => void send(starter)} className="min-h-12 rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-left text-sm text-ink-900 transition-colors hover:border-sage-300 hover:bg-sage-50">
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="mx-auto max-w-2xl space-y-4">
              {messages.map((message) => (
                <li key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  {message.role === "user" ? (
                    <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-sage-600 px-4 py-2.5 text-[15px] leading-relaxed text-white">
                      <span className="sr-only">You said: </span>{message.content}
                    </div>
                  ) : (
                    <div className={cn("max-w-[92%] rounded-3xl rounded-bl-lg border px-4 py-3", message.safetyFlag ? "border-rose-soft-600/30 bg-rose-soft-100/60" : "border-ink-100 bg-cream-50")}>
                      <span className="sr-only">PDA Specialist said: </span>
                      {message.safetyFlag ? <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-rose-soft-600"><ShieldAlert className="size-4" aria-hidden /> Safety information included</p> : null}
                      <MessageText text={message.content} />
                      {message.sources.length > 0 || message.isDemo ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                          {message.isDemo ? <DemoBadge /> : null}
                          {message.sources.map((source) => (
                            <Link key={source.slug} href={`/knowledge/${source.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-sage-800 ring-1 ring-sage-200 hover:bg-sage-50">
                              <BookOpen className="size-3" aria-hidden /> {source.title}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
              {sending ? (
                <li className="flex justify-start" role="status">
                  <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-ink-100 bg-cream-50 px-4 py-3.5">
                    <span className="sr-only">The specialist is writing</span>
                    {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse-soft rounded-full bg-sage-400" style={{ animationDelay: `${i * 0.2}s` }} aria-hidden />)}
                  </div>
                </li>
              ) : null}
            </ol>
          )}
          {error ? (
            <div role="alert" className="mx-auto mt-4 max-w-2xl rounded-2xl bg-rose-soft-100 px-4 py-3 text-sm text-rose-soft-600">
              {error}
              {awaitingReply ? <Button variant="link" size="sm" className="ml-2 h-auto p-0 text-rose-soft-600" onClick={retryLast}>Try again</Button> : null}
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-ink-100 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <Label htmlFor="chat-input" className="sr-only">Message the PDA Specialist</Label>
            <Textarea
              id="chat-input"
              value={draft}
              rows={1}
              maxLength={4000}
              placeholder="Type your message…"
              className="max-h-36 min-h-12 flex-1 resize-none"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message"><SendHorizonal aria-hidden /></Button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-snug text-ink-500">
            General information and ideas, not medical advice. In an emergency call 999.
          </p>
        </form>
      </section>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent title="Conversations">
          <Button variant="secondary" className="mb-3 w-full" onClick={startNew}><Plus aria-hidden /> New conversation</Button>
          <ConversationList {...listProps} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent title="Rename conversation">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!renaming || !renameValue.trim()) return;
              try {
                await actions.renameConversation(renaming.id, renameValue);
                setRenaming(null);
              } catch {
                toast("That didn’t save. Please try again.", "error");
              }
            }}
          >
            <Label htmlFor="rename-input">Title</Label>
            <Input id="rename-input" className="mt-1.5" value={renameValue} maxLength={80} autoFocus onChange={(e) => setRenameValue(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={!renameValue.trim()}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete this conversation?" description="The conversation and all of its messages will be permanently removed.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await actions.deleteConversation(deleting.id);
                  if (activeId === deleting.id) startNew();
                  toast("Conversation deleted.");
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

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} />
    </div>
  );
}
