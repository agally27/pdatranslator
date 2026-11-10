"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { ConfigStatus } from "@/lib/config";
import { buildAiContext, planInsightSync } from "@/lib/personalisation/engine";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type {
  ChildProfile,
  ChildProfileInput,
  CommunicationPreference,
  Conversation,
  SavedTranslation,
  TranslationFeedback,
  TranslationRecord,
  TranslationResult,
  UserProfile,
  UserSettings,
} from "@/lib/types";
import type { DataClient, NewFeedback, NewPreference, NewSaved, NewTranslation } from "./client";
import { DEMO_USER, seedDemoData } from "./demo-seed";
import { LocalDataClient } from "./local";
import { SupabaseDataClient } from "./supabase";

interface AppState {
  profile: UserProfile;
  settings: UserSettings;
  children: ChildProfile[];
  preferences: CommunicationPreference[];
  translations: TranslationRecord[];
  feedback: TranslationFeedback[];
  saved: SavedTranslation[];
  conversations: Conversation[];
}

interface AppDataValue extends AppState {
  client: DataClient;
  config: ConfigStatus | null;
  selectedChild: ChildProfile | null;
  /** What may accompany AI requests for the selected child (empty unless the parent opted in). */
  aiContext: ReturnType<typeof buildAiContext>;
  actions: {
    updateProfile(displayName: string): Promise<void>;
    updateSettings(patch: Partial<Omit<UserSettings, "userId" | "updatedAt">>): Promise<void>;
    createChild(input: ChildProfileInput): Promise<ChildProfile>;
    updateChild(id: string, patch: ChildProfileInput): Promise<void>;
    deleteChild(id: string): Promise<void>;
    createPreference(input: NewPreference): Promise<void>;
    updatePreference(id: string, patch: Partial<Pick<CommunicationPreference, "statement" | "category" | "source">>): Promise<void>;
    deletePreference(id: string): Promise<void>;
    createTranslation(input: NewTranslation): Promise<TranslationRecord>;
    updateTranslationResult(id: string, result: TranslationResult): Promise<void>;
    deleteTranslation(id: string): Promise<void>;
    clearTranslations(): Promise<void>;
    addFeedback(input: NewFeedback): Promise<void>;
    saveAlternative(input: NewSaved): Promise<void>;
    unsave(id: string): Promise<void>;
    createConversation(title: string): Promise<Conversation>;
    renameConversation(id: string, title: string): Promise<void>;
    deleteConversation(id: string): Promise<void>;
    touchConversation(id: string): void;
    deleteAllData(): Promise<void>;
  };
}

const AppDataContext = React.createContext<AppDataValue | null>(null);

export function useAppData(): AppDataValue {
  const value = React.useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside <AppDataProvider>.");
  return value;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; client: DataClient; data: AppState };

export function AppDataProvider({ children, fallback, errorFallback }: { children: React.ReactNode; fallback: React.ReactNode; errorFallback: (message: string, retry: () => void) => React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [config, setConfig] = React.useState<ConfigStatus | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setConfig(c))
      .catch(() => setConfig(null));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    let active = true;
    setState({ status: "loading" });
    (async () => {
      try {
        let client: DataClient;
        if (user.isDemo) {
          const local = new LocalDataClient(user.id, window.localStorage, DEMO_USER.displayName);
          await seedDemoData(local);
          client = local;
        } else {
          client = new SupabaseDataClient(getBrowserSupabase(), user.id);
        }
        const [profile, settings, kids, preferences, translations, feedback, saved, conversations] = await Promise.all([
          client.getProfile(), client.getSettings(), client.listChildProfiles(), client.listPreferences(),
          client.listTranslations(), client.listFeedback(), client.listSaved(), client.listConversations(),
        ]);
        if (active) setState({ status: "ready", client, data: { profile, settings, children: kids, preferences, translations, feedback, saved, conversations } });
      } catch {
        if (active) setState({ status: "error", message: "We couldn’t load your information. Please check your connection and try again." });
      }
    })();
    return () => {
      active = false;
    };
  }, [user, attempt]);

  const patch = React.useCallback((fn: (data: AppState) => AppState) => {
    setState((current) => (current.status === "ready" ? { ...current, data: fn(current.data) } : current));
  }, []);

  const ready = state.status === "ready" ? state : null;
  const client = ready?.client;
  const dataRef = React.useRef<AppState | null>(null);
  const latestData = ready?.data ?? null;
  React.useEffect(() => {
    dataRef.current = latestData;
  }, [latestData]);

  const actions = React.useMemo<AppDataValue["actions"] | null>(() => {
    if (!client) return null;
    const refreshSettings = async () => { const settings = await client.getSettings(); patch((d) => ({ ...d, settings })); };
    return {
      async updateProfile(displayName) {
        const profile = await client.updateProfile({ displayName });
        patch((d) => ({ ...d, profile }));
      },
      async updateSettings(change) {
        const settings = await client.updateSettings(change);
        patch((d) => ({ ...d, settings }));
      },
      async createChild(input) {
        const child = await client.createChildProfile(input);
        patch((d) => ({ ...d, children: [...d.children, child] }));
        await refreshSettings();
        return child;
      },
      async updateChild(id, change) {
        const child = await client.updateChildProfile(id, change);
        patch((d) => ({ ...d, children: d.children.map((c) => (c.id === id ? child : c)) }));
      },
      async deleteChild(id) {
        await client.deleteChildProfile(id);
        const [settings, preferences, translations, saved, conversations, feedback] = await Promise.all([
          client.getSettings(), client.listPreferences(), client.listTranslations(), client.listSaved(), client.listConversations(), client.listFeedback(),
        ]);
        let nextSettings = settings;
        const remaining = (dataRef.current?.children ?? []).filter((c) => c.id !== id);
        if (!settings.selectedChildProfileId && remaining[0]) nextSettings = await client.updateSettings({ selectedChildProfileId: remaining[0].id });
        patch((d) => ({ ...d, children: d.children.filter((c) => c.id !== id), settings: nextSettings, preferences, translations, saved, conversations, feedback }));
      },
      async createPreference(input) {
        const pref = await client.createPreference(input);
        patch((d) => ({ ...d, preferences: [...d.preferences, pref] }));
      },
      async updatePreference(id, change) {
        const pref = await client.updatePreference(id, change);
        patch((d) => ({ ...d, preferences: d.preferences.map((p) => (p.id === id ? pref : p)) }));
      },
      async deletePreference(id) {
        await client.deletePreference(id);
        patch((d) => ({ ...d, preferences: d.preferences.filter((p) => p.id !== id) }));
      },
      async createTranslation(input) {
        const record = await client.createTranslation(input);
        patch((d) => ({ ...d, translations: [record, ...d.translations] }));
        return record;
      },
      async updateTranslationResult(id, result) {
        await client.updateTranslationResult(id, result);
        patch((d) => ({ ...d, translations: d.translations.map((t) => (t.id === id ? { ...t, result } : t)) }));
      },
      async deleteTranslation(id) {
        await client.deleteTranslation(id);
        patch((d) => ({
          ...d,
          translations: d.translations.filter((t) => t.id !== id),
          saved: d.saved.filter((s) => s.translationId !== id),
          feedback: d.feedback.filter((f) => f.translationId !== id),
        }));
      },
      async clearTranslations() {
        await client.clearTranslations();
        patch((d) => ({ ...d, translations: [], saved: [], feedback: [] }));
      },
      async addFeedback(input) {
        const row = await client.addFeedback(input);
        const current = dataRef.current;
        const feedback = [...(current?.feedback ?? []).filter((f) => !(f.translationId === input.translationId && f.alternativeId === input.alternativeId)), row];
        // Personalisation: turn feedback patterns into observations / suggestions (never straight to confirmed).
        const plan = planInsightSync(current?.preferences ?? [], feedback);
        for (const insight of plan.create) await client.createPreference(insight);
        for (const change of plan.update) await client.updatePreference(change.id, { category: change.category, source: change.source, evidenceCount: change.evidenceCount });
        const preferences = plan.create.length || plan.update.length ? await client.listPreferences() : (current?.preferences ?? []);
        patch((d) => ({ ...d, feedback, preferences }));
      },
      async saveAlternative(input) {
        const row = await client.saveAlternative(input);
        patch((d) => ({ ...d, saved: [row, ...d.saved.filter((s) => s.id !== row.id)] }));
      },
      async unsave(id) {
        await client.unsave(id);
        patch((d) => ({ ...d, saved: d.saved.filter((s) => s.id !== id) }));
      },
      async createConversation(title) {
        const conversation = await client.createConversation({ title, childProfileId: dataRef.current?.settings.selectedChildProfileId ?? null });
        patch((d) => ({ ...d, conversations: [conversation, ...d.conversations] }));
        return conversation;
      },
      async renameConversation(id, title) {
        await client.renameConversation(id, title);
        patch((d) => ({ ...d, conversations: d.conversations.map((c) => (c.id === id ? { ...c, title: title.trim().slice(0, 80) || c.title } : c)) }));
      },
      async deleteConversation(id) {
        await client.deleteConversation(id);
        patch((d) => ({ ...d, conversations: d.conversations.filter((c) => c.id !== id) }));
      },
      touchConversation(id) {
        const now = new Date().toISOString();
        patch((d) => ({ ...d, conversations: d.conversations.map((c) => (c.id === id ? { ...c, updatedAt: now } : c)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }));
      },
      async deleteAllData() {
        await client.deleteAllData();
      },
    };
  }, [client, patch]);

  const reduceMotion = ready?.data.settings.reduceMotion ?? false;
  React.useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
  }, [reduceMotion]);

  if (state.status === "error") return <>{errorFallback(state.message, () => setAttempt((n) => n + 1))}</>;
  // `actions` only reads the ref inside event handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  if (!ready || !actions) return <>{fallback}</>;

  const data = ready.data;
  const selectedChild = data.children.find((c) => c.id === data.settings.selectedChildProfileId) ?? null;
  const value: AppDataValue = {
    ...data,
    client: ready.client,
    config,
    selectedChild,
    aiContext: buildAiContext(selectedChild, data.settings, data.preferences),
    actions,
  };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
