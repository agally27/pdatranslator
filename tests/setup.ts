import { afterEach, beforeEach, vi } from "vitest";

// Every test starts with no external credentials configured (demo mode).
const KEYS = [
  "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_PROVIDER", "AI_MODEL", "AI_EFFORT", "OPENAI_TRANSCRIPTION_MODEL",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "KNOWLEDGE_RETRIEVAL", "RATE_LIMIT_PER_MINUTE",
];

beforeEach(() => {
  for (const key of KEYS) vi.stubEnv(key, "");
  vi.stubEnv("LOG_LEVEL", "error");
});

afterEach(() => {
  vi.unstubAllEnvs();
});
