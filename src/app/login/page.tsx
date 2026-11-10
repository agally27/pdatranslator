"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Brand, TAGLINE } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth-context";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [form, setForm] = React.useState({ email: "", password: "", name: "" });
  const [resetMode, setResetMode] = React.useState(false);

  React.useEffect(() => {
    if (!auth.loading && auth.user) router.replace("/dashboard");
  }, [auth.loading, auth.user, router]);

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link") {
      setMessage({ tone: "error", text: "That link has expired or was already used. Please try again." });
    }
  }, []);

  const run = async (action: () => Promise<{ ok: boolean; message?: string; needsConfirmation?: boolean }>) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setMessage({ tone: "error", text: result.message ?? "Something went wrong. Please try again." });
    else if (result.needsConfirmation) setMessage({ tone: "info", text: "Almost there – check your inbox and confirm your email address to finish." });
    else if (result.message) setMessage({ tone: "info", text: result.message });
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Link href="/" aria-label="PDA Companion home"><Brand /></Link>
        <p className="mt-3 text-sm text-ink-500">{TAGLINE}</p>
      </div>

      <Card>
        <CardContent>
          {auth.mode === "demo" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <h1 className="text-2xl font-semibold text-ink-900">Explore the demo</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Accounts have not been set up on this site yet, so PDA Companion is running in demo mode. Everything you enter
                stays in this browser, and an example child profile is included to get you started.
              </p>
              <Button size="lg" className="mt-6 w-full" disabled={busy || auth.loading} onClick={() => run(auth.signInDemo)}>
                {busy ? <Spinner /> : null} Continue in demo mode
              </Button>
              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                Site owner: add your Supabase keys to enable real accounts. See the README.
              </p>
            </div>
          ) : resetMode ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => auth.resetPassword(form.email)); }}>
              <h1 className="text-2xl font-semibold text-ink-900">Reset your password</h1>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email address</Label>
                <Input id="reset-email" type="email" autoComplete="email" required {...field("email")} />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : null} Send reset link</Button>
              <Button variant="link" className="w-full" onClick={() => { setResetMode(false); setMessage(null); }}>Back to sign in</Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" onValueChange={() => setMessage(null)}>
              <h1 className="sr-only">Sign in or create an account</h1>
              <TabsList>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => auth.signIn(form.email, form.password)); }}>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email address</Label>
                    <Input id="signin-email" type="email" autoComplete="email" required {...field("email")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" autoComplete="current-password" required {...field("password")} />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : null} Sign in</Button>
                  <Button variant="link" className="w-full" onClick={() => { setResetMode(true); setMessage(null); }}>Forgotten your password?</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => auth.signUp(form.email, form.password, form.name)); }}>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Your first name <span className="font-normal text-ink-500">(optional)</span></Label>
                    <Input id="signup-name" autoComplete="given-name" maxLength={80} {...field("name")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email address</Label>
                    <Input id="signup-email" type="email" autoComplete="email" required {...field("email")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" {...field("password")} />
                    <p id="password-hint" className="text-xs text-ink-500">At least 8 characters.</p>
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Spinner /> : null} Create account</Button>
                  <p className="text-xs leading-relaxed text-ink-500">
                    By creating an account you confirm you have read the <Link href="/privacy" className="underline underline-offset-2">privacy notice</Link>.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {message ? (
            <p role={message.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl px-4 py-3 text-sm ${message.tone === "error" ? "bg-rose-soft-100 text-rose-soft-600" : "bg-sage-100 text-sage-800"}`}>
              {message.text}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-ink-500">
        <Link href="/privacy" className="underline underline-offset-2">Privacy notice</Link>
      </p>
    </main>
  );
}
