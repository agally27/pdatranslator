import { NextResponse } from "next/server";
import type { z } from "zod";
import { AIError, AI_ERROR_MESSAGES } from "@/lib/ai/types";
import { publicConfig, serverConfig } from "@/lib/config";
import { errorName, logger } from "@/lib/logger";
import { rateLimitStore } from "@/lib/rate-limit";
import { getServerSupabase } from "@/lib/supabase/server";

export interface RequestUser {
  id: string;
  isDemo: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public headers: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(status: number, code: string, message: string, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/**
 * Identifies the caller.
 *  - Supabase configured → a valid session is required (401 otherwise).
 *  - Demo data mode      → a per-IP demo identity (there are no accounts to check).
 */
export async function requireUser(request: Request): Promise<RequestUser> {
  if (!publicConfig.supabaseConfigured) return { id: `demo:${clientIp(request)}`, isDemo: true };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "unauthorised", "Please sign in to continue.");
  return { id: data.user.id, isDemo: false };
}

/** Same-origin check for state-changing requests (CSRF defence in depth alongside SameSite cookies). */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients and same-origin GETs omit it
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, "forbidden", "Cross-site requests are not allowed.");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(403, "forbidden", "Cross-site requests are not allowed.");
  }
}

export function enforceRateLimit(user: RequestUser, bucket: string, limitPerMinute = serverConfig().rateLimitPerMinute) {
  const result = rateLimitStore.hit(`${bucket}:${user.id}`, limitPerMinute, 60_000);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw new ApiError(429, "rate_limited", "You’re going a little fast. Please wait a moment and try again.", { "Retry-After": String(retryAfter) });
  }
}

const MAX_JSON_BYTES = 64 * 1024;

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await request.text();
  if (raw.length > MAX_JSON_BYTES) throw new ApiError(413, "too_large", "That request is too large.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "The request could not be read.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiError(400, "invalid_request", first?.message && !first.message.startsWith("Invalid") ? first.message : "Some of the information sent was not valid.");
  }
  return parsed.data;
}

const AI_STATUS: Record<AIError["code"], number> = {
  not_configured: 503, timeout: 504, rate_limited: 503, auth: 502, refused: 422, invalid_response: 502, provider_error: 502,
};

/** Wraps a route handler with uniform error handling and privacy-safe logging. */
export function withApi(name: string, handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const started = Date.now();
    try {
      const response = await handler(request);
      logger.info("api.request", { route: name, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        logger.info("api.request", { route: name, status: err.status, code: err.code, durationMs: Date.now() - started });
        return jsonError(err.status, err.code, err.message, err.headers);
      }
      if (err instanceof AIError) {
        logger.warn("api.ai_error", { route: name, code: err.code, durationMs: Date.now() - started });
        return jsonError(AI_STATUS[err.code], `ai_${err.code}`, AI_ERROR_MESSAGES[err.code]);
      }
      logger.error("api.unhandled", { route: name, error: errorName(err), durationMs: Date.now() - started });
      return jsonError(500, "server_error", "Something went wrong on our side. Please try again.");
    }
  };
}
