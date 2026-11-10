import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extractJson, parseWithSchema } from "../json";
import { AIError, type AIProvider, type GenerateObjectRequest } from "../types";
import { logUsage } from "../usage";

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
  timeoutMs: number;
  /** Injectable for tests. */
  client?: Anthropic;
}

/**
 * Anthropic Claude adapter.
 * - Structured outputs (`output_config.format`) constrain the response to the task schema.
 * - Thinking is left at the model default (adaptive); depth is steered with `effort`.
 * - Server-side refusal fallbacks are enabled so a declined request is retried on a
 *   fallback model inside the same call.
 * - The SDK retries 408/409/429/5xx and connection errors itself (maxRetries).
 */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;
  readonly isLive = true;
  readonly model: string;
  private client: Anthropic;
  private effort: AnthropicProviderOptions["effort"];

  constructor(options: AnthropicProviderOptions) {
    this.model = options.model;
    this.effort = options.effort;
    this.client = options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs, maxRetries: 2 });
  }

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    const started = Date.now();
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 8000,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: this.effort, format: zodOutputFormat(request.schema) },
      });

      if (response.stop_reason === "refusal") {
        throw new AIError("refused", "The model declined this request.");
      }
      if (response.stop_reason === "max_tokens") {
        throw new AIError("invalid_response", "The model response was cut off.", true);
      }
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      const value = parseWithSchema(request.schema, extractJson(text));
      logUsage({
        provider: this.id, model: response.model, task: request.task, ok: true,
        durationMs: Date.now() - started,
        inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
      });
      return value;
    } catch (err) {
      const mapped = mapAnthropicError(err);
      logUsage({ provider: this.id, model: this.model, task: request.task, ok: false, durationMs: Date.now() - started, errorCode: mapped.code });
      throw mapped;
    }
  }
}

export function mapAnthropicError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AIError("timeout", "The AI request timed out.", true);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AIError("auth", "The Anthropic API key was rejected.");
  }
  if (err instanceof Anthropic.RateLimitError) return new AIError("rate_limited", "The AI provider rate limit was reached.", true);
  if (err instanceof Anthropic.APIConnectionError) return new AIError("provider_error", "Could not reach the AI provider.", true);
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : 0;
    return new AIError("provider_error", `The AI provider returned an error (${status || "unknown"}).`, status >= 500);
  }
  return new AIError("provider_error", "Unexpected error calling the AI provider.");
}
