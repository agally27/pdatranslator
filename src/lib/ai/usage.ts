import { logger } from "@/lib/logger";

/**
 * Usage logging: provider, model, task, token counts and duration only.
 * No prompt or response content is ever logged.
 */
export function logUsage(fields: {
  provider: string;
  model: string;
  task: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  ok: boolean;
  errorCode?: string;
}) {
  logger.info("ai.usage", fields);
}
