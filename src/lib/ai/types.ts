import type { z } from "zod";
import type { AIProviderId } from "@/lib/config";

/**
 * Every AI call in the application is one named task. Live providers answer it
 * from the prompt; the mock provider answers it from the structured `input`
 * using the built-in rule-based demo engine.
 */
export type AITask = "intent" | "demands" | "generate" | "validate" | "refine" | "specialist";

export interface GenerateObjectRequest<T> {
  task: AITask;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  /** Structured task input – used by the mock provider, ignored by live providers. */
  input: unknown;
  maxTokens?: number;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly model: string;
  /** False for the rule-based demo provider. */
  readonly isLive: boolean;
  generateObject<T>(request: GenerateObjectRequest<T>): Promise<T>;
}

export type AIErrorCode =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "auth"
  | "refused"
  | "invalid_response"
  | "provider_error";

export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public retryable = false,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/** Friendly, non-technical messages for each failure mode. */
export const AI_ERROR_MESSAGES: Record<AIErrorCode, string> = {
  not_configured: "The AI service has not been configured yet. Demo responses are available in the meantime.",
  timeout: "That took longer than expected. Please try again in a moment.",
  rate_limited: "The AI service is busy right now. Please wait a little and try again.",
  auth: "The AI service rejected its credentials. The site owner needs to check the API key.",
  refused: "The AI service was unable to respond to that request. Try rephrasing it.",
  invalid_response: "The AI service returned something unexpected. Please try again.",
  provider_error: "Something went wrong reaching the AI service. Please try again shortly.",
};
