"use client";

import { Check, CircleHelp, Eye, Pencil, Plus, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import * as React from "react";
import { childLabel } from "@/components/app/child-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { emptyChildProfile } from "@/lib/data/client";
import { useAppData } from "@/lib/data/app-data";
import { CHILD_PROFILE_FIELDS, PREFERENCE_STATEMENTS, type ChildProfile, type ChildProfileInput, type CommunicationPreference, type PreferenceKey } from "@/lib/types";

const CATEGORY_INFO = {
  confirmed: { title: "Confirmed by you", icon: Check, tone: "sage" as const, help: "Used when generating translations and specialist replies (if personalisation is on)." },
  observation: { title: "Noticed in your feedback", icon: Eye, tone: "sky" as const, help: "Patterns seen at least twice in the feedback you gave. Not used until you confirm them." },
  suggestion: { title: "Suggestions to consider", icon: Sparkles, tone: "amber" as const, help: "Tentative ideas from a single piece of feedback. Not used until you confirm them." },
};

function ProfileForm({ initial, onSubmit, submitLabel }: { initial: ChildProfileInput; onSubmit(values: ChildProfileInput): Promise<void>; submitLabel: string }) {
  const [values, setValues] = React.useState<ChildProfileInput>({ ...emptyChildProfile(), ...initial });
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(values);
        setBusy(false);
      }}
    >
      <p className="rounded-2xl bg-sage-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
        Every field is optional. Share only what feels useful, and avoid surnames, addresses or school names.
      </p>
      {CHILD_PROFILE_FIELDS.map((field) => {
        const id = `profile-${field.key}`;
        const common = {
          id,
          value: values[field.key] ?? "",
          "aria-describedby": `${id}-hint`,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [field.key]: e.target.value })),
        };
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={id}>{field.label}</Label>
            {field.multiline ? <Textarea rows={2} maxLength={600} {...common} /> : <Input maxLength={field.key === "preferredName" ? 60 : 300} {...common} />}
            <p id={`${id}-hint`} className="text-xs text-ink-500">{field.hint}</p>
          </div>
        );
      })}
      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-ink-100 bg-cream-50 px-5 pb-1 pt-4 sm:-mx-6 sm:px-6">
        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function PreferenceRow({ preference }: { preference: CommunicationPreference }) {
  const { actions } = useAppData();
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(preference.statement);
  const wrap = async (fn: () => Promise<void>, done?: string) => {
    try {
      await fn();
      if (done) toast(done);
    } catch {
      toast("That didn’t save. Please try again.", "error");
    }
  };

  return (
    <li className="rounded-2xl bg-cream-100 p-3">
      {editing ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            void wrap(async () => {
              await actions.updatePreference(preference.id, { statement: value.trim() });
              setEditing(false);
            });
          }}
        >
          <Input value={value} maxLength={240} aria-label="Preference wording" onChange={(e) => setValue(e.target.value)} className="h-10" autoFocus />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Save</Button>
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setValue(preference.statement); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm text-ink-900">
            {preference.statement}
            {preference.category !== "confirmed" && preference.evidenceCount > 0 ? <span className="ml-1.5 text-xs text-ink-500">(seen {preference.evidenceCount}×)</span> : null}
          </p>
          <div className="flex items-center gap-1">
            {preference.category !== "confirmed" ? (
              <Button size="sm" variant="secondary" onClick={() => void wrap(() => actions.updatePreference(preference.id, { category: "confirmed", source: "parent" }), "Confirmed. This will now be used for personalisation.")}>
                <Check aria-hidden /> Confirm
              </Button>
            ) : null}
            <Button size="icon-sm" variant="ghost" aria-label={`Edit: ${preference.statement}`} onClick={() => setEditing(true)}><Pencil aria-hidden /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={`Remove: ${preference.statement}`} onClick={() => void wrap(() => actions.deletePreference(preference.id), "Removed.")}><Trash2 aria-hidden /></Button>
          </div>
        </div>
      )}
    </li>
  );
}

function AddPreference({ childId }: { childId: string }) {
  const { actions, preferences } = useAppData();
  const toast = useToast();
  const [chosen, setKey] = React.useState<PreferenceKey>("prefers_descriptive");
  const [custom, setCustom] = React.useState("");
  const existing = new Set(preferences.filter((p) => p.childProfileId === childId).map((p) => p.key));
  const options = (Object.keys(PREFERENCE_STATEMENTS) as Exclude<PreferenceKey, "custom">[]).filter((k) => !existing.has(k));
  // If the chosen option has since been added, fall back to the next available one.
  const key: PreferenceKey = chosen !== "custom" && existing.has(chosen) ? (options[0] ?? "custom") : chosen;

  return (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const statement = key === "custom" ? custom.trim() : PREFERENCE_STATEMENTS[key];
        if (!statement) return;
        try {
          await actions.createPreference({ childProfileId: childId, key, statement, category: "confirmed", source: "parent", evidenceCount: 0 });
          setCustom("");
          toast("Preference added.");
        } catch {
          toast("That didn’t save. Please try again.", "error");
        }
      }}
    >
      <div className="flex-1 space-y-1.5">
        <Label htmlFor={`add-pref-${childId}`}>Add a preference you already know</Label>
        <Select id={`add-pref-${childId}`} value={key} onChange={(e) => setKey(e.target.value as PreferenceKey)}>
          {options.map((k) => <option key={k} value={k}>{PREFERENCE_STATEMENTS[k]}</option>)}
          <option value="custom">Write my own…</option>
        </Select>
      </div>
      {key === "custom" ? <Input aria-label="Your own preference" className="flex-1" value={custom} maxLength={240} placeholder="For example: Whispering works better than talking" onChange={(e) => setCustom(e.target.value)} /> : null}
      <Button type="submit" variant="secondary" className="h-12"><Plus aria-hidden /> Add</Button>
    </form>
  );
}

function ProfileCard({ child, onEdit, onDelete }: { child: ChildProfile; onEdit(): void; onDelete(): void }) {
  const { preferences, selectedChild, actions } = useAppData();
  const mine = preferences.filter((p) => p.childProfileId === child.id);
  const filled = CHILD_PROFILE_FIELDS.filter((f) => f.key !== "preferredName" && f.key !== "ageRange" && child[f.key]?.trim());
  const isSelected = selectedChild?.id === child.id;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700"><UserRound className="size-5" aria-hidden /></div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-ink-900">{childLabel(child.preferredName)}</h2>
              <p className="text-sm text-ink-500">{child.ageRange ? `Age ${child.ageRange}` : "Age not given"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSelected ? <Badge><Check aria-hidden /> Selected</Badge> : <Button size="sm" variant="secondary" onClick={() => void actions.updateSettings({ selectedChildProfileId: child.id })}>Use this profile</Button>}
            <Button size="icon-sm" variant="outline" aria-label={`Edit ${childLabel(child.preferredName)}`} onClick={onEdit}><Pencil aria-hidden /></Button>
            <Button size="icon-sm" variant="outline" aria-label={`Delete ${childLabel(child.preferredName)}`} onClick={onDelete}><Trash2 aria-hidden /></Button>
          </div>
        </div>

        {filled.length > 0 ? (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {filled.map((field) => (
              <div key={field.key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{field.label}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-900">{child[field.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-ink-500">No details added yet. Everything is optional – add what feels useful.</p>
        )}

        <section aria-label="Communication preferences" className="space-y-4 border-t border-ink-100 pt-5">
          <h3 className="text-base font-semibold text-ink-900">Communication preferences</h3>
          {(["confirmed", "observation", "suggestion"] as const).map((category) => {
            const info = CATEGORY_INFO[category];
            const items = mine.filter((p) => p.category === category);
            const Icon = info.icon;
            if (category !== "confirmed" && items.length === 0) return null;
            return (
              <div key={category}>
                <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                  <Badge tone={info.tone}><Icon aria-hidden /> {info.title}</Badge>
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500"><CircleHelp className="mt-0.5 size-3 shrink-0" aria-hidden /> {info.help}</p>
                {items.length > 0 ? (
                  <ul className="mt-2 space-y-2">{items.map((p) => <PreferenceRow key={p.id} preference={p} />)}</ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-500">Nothing confirmed yet.</p>
                )}
              </div>
            );
          })}
          <AddPreference childId={child.id} />
        </section>
      </CardContent>
    </Card>
  );
}

export function Profiles() {
  const { children, actions } = useAppData();
  const toast = useToast();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<ChildProfile | null>(null);
  const [deleting, setDeleting] = React.useState<ChildProfile | null>(null);

  return (
    <div>
      <PageHeader
        title="My Child Profiles"
        description="Optional details that help tailor suggestions. You decide what to include, and whether it is shared with the AI."
        actions={<Button onClick={() => setCreating(true)}><Plus aria-hidden /> Add profile</Button>}
      />

      {children.length === 0 ? (
        <EmptyState icon={<Users />} title="No profiles yet" description="A profile is optional. Adding one lets the translator and specialist take your child’s preferences into account." action={<Button onClick={() => setCreating(true)}><Plus aria-hidden /> Create a profile</Button>} />
      ) : (
        <div className="space-y-5">
          {children.map((child) => <ProfileCard key={child.id} child={child} onEdit={() => setEditing(child)} onDelete={() => setDeleting(child)} />)}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="New child profile">
          <ProfileForm
            initial={{}}
            submitLabel="Create profile"
            onSubmit={async (values) => {
              try {
                await actions.createChild(values);
                setCreating(false);
                toast("Profile created.");
              } catch {
                toast("That didn’t save. Please try again.", "error");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent title="Edit profile">
          {editing ? (
            <ProfileForm
              key={editing.id}
              initial={editing}
              submitLabel="Save changes"
              onSubmit={async (values) => {
                try {
                  await actions.updateChild(editing.id, values);
                  setEditing(null);
                  toast("Profile updated.");
                } catch {
                  toast("That didn’t save. Please try again.", "error");
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title={`Delete ${deleting ? childLabel(deleting.preferredName) : "profile"}?`} description="The profile and its communication preferences will be permanently removed. Past translations and conversations are kept, but will no longer be linked to this profile.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await actions.deleteChild(deleting.id);
                  toast("Profile deleted.");
                } catch {
                  toast("That couldn’t be deleted. Please try again.", "error");
                }
                setDeleting(null);
              }}
            >
              Delete profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
