import { serverConfig } from "@/lib/config";
import { withRetry } from "./json";
import { AnthropicProvider } from "./providers/anthropic";
import { MockProvider } from "./providers/mock";
import { OpenAIProvider } from "./providers/openai";
import type { AIProvider, GenerateObjectRequest } from "./types";

/** Wraps a live provider so a malformed response is retried once. */
class RetryingProvider implements AIProvider {
  constructor(private inner: AIProvider) {}
  get id() { return this.inner.id; }
  get model() { return this.inner.model; }
  get isLive() { return this.inner.isLive; }
  generateObject<T>(request: GenerateObjectRequest<T>): Promise<T> {
    return withRetry(() => this.inner.generateObject(request), 1);
  }
}

/**
 * Returns the configured AI provider. Features depend only on the `AIProvider`
 * interface, so switching provider or model is an environment change.
 */
export function getAIProvider(): AIProvider {
  const config = serverConfig();
  if (config.provider === "anthropic" && config.anthropicApiKey) {
    return new RetryingProvider(
      new AnthropicProvider({ apiKey: config.anthropicApiKey, model: config.model, effort: config.effort, timeoutMs: config.timeoutMs }),
    );
  }
  if (config.provider === "openai" && config.openaiApiKey) {
    return new RetryingProvider(new OpenAIProvider({ apiKey: config.openaiApiKey, model: config.model, timeoutMs: config.timeoutMs }));
  }
  return new MockProvider();
}

export * from "./types";
