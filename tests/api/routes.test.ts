import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRateLimitStore } from "@/lib/rate-limit";

const getUser = vi.fn();
const deleteUser = vi.fn();
let serviceClient: unknown = null;
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({ auth: { getUser } }),
  getServiceSupabase: () => serviceClient,
}));

const BASE = "http://localhost:3000";
let ip = 0;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", origin: BASE, "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function load<T>(path: string): Promise<T> {
  vi.resetModules();
  return (await import(path)) as T;
}
type Route = { POST: (r: Request) => Promise<Response>; GET: (r: Request) => Promise<Response> };

beforeEach(() => {
  getUser.mockReset();
  deleteUser.mockReset();
  serviceClient = null;
  (globalThis as { __pdaRateLimit?: unknown }).__pdaRateLimit = undefined;
});

describe("POST /api/translate", () => {
  it("returns six alternatives in demo mode with no credentials", async () => {
    const { POST } = await load<Route>("@/app/api/translate/route");
    const response = await POST(post("/api/translate", { text: "Put your shoes on now." }));
    expect(response.status).toBe(200);
    const { result } = await response.json();
    expect(result.alternatives).toHaveLength(6);
    expect(result.meta).toMatchObject({ isDemo: true, provider: "mock" });
  });

  it.each([
    ["empty text", { text: "" }, "Please enter something to translate."],
    ["over-long text", { text: "x".repeat(1001) }, "Please keep it under 1,000 characters."],
    ["wrong type", { text: 42 }, "Some of the information sent was not valid."],
    ["malformed JSON", "{oops", "The request could not be read."],
  ])("rejects %s with a friendly 400", async (_name, body, message) => {
    const { POST } = await load<Route>("@/app/api/translate/route");
    const response = await POST(post("/api/translate", body));
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe(message);
  });

  it("rejects oversized bodies and cross-site requests", async () => {
    const { POST } = await load<Route>("@/app/api/translate/route");
    expect((await POST(post("/api/translate", { text: "ok", situation: "s".repeat(70_000) }))).status).toBe(413);
    expect((await POST(post("/api/translate", { text: "ok" }, { origin: "https://evil.example" }))).status).toBe(403);
  });

  it("rate limits per caller", async () => {
    vi.stubEnv("RATE_LIMIT_PER_MINUTE", "2");
    const { POST } = await load<Route>("@/app/api/translate/route");
    const headers = { "x-forwarded-for": "203.0.113.9" };
    expect((await POST(post("/api/translate", { text: "Brush your teeth." }, headers))).status).toBe(200);
    expect((await POST(post("/api/translate", { text: "Brush your teeth." }, headers))).status).toBe(200);
    const limited = await POST(post("/api/translate", { text: "Brush your teeth." }, headers));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await POST(post("/api/translate", { text: "Brush your teeth." }, { "x-forwarded-for": "203.0.113.10" }))).status).toBe(200);
  });

  it("maps AI failures to safe messages without leaking details", async () => {
    vi.doMock("@/lib/ai", async (original) => {
      const actual = await original<typeof import("@/lib/ai")>();
      return { ...actual, getAIProvider: () => ({ id: "anthropic", model: "m", isLive: true, generateObject: async () => { throw new actual.AIError("timeout", "secret upstream detail sk-123", true); } }) };
    });
    vi.resetModules();
    const { POST } = await import("@/app/api/translate/route");
    const response = await POST(post("/api/translate", { text: "Brush your teeth." }));
    expect(response.status).toBe(504);
    const text = await response.text();
    expect(text).toContain("took longer than expected");
    expect(text).not.toContain("sk-123");
    vi.doUnmock("@/lib/ai");
  });

  it("hides unexpected errors behind a generic 500", async () => {
    vi.doMock("@/lib/ai", async (original) => ({
      ...(await original<typeof import("@/lib/ai")>()),
      getAIProvider: () => ({ id: "anthropic", model: "m", isLive: true, generateObject: async () => { throw new Error("stack trace with /srv/path"); } }),
    }));
    vi.resetModules();
    const { POST } = await import("@/app/api/translate/route");
    const response = await POST(post("/api/translate", { text: "Brush your teeth." }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("/srv/path");
    vi.doUnmock("@/lib/ai");
  });
});

describe("authentication on API routes (Supabase configured)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });

  it.each([
    ["@/app/api/translate/route", "/api/translate", { text: "hi" }],
    ["@/app/api/translate/refine/route", "/api/translate/refine", { action: "shorter", original: "a", style: "minimal", currentText: "b" }],
    ["@/app/api/specialist/chat/route", "/api/specialist/chat", { messages: [{ role: "user", content: "hi" }] }],
    ["@/app/api/account/delete/route", "/api/account/delete", { confirm: "DELETE" }],
  ])("%s returns 401 without a session", async (module, path, body) => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await load<Route>(module);
    const response = await POST(post(path, body));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorised");
  });

  it("transcribe and knowledge search also require a session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const transcribe = await load<Route>("@/app/api/transcribe/route");
    const form = new FormData();
    form.append("audio", new Blob(["abc"], { type: "audio/webm" }), "a.webm");
    expect((await transcribe.POST(new Request(`${BASE}/api/transcribe`, { method: "POST", body: form }))).status).toBe(401);
    const search = await load<Route>("@/app/api/knowledge/search/route");
    expect((await search.GET(new Request(`${BASE}/api/knowledge/search?q=school`))).status).toBe(401);
  });

  it("accepts a signed-in user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const { POST } = await load<Route>("@/app/api/translate/route");
    expect((await POST(post("/api/translate", { text: "Brush your teeth." }))).status).toBe(200);
  });

  it("deletes the account with the service role, and reports clearly when it is not configured", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    let route = await load<Route>("@/app/api/account/delete/route");
    const missing = await route.POST(post("/api/account/delete", { confirm: "DELETE" }));
    expect(missing.status).toBe(503);
    expect((await missing.json()).error.message).toContain("SUPABASE_SERVICE_ROLE_KEY");

    serviceClient = { auth: { admin: { deleteUser } } };
    deleteUser.mockResolvedValue({ error: null });
    route = await load<Route>("@/app/api/account/delete/route");
    expect((await route.POST(post("/api/account/delete", { confirm: "nope" }))).status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
    const ok = await route.POST(post("/api/account/delete", { confirm: "DELETE" }));
    expect(ok.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });
});

describe("other routes in demo mode", () => {
  it("refines an alternative", async () => {
    const { POST } = await load<Route>("@/app/api/translate/refine/route");
    const response = await POST(post("/api/translate/refine", { action: "shorter", original: "Put your shoes on.", style: "reassuring", currentText: "It's just shoes and then we're in the car. Nothing else is coming, and I'll be right beside you." }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.alternative.text).toBe("It's just shoes and then we're in the car.");
    expect(body.meta.isDemo).toBe(true);
    expect((await POST(post("/api/translate/refine", { action: "shout", original: "a", style: "minimal", currentText: "b" }))).status).toBe(400);
  });

  it("answers a specialist message with sources and a demo label", async () => {
    const { POST } = await load<Route>("@/app/api/specialist/chat/route");
    const response = await POST(post("/api/specialist/chat", { messages: [{ role: "user", content: "What can I try when my child is overwhelmed?" }] }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta.isDemo).toBe(true);
    expect(body.sources.map((s: { slug: string }) => s.slug)).toContain("overwhelm-and-meltdowns");
    expect((await POST(post("/api/specialist/chat", { messages: [] }))).status).toBe(400);
    expect((await POST(post("/api/specialist/chat", { messages: [{ role: "assistant", content: "hi" }] }))).status).toBe(400);
  });

  it("returns a clearly-labelled demo transcript when transcription is not configured", async () => {
    const { POST } = await load<Route>("@/app/api/transcribe/route");
    const send = (blob: Blob | null) => {
      const form = new FormData();
      if (blob) form.append("audio", blob, "recording.webm");
      return POST(new Request(`${BASE}/api/transcribe`, { method: "POST", body: form, headers: { "x-forwarded-for": `10.1.0.${++ip}` } }));
    };
    const ok = await send(new Blob([new Uint8Array(2048)], { type: "audio/webm;codecs=opus" }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ isDemo: true, provider: "demo" });
    expect((await send(null)).status).toBe(400);
    expect((await send(new Blob([], { type: "audio/webm" }))).status).toBe(400);
    expect((await send(new Blob(["x"], { type: "application/pdf" }))).status).toBe(415);
  });

  it("uses OpenAI for transcription when a key is present", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ text: " Shoes on please. " }), { status: 200 }));
    const { POST } = await load<Route>("@/app/api/transcribe/route");
    const form = new FormData();
    form.append("audio", new Blob(["abc"], { type: "audio/mp4" }), "r");
    const response = await POST(new Request(`${BASE}/api/transcribe`, { method: "POST", body: form }));
    expect(await response.json()).toMatchObject({ text: "Shoes on please.", isDemo: false, model: "gpt-4o-mini-transcribe" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(((init.body as FormData).get("file") as File).name).toBe("recording.mp4");
  });

  it("searches the knowledge base", async () => {
    const { GET } = await load<Route>("@/app/api/knowledge/search/route");
    const response = await GET(new Request(`${BASE}/api/knowledge/search?q=declarative%20language`));
    expect((await response.json()).results[0].slug).toBe("declarative-language");
    expect((await GET(new Request(`${BASE}/api/knowledge/search?q=`))).status).toBe(400);
  });

  it("health and config report status without secrets", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-super-secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
    const health = await (await load<Route>("@/app/api/health/route")).GET(new Request(`${BASE}/api/health`));
    const config = await (await load<Route>("@/app/api/config/route")).GET(new Request(`${BASE}/api/config`));
    const text = (await health.text()) + (await config.text());
    expect(text).toContain('"status":"ok"');
    expect(text).toContain('"provider":"anthropic"');
    expect(text).not.toMatch(/super-secret|service-secret/);
  });
});

describe("missing credentials", () => {
  it("falls back to demo behaviour everywhere and says so", async () => {
    const { configStatus } = await load<typeof import("@/lib/config")>("@/lib/config");
    expect(configStatus()).toMatchObject({ dataMode: "demo", ai: { provider: "mock", live: false, misconfigured: null }, transcription: { live: false, model: "demo" } });
  });
  it("flags a requested provider whose key is missing", async () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    const { configStatus } = await load<typeof import("@/lib/config")>("@/lib/config");
    expect(configStatus().ai).toMatchObject({ provider: "mock", live: false, misconfigured: "anthropic" });
  });
});

describe("rate limiter", () => {
  it("allows up to the limit per window and then resets", () => {
    const store = new MemoryRateLimitStore();
    expect(store.hit("k", 2, 1000, 0).allowed).toBe(true);
    expect(store.hit("k", 2, 1000, 10).allowed).toBe(true);
    expect(store.hit("k", 2, 1000, 20)).toMatchObject({ allowed: false, remaining: 0, resetAt: 1000 });
    expect(store.hit("other", 2, 1000, 20).allowed).toBe(true);
    expect(store.hit("k", 2, 1000, 1001).allowed).toBe(true);
  });
});
