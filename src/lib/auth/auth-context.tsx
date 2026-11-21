"use client";

import * as React from "react";
import { publicConfig } from "@/lib/config";
import { DEMO_USER } from "@/lib/data/demo-seed";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface SessionUser {
  id: string;
  email: string;
  isDemo: boolean;
}

interface AuthResult {
  ok: boolean;
  message?: string;
  /** True when sign-up succeeded but the email address still needs confirming. */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  mode: "demo" | "supabase";
  user: SessionUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, displayName: string): Promise<AuthResult>;
  signInDemo(): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

export const DEMO_SESSION_KEY = "pda-companion:session";

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}

/** Maps provider errors to calm, non-technical messages (and avoids revealing whether an email exists). */
export function friendlyAuthError(message: string | undefined): string {
  const lower = (message ?? "").toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "That email and password don’t match. Please try again.";
  if (lower.includes("email not confirmed")) return "Please confirm your email address first – check your inbox for the link.";
  if (lower.includes("already registered") || lower.includes("already been registered")) return "An account with that email may already exist. Try signing in instead.";
  if (lower.includes("password")) return "Please choose a password of at least 8 characters.";
  if (lower.includes("rate") || lower.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  return "Something went wrong. Please try again in a moment.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode: AuthContextValue["mode"] = publicConfig.supabaseConfigured ? "supabase" : "demo";
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (mode === "demo") {
      try {
        const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
        if (raw) setUser(JSON.parse(raw) as SessionUser);
      } catch {
        /* no session */
      }
      setLoading(false);
      return;
    }
    const supabase = getBrowserSupabase();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? "", isDemo: false } : null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "", isDemo: false } : null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [mode]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      loading,
      async signIn(email, password) {
        if (mode === "demo") return { ok: false, message: "Accounts are not configured yet. Use the demo to explore." };
        const { error } = await getBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
        return error ? { ok: false, message: friendlyAuthError(error.message) } : { ok: true };
      },
      async signUp(email, password, displayName) {
        if (mode === "demo") return { ok: false, message: "Accounts are not configured yet. Use the demo to explore." };
        if (password.length < 8) return { ok: false, message: "Please choose a password of at least 8 characters." };
        const { data, error } = await getBrowserSupabase().auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim().slice(0, 80) }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) return { ok: false, message: friendlyAuthError(error.message) };
        return { ok: true, needsConfirmation: !data.session };
      },
      async signInDemo() {
        if (mode !== "demo") return { ok: false, message: "Demo mode is only available before accounts are configured." };
        const session: SessionUser = { id: DEMO_USER.id, email: DEMO_USER.email, isDemo: true };
        window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
        setUser(session);
        return { ok: true };
      },
      async resetPassword(email) {
        if (mode === "demo") return { ok: false, message: "Accounts are not configured yet." };
        await getBrowserSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/settings` });
        // Always the same message, whether or not the address is registered.
        return { ok: true, message: "If that address has an account, a reset link is on its way." };
      },
      async signOut() {
        if (mode === "demo") {
          window.localStorage.removeItem(DEMO_SESSION_KEY);
          setUser(null);
          return;
        }
        await getBrowserSupabase().auth.signOut();
        setUser(null);
      },
    }),
    [mode, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
