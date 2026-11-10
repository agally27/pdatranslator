import type {
  ChildProfile,
  CommunicationPreference,
  Conversation,
  Message,
  SavedTranslation,
  TranslationFeedback,
  TranslationRecord,
  UserProfile,
  UserSettings,
} from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";
import { emptyChildProfile, sanitiseChildInput, type DataClient, type DataExport } from "./client";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
  removeItem(key: string) { this.map.delete(key); }
}

interface LocalState {
  profile: UserProfile;
  settings: UserSettings;
  children: ChildProfile[];
  preferences: CommunicationPreference[];
  translations: TranslationRecord[];
  feedback: TranslationFeedback[];
  saved: SavedTranslation[];
  conversations: Conversation[];
  messages: Message[];
  seeded: boolean;
}

export const LOCAL_KEY_PREFIX = "pda-companion:v1:";
const MAX_TRANSLATIONS = 300;

/**
 * Demo-mode data client. Everything is kept in this browser's storage, in a
 * separate namespace per user id, and nothing is sent to a server.
 */
export class LocalDataClient implements DataClient {
  readonly mode = "demo" as const;

  constructor(private userId: string, private storage: KeyValueStorage, private displayName = "") {}

  private get key() { return `${LOCAL_KEY_PREFIX}${this.userId}`; }

  private read(): LocalState {
    const raw = this.storage.getItem(this.key);
    if (raw) {
      try {
        return JSON.parse(raw) as LocalState;
      } catch {
        /* corrupted storage: start again */
      }
    }
    const now = nowIso();
    return {
      profile: { id: this.userId, displayName: this.displayName, createdAt: now },
      settings: {
        userId: this.userId, selectedChildProfileId: null, shareProfileWithAi: false,
        shareProfileConsentAt: null, saveHistory: true, reduceMotion: false, updatedAt: now,
      },
      children: [], preferences: [], translations: [], feedback: [], saved: [], conversations: [], messages: [],
      seeded: false,
    };
  }

  private write(state: LocalState) { this.storage.setItem(this.key, JSON.stringify(state)); }

  private mutate<T>(fn: (state: LocalState) => T): T {
    const state = this.read();
    const result = fn(state);
    this.write(state);
    return result;
  }

  isSeeded(): boolean { return this.read().seeded; }
  markSeeded(): void { this.mutate((s) => { s.seeded = true; }); }

  async getProfile() { return this.read().profile; }
  async updateProfile(patch: { displayName: string }) {
    return this.mutate((s) => (s.profile = { ...s.profile, displayName: patch.displayName.trim().slice(0, 80) }));
  }
  async getSettings() { return this.read().settings; }
  async updateSettings(patch: Partial<Omit<UserSettings, "userId" | "updatedAt">>) {
    return this.mutate((s) => (s.settings = { ...s.settings, ...patch, userId: this.userId, updatedAt: nowIso() }));
  }

  async listChildProfiles() { return this.read().children; }
  async createChildProfile(input: Parameters<DataClient["createChildProfile"]>[0]) {
    const now = nowIso();
    const child: ChildProfile = { ...emptyChildProfile(), ...sanitiseChildInput(input), id: uid(), userId: this.userId, createdAt: now, updatedAt: now };
    this.mutate((s) => {
      s.children.push(child);
      if (!s.settings.selectedChildProfileId) s.settings.selectedChildProfileId = child.id;
    });
    return child;
  }
  async updateChildProfile(id: string, patch: Parameters<DataClient["updateChildProfile"]>[1]) {
    return this.mutate((s) => {
      const index = s.children.findIndex((c) => c.id === id);
      if (index === -1) throw new Error("Profile not found.");
      s.children[index] = { ...s.children[index], ...sanitiseChildInput(patch), updatedAt: nowIso() };
      return s.children[index];
    });
  }
  async deleteChildProfile(id: string) {
    this.mutate((s) => {
      s.children = s.children.filter((c) => c.id !== id);
      s.preferences = s.preferences.filter((p) => p.childProfileId !== id);
      // History is kept, but unlinked from the deleted profile.
      for (const list of [s.translations, s.feedback, s.saved, s.conversations]) {
        for (const row of list) if (row.childProfileId === id) row.childProfileId = null;
      }
      if (s.settings.selectedChildProfileId === id) s.settings.selectedChildProfileId = s.children[0]?.id ?? null;
    });
  }

  async listPreferences() { return this.read().preferences; }
  async createPreference(input: Parameters<DataClient["createPreference"]>[0]) {
    const now = nowIso();
    const pref: CommunicationPreference = { ...input, statement: input.statement.trim().slice(0, 240), id: uid(), userId: this.userId, createdAt: now, updatedAt: now };
    this.mutate((s) => { s.preferences.push(pref); });
    return pref;
  }
  async updatePreference(id: string, patch: Parameters<DataClient["updatePreference"]>[1]) {
    return this.mutate((s) => {
      const index = s.preferences.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Preference not found.");
      s.preferences[index] = { ...s.preferences[index], ...patch, updatedAt: nowIso() };
      return s.preferences[index];
    });
  }
  async deletePreference(id: string) { this.mutate((s) => { s.preferences = s.preferences.filter((p) => p.id !== id); }); }

  async listTranslations() { return [...this.read().translations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async createTranslation(input: Parameters<DataClient["createTranslation"]>[0]) {
    const record: TranslationRecord = { ...input, id: uid(), userId: this.userId, isDemo: input.result.meta.isDemo, createdAt: nowIso() };
    this.mutate((s) => { s.translations = [record, ...s.translations].slice(0, MAX_TRANSLATIONS); });
    return record;
  }
  async updateTranslationResult(id: string, result: TranslationRecord["result"]) {
    this.mutate((s) => { const t = s.translations.find((x) => x.id === id); if (t) t.result = result; });
  }
  async deleteTranslation(id: string) {
    this.mutate((s) => {
      s.translations = s.translations.filter((t) => t.id !== id);
      s.feedback = s.feedback.filter((f) => f.translationId !== id);
      s.saved = s.saved.filter((x) => x.translationId !== id);
    });
  }
  async clearTranslations() { this.mutate((s) => { s.translations = []; s.feedback = []; s.saved = []; }); }

  async listFeedback() { return this.read().feedback; }
  async addFeedback(input: Parameters<DataClient["addFeedback"]>[0]) {
    const row: TranslationFeedback = { ...input, id: uid(), userId: this.userId, createdAt: nowIso() };
    this.mutate((s) => {
      // One feedback per alternative: the latest replaces any earlier one.
      s.feedback = s.feedback.filter((f) => !(f.translationId === input.translationId && f.alternativeId === input.alternativeId));
      s.feedback.push(row);
    });
    return row;
  }

  async listSaved() { return [...this.read().saved].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async saveAlternative(input: Parameters<DataClient["saveAlternative"]>[0]) {
    return this.mutate((s) => {
      const existing = s.saved.find((x) => x.translationId === input.translationId && x.alternativeId === input.alternativeId);
      if (existing) return existing;
      const row: SavedTranslation = { ...input, id: uid(), userId: this.userId, createdAt: nowIso() };
      s.saved.push(row);
      return row;
    });
  }
  async unsave(id: string) { this.mutate((s) => { s.saved = s.saved.filter((x) => x.id !== id); }); }

  async listConversations() { return [...this.read().conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async createConversation(input: { title: string; childProfileId: string | null }) {
    const now = nowIso();
    const row: Conversation = { id: uid(), userId: this.userId, title: input.title.trim().slice(0, 80) || "New conversation", childProfileId: input.childProfileId, createdAt: now, updatedAt: now };
    this.mutate((s) => { s.conversations.push(row); });
    return row;
  }
  async renameConversation(id: string, title: string) {
    this.mutate((s) => { const c = s.conversations.find((x) => x.id === id); if (c) { c.title = title.trim().slice(0, 80) || c.title; c.updatedAt = nowIso(); } });
  }
  async deleteConversation(id: string) {
    this.mutate((s) => { s.conversations = s.conversations.filter((c) => c.id !== id); s.messages = s.messages.filter((m) => m.conversationId !== id); });
  }
  async listMessages(conversationId: string) {
    return this.read().messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async addMessage(input: Parameters<DataClient["addMessage"]>[0]) {
    return this.mutate((s) => {
      const conversation = s.conversations.find((c) => c.id === input.conversationId);
      if (!conversation) throw new Error("Conversation not found.");
      const last = s.messages.filter((m) => m.conversationId === input.conversationId).pop();
      // Keep timestamps strictly increasing so ordering is stable.
      let createdAt = nowIso();
      if (last && last.createdAt >= createdAt) createdAt = new Date(new Date(last.createdAt).getTime() + 1).toISOString();
      const row: Message = { ...input, id: uid(), userId: this.userId, createdAt };
      s.messages.push(row);
      conversation.updatedAt = createdAt;
      return row;
    });
  }

  async exportAll(): Promise<DataExport> {
    const s = this.read();
    return {
      exportedAt: nowIso(), format: "pda-companion-export-v1", profile: s.profile, settings: s.settings,
      childProfiles: s.children, communicationPreferences: s.preferences, translations: s.translations,
      translationFeedback: s.feedback, savedTranslations: s.saved, conversations: s.conversations, messages: s.messages,
    };
  }
  async deleteAllData() { this.storage.removeItem(this.key); }
}
