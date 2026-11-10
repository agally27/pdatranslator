import { z } from "zod";
import { extractJson, parseWithSchema, withTimeout } from "../json";
import { AIError, type AIProvider, type GenerateObjectRequest } from "../types";
import { logUsage } from "../usage";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  baseUrl?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * OpenAI adapter using the Chat Completions REST API with JSON-schema
 * structured outputs. Implemented with fetch to avoid an extra dependency.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly isLive = true;
  readonly model: string;
  private options: OpenAIProviderOptions;

  constructor(options: OpenAIProviderOptions) {
    this.options = options;
    this.model = options.model;
  }

  async generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    const started = Date.now();
    const doFetch = this.options.fetchImpl ?? fetch;
    try {
      const body = {
        model: this.model,
        max_completion_tokens: request.maxTokens ?? 8000,
        messages: [
          { role: "system", content: `${request.system}\n\nRespond only with JSON that matches the provided schema.` },
          { role: "user", content: request.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: request.schemaName, strict: true, schema: z.toJSONSchema(request.schema) },
        },
      };
      const response = await withTimeout(
        (signal) =>
          doFetch(`${this.options.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`, {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.options.apiKey}` },
            body: JSON.stringify(body),
          }),
        this.options.timeoutMs,
      );
      if (!response.ok) throw mapOpenAIStatus(response.status);

      const data = (await response.json()) as {
        model?: string;
        choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = data.choices?.[0];
      if (choice?.message?.refusal) throw new AIError("refused", "The model declined this request.");
      if (choice?.finish_reason === "length") throw new AIError("invalid_response", "The model response was cut off.", true);
      const content = choice?.message?.content;
      if (!content) throw new AIError("invalid_response", "The AI response was empty.", true);

      const value = parseWithSchema(request.schema, extractJson(content));
      logUsage({
        provider: this.id, model: data.model ?? this.model, task: request.task, ok: true,
        durationMs: Date.now() - started,
        inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens,
      });
      return value;
    } catch (err) {
      const mapped = err instanceof AIError ? err : new AIError("provider_error", "Could not reach the AI provider.", true);
      logUsage({ provider: this.id, model: this.model, task: request.task, ok: false, durationMs: Date.now() - started, errorCode: mapped.code });
      throw mapped;
    }
  }
}

export function mapOpenAIStatus(status: number): AIError {
  if (status === 401 || status === 403) return new AIError("auth", "The OpenAI API key was rejected.");
  if (status === 429) return new AIError("rate_limited", "The AI provider rate limit was reached.", true);
  if (status === 408) return new AIError("timeout", "The AI request timed out.", true);
  return new AIError("provider_error", `The AI provider returned an error (${status}).`, status >= 500);
}
