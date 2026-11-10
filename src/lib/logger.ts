import { serverConfig } from "@/lib/config";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured JSON logger (one line per event; Vercel-friendly).
 * PRIVACY: never pass user text, transcripts, child profile data or AI output
 * to the logger. Log identifiers, counts, durations and error names only.
 */
function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  let min: Level = "info";
  try {
    min = serverConfig().logLevel;
  } catch {
    /* default */
  }
  if (ORDER[level] < ORDER[min]) return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}
