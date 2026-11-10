/** Shared domain types used by the UI, the data layer and the AI services. */

export const STYLE_IDS = [
  "descriptive",
  "collaborative",
  "autonomy",
  "playful",
  "reassuring",
  "minimal",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_META: Record<StyleId, { label: string; tagline: string; description: string }> = {
  descriptive: {
    label: "Descriptive",
    tagline: "Shares information",
    description: "Shares information or an observation without telling the child what to do.",
  },
  collaborative: {
    label: "Collaborative",
    tagline: "Works it out together",
    description: "Invites partnership and shared problem-solving, so nobody is in charge of anybody.",
  },
  autonomy: {
    label: "Autonomy-supporting",
    tagline: "Offers real choice",
    description: "Hands over genuine choice and control wherever that is realistically possible.",
  },
  playful: {
    label: "Playful",
    tagline: "Uses humour and imagination",
    description: "Uses humour, imagination and interests to take the weight out of the moment.",
  },
  reassuring: {
    label: "Reassuring",
    tagline: "Reduces uncertainty",
    description: "Lowers uncertainty by making things predictable and showing you are alongside.",
  },
  minimal: {
    label: "Minimal language",
    tagline: "Fewest words",
    description: "Uses very few words to reduce verbal processing demands.",
  },
};

export const DEMAND_TYPES = [
  "direct_instruction",
  "indirect_instruction",
  "implied_expectation",
  "time_pressure",
  "question_as_instruction",
  "conditional_language",
  "loss_of_control",
  "transition",
  "social_expectation",
  "repeated_request",
  "hidden_demand",
  "uncertainty",
  "lack_of_autonomy",
] as const;
export type DemandType = (typeof DEMAND_TYPES)[number];

export const DEMAND_LABELS: Record<DemandType, string> = {
  direct_instruction: "Direct instruction",
  indirect_instruction: "Indirect instruction",
  implied_expectation: "Implied expectation",
  time_pressure: "Time pressure",
  question_as_instruction: "Question that works as an instruction",
  conditional_language: "Conditional language",
  loss_of_control: "Loss of control",
  transition: "Transition",
  social_expectation: "Social expectation",
  repeated_request: "Repeated request",
  hidden_demand: "Hidden demand",
  uncertainty: "Uncertainty",
  lack_of_autonomy: "Lack of autonomy",
};

export type DemandLevel = "low" | "moderate" | "high";

export const FEEDBACK_TYPES = [
  "worked",
  "didnt_work",
  "still_demanding",
  "too_complicated",
  "not_appropriate",
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_LABELS: Record<FeedbackType, string> = {
  worked: "This worked",
  didnt_work: "This didn’t work",
  still_demanding: "Still feels demanding",
  too_complicated: "Too complicated",
  not_appropriate: "Not appropriate for my child",
};

export const REFINE_ACTIONS = [
  "shorter",
  "more_natural",
  "more_playful",
  "less_demanding",
  "remove_questions",
  "explain",
  "another",
] as const;
export type RefineAction = (typeof REFINE_ACTIONS)[number];

export const REFINE_LABELS: Record<RefineAction, string> = {
  shorter: "Make it shorter",
  more_natural: "Make it more natural",
  more_playful: "Make it more playful",
  less_demanding: "Make it less demanding",
  remove_questions: "Remove questions",
  explain: "Explain why",
  another: "Generate another alternative",
};

export type InputMethod = "text" | "voice" | "situation";

export interface ChildProfile {
  id: string;
  userId: string;
  preferredName: string;
  ageRange: string;
  communicationPreferences: string;
  preferredCommunicationStyle: string;
  sensorySensitivities: string;
  interests: string;
  anxietyTriggers: string;
  transitionDifficulties: string;
  responsesToQuestions: string;
  responsesToChoices: string;
  effectiveStrategies: string;
  approachesThatDontWork: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ChildProfileInput = Partial<
  Omit<ChildProfile, "id" | "userId" | "createdAt" | "updatedAt">
>;

export const CHILD_PROFILE_FIELDS: {
  key: keyof ChildProfileInput;
  label: string;
  hint: string;
  multiline?: boolean;
}[] = [
  { key: "preferredName", label: "Preferred name", hint: "A first name or nickname is plenty." },
  { key: "ageRange", label: "Age or age range", hint: "For example “7” or “5–7”." },
  { key: "communicationPreferences", label: "Communication preferences", hint: "How they like to be spoken with.", multiline: true },
  { key: "preferredCommunicationStyle", label: "Preferred communication style", hint: "For example indirect, visual, written, humour." },
  { key: "sensorySensitivities", label: "Sensory sensitivities", hint: "Sounds, textures, light, touch…", multiline: true },
  { key: "interests", label: "Interests", hint: "Separate with commas – these help with playful ideas." },
  { key: "anxietyTriggers", label: "Anxiety triggers", hint: "Things that tend to raise anxiety.", multiline: true },
  { key: "transitionDifficulties", label: "Transition difficulties", hint: "Changes or switches that are hard.", multiline: true },
  { key: "responsesToQuestions", label: "Responses to questions", hint: "How direct questions tend to land.", multiline: true },
  { key: "responsesToChoices", label: "Responses to choices", hint: "Whether choices help or add pressure.", multiline: true },
  { key: "effectiveStrategies", label: "Effective strategies", hint: "What tends to help.", multiline: true },
  { key: "approachesThatDontWork", label: "Approaches that do not work", hint: "What tends to make things harder.", multiline: true },
  { key: "notes", label: "Additional notes", hint: "Anything else you would like kept in mind.", multiline: true },
];

/** Machine-readable preference keys the personalisation engine understands. */
export const PREFERENCE_KEYS = [
  "prefers_descriptive",
  "fewer_questions",
  "humour_helps",
  "choices_pressure",
  "time_anxiety",
  "short_explanations",
  "prefers_minimal",
  "prefers_collaborative",
  "reassurance_helps",
  "custom",
] as const;
export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export const PREFERENCE_STATEMENTS: Record<Exclude<PreferenceKey, "custom">, string> = {
  prefers_descriptive: "Prefers descriptive language.",
  fewer_questions: "Responds better to fewer questions.",
  humour_helps: "Humour can be helpful.",
  choices_pressure: "Choices can sometimes increase pressure.",
  time_anxiety: "Time references can create anxiety.",
  short_explanations: "Longer explanations can be overwhelming.",
  prefers_minimal: "Fewer words tend to work better.",
  prefers_collaborative: "Working things out together tends to help.",
  reassurance_helps: "Predictability and reassurance tend to help.",
};

/**
 * confirmed   – stated or confirmed by the parent. The only category used by the AI.
 * observation – a repeated pattern in the parent's own feedback, awaiting confirmation.
 * suggestion  – a tentative AI-generated idea, awaiting confirmation.
 */
export type PreferenceCategory = "confirmed" | "observation" | "suggestion";

export interface CommunicationPreference {
  id: string;
  userId: string;
  childProfileId: string | null;
  key: PreferenceKey;
  statement: string;
  category: PreferenceCategory;
  source: "parent" | "feedback" | "ai";
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DemandTrigger {
  type: DemandType;
  phrase: string;
  explanation: string;
}

export interface ValidationChecks {
  intentPreserved: boolean;
  pressureReduced: boolean;
  noDirectDemand: boolean;
  natural: boolean;
  noFalseChoice: boolean;
  noUnrealisticPromise: boolean;
  respectsAutonomy: boolean;
  fitsProfile: boolean;
  appropriate: boolean;
  safetyPreserved: boolean;
}

export interface AlternativeValidation {
  passed: boolean;
  checks: ValidationChecks;
  issues: string[];
}

export interface TranslationAlternative {
  id: string;
  style: StyleId;
  text: string;
  explanation: string;
  validation: AlternativeValidation;
  /** How many generation attempts this alternative needed (1 = first time). */
  attempts: number;
  /** Set when the card was added or changed by a refine control. */
  refinedBy?: RefineAction;
}

export interface TranslationResult {
  original: string;
  situation: string;
  intent: {
    summary: string;
    practicalObjective: string;
    topic: string;
    involvesSafety: boolean;
    safetyNote: string;
  };
  demandAnalysis: {
    level: DemandLevel;
    reasoning: string;
    triggers: DemandTrigger[];
  };
  alternatives: TranslationAlternative[];
  overallExplanation: string;
  personalisationApplied: string[];
  meta: {
    provider: string;
    model: string;
    /** True when produced by the built-in rule-based demo engine, not a live AI model. */
    isDemo: boolean;
    generatedAt: string;
    durationMs: number;
    profileUsed: boolean;
  };
}

export interface TranslationRecord {
  id: string;
  userId: string;
  childProfileId: string | null;
  original: string;
  situation: string;
  inputMethod: InputMethod;
  result: TranslationResult;
  isDemo: boolean;
  createdAt: string;
}

export interface TranslationFeedback {
  id: string;
  userId: string;
  translationId: string;
  childProfileId: string | null;
  alternativeId: string;
  style: StyleId;
  feedback: FeedbackType;
  createdAt: string;
}

export interface SavedTranslation {
  id: string;
  userId: string;
  translationId: string;
  childProfileId: string | null;
  alternativeId: string;
  style: StyleId;
  text: string;
  original: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  childProfileId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSource {
  slug: string;
  title: string;
}

export interface Message {
  id: string;
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources: MessageSource[];
  isDemo: boolean;
  safetyFlag: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  selectedChildProfileId: string | null;
  /** Explicit opt-in before any child profile detail is included in AI requests. */
  shareProfileWithAi: boolean;
  shareProfileConsentAt: string | null;
  saveHistory: boolean;
  reduceMotion: boolean;
  updatedAt: string;
}

/**
 * The pseudonymised slice of a child profile that may be sent to the AI layer.
 * The preferred name is deliberately excluded.
 */
export interface ChildContext {
  ageRange: string;
  communicationPreferences: string;
  preferredCommunicationStyle: string;
  sensorySensitivities: string;
  interests: string;
  anxietyTriggers: string;
  transitionDifficulties: string;
  responsesToQuestions: string;
  responsesToChoices: string;
  effectiveStrategies: string;
  approachesThatDontWork: string;
  notes: string;
}

export interface ConfirmedPreference {
  key: PreferenceKey;
  statement: string;
}
