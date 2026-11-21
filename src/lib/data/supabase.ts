import type { SupabaseClient } from "@supabase/supabase-js";
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

type Row = Record<string, unknown>;

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Maps top-level keys only; JSON columns (result, sources) are stored as-is. */
export function toRow(value: object): Row {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [toSnake(k), v]));
}
export function fromRow<T>(row: Row): T {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v])) as T;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/**
 * Supabase-backed data client. Runs in the browser with the anon key and the
 * user's session; Row Level Security (supabase/migrations) guarantees that a
 * user can only read and write their own rows. `user_id` is also set explicitly
 * on every insert and filter as defence in depth.
 */
export class SupabaseDataClient implements DataClient {
  readonly mode = "supabase" as const;

  constructor(private db: SupabaseClient, private userId: string) {}

  private async list<T>(table: string, order = "created_at", ascending = false, limit = 500): Promise<T[]> {
    const rows = unwrap(await this.db.from(table).select("*").eq("user_id", this.userId).order(order, { ascending }).limit(limit)) as Row[];
    return rows.map((r) => fromRow<T>(r));
  }
  private async insert<T>(table: string, value: object): Promise<T> {
    return fromRow<T>(unwrap(await this.db.from(table).insert(toRow(value)).select().single()) as Row);
  }
  private async update<T>(table: string, id: string, patch: object): Promise<T> {
    return fromRow<T>(unwrap(await this.db.from(table).update(toRow(patch)).eq("id", id).eq("user_id", this.userId).select().single()) as Row);
  }
  private async remove(table: string, id: string): Promise<void> {
    unwrap(await this.db.from(table).delete().eq("id", id).eq("user_id", this.userId));
  }

  async getProfile(): Promise<UserProfile> {
    const row = unwrap(await this.db.from("profiles").select("*").eq("id", this.userId).maybeSingle()) as Row | null;
    if (row) return fromRow<UserProfile>(row);
    return fromRow<UserProfile>(unwrap(await this.db.from("profiles").upsert({ id: this.userId, display_name: "" }).select().single()) as Row);
  }
  async updateProfile(patch: { displayName: string }) {
    return fromRow<UserProfile>(
      unwrap(await this.db.from("profiles").upsert({ id: this.userId, display_name: patch.displayName.trim().slice(0, 80), updated_at: nowIso() }).select().single()) as Row,
    );
  }
  async getSettings(): Promise<UserSettings> {
    const row = unwrap(await this.db.from("user_settings").select("*").eq("user_id", this.userId).maybeSingle()) as Row | null;
    if (row) return fromRow<UserSettings>(row);
    return fromRow<UserSettings>(unwrap(await this.db.from("user_settings").upsert({ user_id: this.userId }).select().single()) as Row);
  }
  async updateSettings(patch: Partial<Omit<UserSettings, "userId" | "updatedAt">>) {
    return fromRow<UserSettings>(
      unwrap(await this.db.from("user_settings").upsert({ ...toRow(patch), user_id: this.userId, updated_at: nowIso() }).select().single()) as Row,
    );
  }

  listChildProfiles() { return this.list<ChildProfile>("child_profiles", "created_at", true); }
  async createChildProfile(input: Parameters<DataClient["createChildProfile"]>[0]) {
    const child = await this.insert<ChildProfile>("child_profiles", { ...emptyChildProfile(), ...sanitiseChildInput(input), id: uid(), userId: this.userId });
    const settings = await this.getSettings();
    if (!settings.selectedChildProfileId) await this.updateSettings({ selectedChildProfileId: child.id });
    return child;
  }
  updateChildProfile(id: string, patch: Parameters<DataClient["updateChildProfile"]>[1]) {
    return this.update<ChildProfile>("child_profiles", id, { ...sanitiseChildInput(patch), updatedAt: nowIso() });
  }
  // Foreign keys handle the rest: preferences cascade; history rows are set to null.
  deleteChildProfile(id: string) { return this.remove("child_profiles", id); }

  listPreferences() { return this.list<CommunicationPreference>("communication_preferences", "created_at", true); }
  createPreference(input: Parameters<DataClient["createPreference"]>[0]) {
    return this.insert<CommunicationPreference>("communication_preferences", { ...input, statement: input.statement.trim().slice(0, 240), id: uid(), userId: this.userId });
  }
  updatePreference(id: string, patch: Parameters<DataClient["updatePreference"]>[1]) {
    return this.update<CommunicationPreference>("communication_preferences", id, { ...patch, updatedAt: nowIso() });
  }
  deletePreference(id: string) { return this.remove("communication_preferences", id); }

  listTranslations() { return this.list<TranslationRecord>("translations", "created_at", false, 300); }
  createTranslation(input: Parameters<DataClient["createTranslation"]>[0]) {
    return this.insert<TranslationRecord>("translations", { ...input, id: uid(), userId: this.userId, isDemo: input.result.meta.isDemo });
  }
  async updateTranslationResult(id: string, result: TranslationRecord["result"]) {
    unwrap(await this.db.from("translations").update({ result }).eq("id", id).eq("user_id", this.userId));
  }
  deleteTranslation(id: string) { return this.remove("translations", id); }
  async clearTranslations() { unwrap(await this.db.from("translations").delete().eq("user_id", this.userId)); }

  listFeedback() { return this.list<TranslationFeedback>("translation_feedback", "created_at", true, 2000); }
  async addFeedback(input: Parameters<DataClient["addFeedback"]>[0]) {
    return fromRow<TranslationFeedback>(
      unwrap(
        await this.db.from("translation_feedback")
          .upsert(toRow({ ...input, id: uid(), userId: this.userId, createdAt: nowIso() }), { onConflict: "translation_id,alternative_id" })
          .select().single(),
      ) as Row,
    );
  }

  listSaved() { return this.list<SavedTranslation>("saved_translations"); }
  async saveAlternative(input: Parameters<DataClient["saveAlternative"]>[0]) {
    return fromRow<SavedTranslation>(
      unwrap(
        await this.db.from("saved_translations")
          .upsert(toRow({ ...input, id: uid(), userId: this.userId }), { onConflict: "translation_id,alternative_id", ignoreDuplicates: false })
          .select().single(),
      ) as Row,
    );
  }
  unsave(id: string) { return this.remove("saved_translations", id); }

  listConversations() { return this.list<Conversation>("conversations", "updated_at", false, 200); }
  createConversation(input: { title: string; childProfileId: string | null }) {
    return this.insert<Conversation>("conversations", { id: uid(), userId: this.userId, title: input.title.trim().slice(0, 80) || "New conversation", childProfileId: input.childProfileId });
  }
  async renameConversation(id: string, title: string) {
    await this.update<Conversation>("conversations", id, { title: title.trim().slice(0, 80) || "Conversation", updatedAt: nowIso() });
  }
  deleteConversation(id: string) { return this.remove("conversations", id); }
  async listMessages(conversationId: string) {
    const rows = unwrap(
      await this.db.from("messages").select("*").eq("user_id", this.userId).eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(500),
    ) as Row[];
    return rows.map((r) => fromRow<Message>(r));
  }
  async addMessage(input: Parameters<DataClient["addMessage"]>[0]) {
    const message = await this.insert<Message>("messages", { ...input, id: uid(), userId: this.userId });
    await this.db.from("conversations").update({ updated_at: nowIso() }).eq("id", input.conversationId).eq("user_id", this.userId);
    return message;
  }

  async exportAll(): Promise<DataExport> {
    const [profile, settings, childProfiles, communicationPreferences, translations, translationFeedback, savedTranslations, conversations, messages] =
      await Promise.all([
        this.getProfile(), this.getSettings(), this.listChildProfiles(), this.listPreferences(),
        this.list<TranslationRecord>("translations", "created_at", false, 5000), this.listFeedback(), this.listSaved(),
        this.list<Conversation>("conversations", "created_at", false, 5000), this.list<Message>("messages", "created_at", true, 20000),
      ]);
    return { exportedAt: nowIso(), format: "pda-companion-export-v1", profile, settings, childProfiles, communicationPreferences, translations, translationFeedback, savedTranslations, conversations, messages };
  }

  async deleteAllData() {
    // Order respects foreign keys; RLS restricts every statement to the user's own rows.
    for (const table of ["messages", "conversations", "saved_translations", "translation_feedback", "translations", "communication_preferences", "child_profiles"]) {
      unwrap(await this.db.from(table).delete().eq("user_id", this.userId));
    }
    unwrap(await this.db.from("user_settings").delete().eq("user_id", this.userId));
    unwrap(await this.db.from("profiles").delete().eq("id", this.userId));
  }
}
