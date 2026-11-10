"use client";

import { CircleCheck, CircleDashed, Download, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ConsentDialog } from "@/components/app/consent-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { errorMessage, postJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppData } from "@/lib/data/app-data";

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange(next: boolean): void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <Label htmlFor={id} className="text-base text-ink-900">{label}</Label>
        <p id={`${id}-desc`} className="mt-0.5 text-sm leading-relaxed text-ink-500">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-desc`} />
    </div>
  );
}

function StatusRow({ live, label, detail }: { live: boolean; label: string; detail: string }) {
  const Icon = live ? CircleCheck : CircleDashed;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className={live ? "mt-0.5 size-5 shrink-0 text-sage-600" : "mt-0.5 size-5 shrink-0 text-amber-soft-600"} aria-hidden />
      <div>
        <p className="font-medium text-ink-900">{label} <span className="font-normal text-ink-500">– {live ? "connected" : "not configured"}</span></p>
        <p className="text-sm leading-relaxed text-ink-500">{detail}</p>
      </div>
    </li>
  );
}

export function SettingsView() {
  const { profile, settings, actions, client, config, translations } = useAppData();
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = React.useState(profile.displayName);
  const [consentOpen, setConsentOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const save = async (fn: () => Promise<void>, done = "Saved.") => {
    try {
      await fn();
      toast(done);
    } catch {
      toast("That didn’t save. Please try again.", "error");
    }
  };

  const exportData = async () => {
    try {
      const data = await client.exportAll();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `pda-companion-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("Your data has been downloaded.");
    } catch {
      toast("The export couldn’t be created. Please try again.", "error");
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      // Remove the personal data first (RLS-scoped), then the login itself.
      await actions.deleteAllData();
      let note: string | null = null;
      try {
        await postJson("/api/account/delete", { confirm: "DELETE" });
      } catch (err) {
        note = errorMessage(err);
      }
      await auth.signOut();
      if (note) window.alert(note);
      router.replace("/");
    } catch {
      toast("We couldn’t delete everything just now. Please try again.", "error");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your details, privacy choices and data." />

      <Card>
        <CardHeader><CardTitle>About you</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); void save(() => actions.updateProfile(name)); }}>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="display-name">What should we call you? <span className="font-normal text-ink-500">(optional)</span></Label>
              <Input id="display-name" value={name} maxLength={80} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" className="h-12" disabled={name.trim() === profile.displayName}>Save</Button>
          </form>
          <p className="mt-3 text-sm text-ink-500">{auth.user?.isDemo ? "You are using the demo, so there is no account email." : `Signed in as ${auth.user?.email}`}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy and personalisation</CardTitle>
          <CardDescription>You are in control of what is stored and what is shared with AI.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-ink-100 pt-2">
          <ToggleRow
            id="share-profile"
            label="Use child profile details to personalise AI responses"
            description={`When on, the selected profile (never the name) and your confirmed preferences are included with AI requests.${settings.shareProfileConsentAt && settings.shareProfileWithAi ? ` Turned on ${new Date(settings.shareProfileConsentAt).toLocaleDateString("en-GB")}.` : ""}`}
            checked={settings.shareProfileWithAi}
            onChange={(next) => (next ? setConsentOpen(true) : void save(() => actions.updateSettings({ shareProfileWithAi: false }), "Personalisation is off. Profile details will not be sent."))}
          />
          <ToggleRow
            id="save-history"
            label="Keep my translation history"
            description="When off, new translations are not stored unless you save an alternative or give feedback on it."
            checked={settings.saveHistory}
            onChange={(next) => void save(() => actions.updateSettings({ saveHistory: next }))}
          />
          <ToggleRow
            id="reduce-motion"
            label="Reduce motion"
            description="Turns off animations and transitions. Your device’s own reduced-motion setting is always respected too."
            checked={settings.reduceMotion}
            onChange={(next) => void save(() => actions.updateSettings({ reduceMotion: next }))}
          />
          <p className="pt-4 text-sm text-ink-500">Voice recordings are never stored. Read the full <Link href="/privacy" className="font-medium text-sage-700 underline underline-offset-2">privacy notice</Link>.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected services</CardTitle>
          <CardDescription>What this site is currently using. The site owner configures these.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {config ? (
            <ul className="divide-y divide-ink-100">
              <StatusRow live={config.dataMode === "supabase"} label="Accounts and secure storage (Supabase)" detail={config.dataMode === "supabase" ? "Your information is stored in your account and protected by row-level security." : "Demo mode: information is kept only in this browser and will be lost if browser data is cleared."} />
              <StatusRow live={config.ai.live} label="AI model" detail={config.ai.live ? `Translations and specialist replies are generated by ${config.ai.provider === "anthropic" ? "Anthropic Claude" : "OpenAI"} (${config.ai.model}).` : "Responses come from the built-in demo engine and are labelled “Demo response”. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to enable live AI."} />
              <StatusRow live={config.transcription.live} label="Voice transcription (OpenAI)" detail={config.transcription.live ? `Recordings are transcribed with ${config.transcription.model} and then discarded.` : "Voice input inserts an example sentence. Add OPENAI_API_KEY to enable live transcription."} />
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Service status is unavailable right now.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Download a copy, clear your history, or delete everything.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportData()}><Download aria-hidden /> Download my data</Button>
          <Button variant="outline" disabled={translations.length === 0} onClick={() => setClearOpen(true)}><Trash2 aria-hidden /> Clear translation history</Button>
          <Button variant="outline" onClick={async () => { await auth.signOut(); router.replace("/login"); }}><LogOut aria-hidden /> {auth.user?.isDemo ? "Leave demo" : "Sign out"}</Button>
          <Button variant="danger" onClick={() => { setConfirmText(""); setDeleteOpen(true); }}><Trash2 aria-hidden /> {auth.user?.isDemo ? "Delete demo data" : "Delete my account"}</Button>
        </CardContent>
      </Card>

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} />

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent title="Clear translation history?" description="All translations, favourites and feedback will be permanently removed. Profiles and conversations are not affected.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="danger" onClick={() => { setClearOpen(false); void save(() => actions.clearTranslations(), "History cleared."); }}>Clear history</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          title={auth.user?.isDemo ? "Delete all demo data?" : "Delete your account?"}
          description="This permanently removes your profile, child profiles, preferences, translations, favourites, feedback and conversations. It cannot be undone."
        >
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
            <Input id="confirm-delete" value={confirmText} autoComplete="off" onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="danger" disabled={confirmText.trim() !== "DELETE" || busy} onClick={() => void deleteAccount()}>Delete everything</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
