"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAppData } from "@/lib/data/app-data";

/** Disclosure shown before any child profile detail is included in AI requests. */
export function ConsentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { actions, config } = useAppData();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const provider = config?.ai.live ? (config.ai.provider === "anthropic" ? "Anthropic (Claude)" : "OpenAI") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Use profile details to personalise?" description="You are in control of this and can turn it off at any time in Settings.">
        <div className="space-y-3 text-sm leading-relaxed text-ink-700">
          <p>When this is on, the details in the selected child profile and the preferences you have confirmed are included with your translator and specialist requests, so suggestions fit your child better.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Never sent:</strong> your child’s name. The AI only sees “your child”.</li>
            <li><strong>Sent:</strong> the other profile fields you have filled in (for example age range, interests, what helps).</li>
            <li>
              <strong>Processed by:</strong>{" "}
              {provider
                ? `${provider}, an external AI provider, only to produce your response.`
                : "nothing external at the moment – this site is using its built-in demo engine. If the owner connects a live AI provider, details would be sent to that provider."}
            </li>
            <li>Your conversations and profiles are not used to train shared AI models by this app.</li>
          </ul>
          <p>Please only include information you are comfortable sharing, and avoid full names, addresses or school names.</p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild><Button variant="outline">Not now</Button></DialogClose>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await actions.updateSettings({ shareProfileWithAi: true, shareProfileConsentAt: new Date().toISOString() });
                toast("Personalisation is on.");
                onOpenChange(false);
              } catch {
                toast("That didn’t save. Please try again.", "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            Yes, personalise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
