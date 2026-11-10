/**
 * Central, typed access to environment configuration.
 * Server-only values are read lazily so this module is safe to import anywhere,
 * but only NEXT_PUBLIC_* values are ever available in the browser bundle.
 */

export type AIProviderId = "anthropic" | "openai" | "mock";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

// NEXT_PUBLIC_* must be referenced statically for Next.js to inline them.
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;

export const publicConfig = {
  supabaseUrl: PUBLIC_SUPABASE_URL,
  supabaseAnonKey: PUBLIC_SUPABASE_ANON_KEY,
  /** True when Supabase Auth + Postgres are configured. Otherwise demo data mode. */
  get supabaseConfigured(): boolean {
    return Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);
  },
};

export const DEFAULT_MODELS: Record<Exclude<AIProviderId, "mock">, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-4o",
};

export function resolveProviderId(): AIProviderId {
  const requested = env("AI_PROVIDER")?.toLowerCase();
  const hasAnthropic = Boolean(env("ANTHROPIC_API_KEY"));
  const hasOpenAI = Boolean(env("OPENAI_API_KEY"));
  if (requested === "mock") return "mock";
  if (requested === "anthropic") return hasAnthropic ? "anthropic" : "mock";
  if (requested === "openai") return hasOpenAI ? "openai" : "mock";
  if (hasAnthropic) return "anthropic";
  if (hasOpenAI) return "openai";
  return "mock";
}

export function serverConfig() {
  const provider = resolveProviderId();
  const requested = env("AI_PROVIDER")?.toLowerCase();
  return {
    provider,
    /** Set when AI_PROVIDER names a live provider whose key is missing. */
    providerMisconfigured:
      (requested === "anthropic" || requested === "openai") && provider === "mock" ? requested : undefined,
    model: provider === "mock" ? "demo-rules-v1" : env("AI_MODEL") ?? DEFAULT_MODELS[provider],
    effort: (env("AI_EFFORT") ?? "medium") as "low" | "medium" | "high",
    timeoutMs: Number(env("AI_TIMEOUT_MS") ?? 45000),
    anthropicApiKey: env("ANTHROPIC_API_KEY"),
    openaiApiKey: env("OPENAI_API_KEY"),
    transcriptionModel: env("OPENAI_TRANSCRIPTION_MODEL") ?? "gpt-4o-mini-transcribe",
    embeddingModel: env("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    knowledgeRetrieval: (env("KNOWLEDGE_RETRIEVAL") ?? "keyword") as "keyword" | "vector",
    supabaseServiceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
    rateLimitPerMinute: Number(env("RATE_LIMIT_PER_MINUTE") ?? 20),
    logLevel: (env("LOG_LEVEL") ?? "info") as "debug" | "info" | "warn" | "error",
  };
}

/** Non-secret status summary, safe to return to the browser. */
export function configStatus() {
  const c = serverConfig();
  return {
    dataMode: publicConfig.supabaseConfigured ? ("supabase" as const) : ("demo" as const),
    ai: {
      provider: c.provider,
      model: c.model,
      live: c.provider !== "mock",
      misconfigured: c.providerMisconfigured ?? null,
    },
    transcription: {
      live: Boolean(c.openaiApiKey),
      model: c.openaiApiKey ? c.transcriptionModel : "demo",
    },
    knowledgeRetrieval: c.knowledgeRetrieval,
    accountDeletion: publicConfig.supabaseConfigured ? Boolean(c.supabaseServiceRoleKey) : true,
  };
}

export type ConfigStatus = ReturnType<typeof configStatus>;
