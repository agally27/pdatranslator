import type {
  ChildProfile,
  ChildProfileInput,
  CommunicationPreference,
  Conversation,
  InputMethod,
  Message,
  SavedTranslation,
  TranslationFeedback,
  TranslationRecord,
  TranslationResult,
  UserProfile,
  UserSettings,
} from "@/lib/types";

export type NewPreference = Pick<CommunicationPreference, "childProfileId" | "key" | "statement" | "category" | "source" | "evidenceCount">;
export type NewTranslation = { childProfileId: string | null; original: string; situation: string; inputMethod: InputMethod; result: TranslationResult };
export type NewFeedback = Pick<TranslationFeedback, "translationId" | "childProfileId" | "alternativeId" | "style" | "feedback">;
export type NewSaved = Pick<SavedTranslation, "translationId" | "childProfileId" | "alternativeId" | "style" | "text" | "original">;
export type NewMessage = Pick<Message, "conversationId" | "role" | "content" | "sources" | "isDemo" | "safetyFlag">;

export interface DataExport {
  exportedAt: string;
  format: "pda-companion-export-v1";
  profile: UserProfile;
  settings: UserSettings;
  childProfiles: ChildProfile[];
  communicationPreferences: CommunicationPreference[];
  translations: TranslationRecord[];
  translationFeedback: TranslationFeedback[];
  savedTranslations: SavedTranslation[];
  conversations: Conversation[];
  messages: Message[];
}

/**
 * The single data-access contract used by the whole UI.
 * Two implementations: LocalDataClient (demo mode, browser storage) and
 * SupabaseDataClient (Postgres + Row Level Security).
 * Every method only ever sees the signed-in user's own data.
 */
export interface DataClient {
  readonly mode: "demo" | "supabase";
  getProfile(): Promise<UserProfile>;
  updateProfile(patch: { displayName: string }): Promise<UserProfile>;
  getSettings(): Promise<UserSettings>;
  updateSettings(patch: Partial<Omit<UserSettings, "userId" | "updatedAt">>): Promise<UserSettings>;

  listChildProfiles(): Promise<ChildProfile[]>;
  createChildProfile(input: ChildProfileInput): Promise<ChildProfile>;
  updateChildProfile(id: string, patch: ChildProfileInput): Promise<ChildProfile>;
  deleteChildProfile(id: string): Promise<void>;

  listPreferences(): Promise<CommunicationPreference[]>;
  createPreference(input: NewPreference): Promise<CommunicationPreference>;
  updatePreference(id: string, patch: Partial<Pick<CommunicationPreference, "statement" | "category" | "source" | "evidenceCount">>): Promise<CommunicationPreference>;
  deletePreference(id: string): Promise<void>;

  listTranslations(): Promise<TranslationRecord[]>;
  createTranslation(input: NewTranslation): Promise<TranslationRecord>;
  updateTranslationResult(id: string, result: TranslationResult): Promise<void>;
  deleteTranslation(id: string): Promise<void>;
  clearTranslations(): Promise<void>;

  listFeedback(): Promise<TranslationFeedback[]>;
  addFeedback(input: NewFeedback): Promise<TranslationFeedback>;

  listSaved(): Promise<SavedTranslation[]>;
  saveAlternative(input: NewSaved): Promise<SavedTranslation>;
  unsave(id: string): Promise<void>;

  listConversations(): Promise<Conversation[]>;
  createConversation(input: { title: string; childProfileId: string | null }): Promise<Conversation>;
  renameConversation(id: string, title: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  listMessages(conversationId: string): Promise<Message[]>;
  addMessage(input: NewMessage): Promise<Message>;

  exportAll(): Promise<DataExport>;
  /** Removes every row belonging to the user (but not the auth account itself). */
  deleteAllData(): Promise<void>;
}

export function emptyChildProfile(): Required<ChildProfileInput> {
  return {
    preferredName: "", ageRange: "", communicationPreferences: "", preferredCommunicationStyle: "",
    sensorySensitivities: "", interests: "", anxietyTriggers: "", transitionDifficulties: "",
    responsesToQuestions: "", responsesToChoices: "", effectiveStrategies: "", approachesThatDontWork: "", notes: "",
  };
}

const LIMITS: Record<keyof ChildProfileInput, number> = {
  preferredName: 60, ageRange: 40, communicationPreferences: 600, preferredCommunicationStyle: 300,
  sensorySensitivities: 600, interests: 300, anxietyTriggers: 600, transitionDifficulties: 600,
  responsesToQuestions: 600, responsesToChoices: 600, effectiveStrategies: 600, approachesThatDontWork: 600, notes: 800,
};

/** Trims and length-limits profile input; unknown keys are dropped. */
export function sanitiseChildInput(input: ChildProfileInput): ChildProfileInput {
  const clean: ChildProfileInput = {};
  for (const key of Object.keys(LIMITS) as (keyof ChildProfileInput)[]) {
    const value = input[key];
    if (typeof value === "string") clean[key] = value.trim().slice(0, LIMITS[key]);
  }
  return clean;
}
