import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/ai/providers/mock";
import { ChatRequestSchema } from "@/lib/ai/schemas/specialist.schema";
import { runSpecialistChat } from "@/lib/ai/specialist/chat";
import { buildSpecialistSystem, SPECIALIST_ROLE } from "@/lib/ai/specialist/context";
import { KeywordRetriever } from "@/lib/ai/specialist/retrieval";
import { detectSafetyConcern } from "@/lib/ai/specialist/safety";
import { friendlyAuthError } from "@/lib/auth/auth-context";
import { STARTERS } from "@/components/specialist/specialist";
import { ARTICLES } from "@/lib/knowledge/articles";
import { searchArticles } from "@/lib/knowledge/search";
import { KNOWLEDGE_CATEGORIES } from "@/lib/knowledge/types";
import type { AIProvider, GenerateObjectRequest } from "@/lib/ai/types";

const chat = (content: string, extra = {}) => runSpecialistChat(new MockProvider(), ChatRequestSchema.parse({ messages: [{ role: "user", content }], ...extra }), new KeywordRetriever());

describe("specialist conversations", () => {
  it.each(STARTERS)("responds helpfully to the starter “%s”", async (starter) => {
    const response = await chat(starter);
    expect(response.reply.length).toBeGreaterThan(150);
    expect(response.meta.isDemo).toBe(true);
    expect(response.reply).toMatch(/you know your child best/);
    expect(response.reply).not.toMatch(/I guarantee|will definitely|diagnos(e|is) (your|them)|I am a (doctor|clinician|therapist)/i);
    expect((response.reply.match(/\?/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(response.suggestedTitle.length).toBeGreaterThan(0);
  });

  it("only cites articles that were actually retrieved", async () => {
    const response = await chat("Help me communicate with school.");
    expect(response.sources.map((s) => s.slug)).toEqual(["working-with-school"]);
    for (const source of response.sources) expect(response.meta.retrievedSlugs).toContain(source.slug);
  });

  it("refuses to cite sources a model invents", async () => {
    const liar: AIProvider = {
      id: "anthropic", model: "x", isLive: true,
      generateObject: async <T,>(req: GenerateObjectRequest<T>) => req.schema.parse({ reply: "ok", usedSourceSlugs: ["made-up-study", "what-is-pda"], safetyConcern: false, suggestedTitle: "t" }),
    };
    const response = await runSpecialistChat(liar, ChatRequestSchema.parse({ messages: [{ role: "user", content: "What is PDA?" }] }), new KeywordRetriever());
    expect(response.sources.map((s) => s.slug)).toEqual(["what-is-pda"]);
  });

  it("is honest when the knowledge base has no sourced article", async () => {
    const response = await chat("Bedtime and sleep are really hard.");
    expect(response.reply).toMatch(/doesn't yet have a sourced article/);
  });

  it("personalises only from shared context", async () => {
    const context = { interests: "dinosaurs", effectiveStrategies: "silly voices" };
    const withProfile = await chat("How can I approach a difficult morning?", { childContext: context, preferences: [{ key: "choices_pressure", statement: "Choices can sometimes increase pressure." }] });
    expect(withProfile.reply).toMatch(/dinosaurs/);
    expect(withProfile.reply).toMatch(/avoid either\/or/);
    expect((await chat("How can I approach a difficult morning?")).reply).not.toMatch(/dinosaurs/);
  });

  it("always signposts help when a message suggests risk, whatever the model says", async () => {
    for (const text of ["I can't cope any more and I'm scared I'll hurt him", "She said she wants to die", "He ran into the road with a knife"]) {
      expect(detectSafetyConcern(text), text).toBe(true);
      const response = await chat(text);
      expect(response.safetyFlag).toBe(true);
      expect(response.reply).toMatch(/999/);
      expect(response.reply).toMatch(/116 123/);
    }
    const silent: AIProvider = {
      id: "openai", model: "x", isLive: true,
      generateObject: async <T,>(req: GenerateObjectRequest<T>) => req.schema.parse({ reply: "Try a sticker chart.", usedSourceSlugs: [], safetyConcern: false, suggestedTitle: "t" }),
    };
    const response = await runSpecialistChat(silent, ChatRequestSchema.parse({ messages: [{ role: "user", content: "I think I might hurt myself" }] }), new KeywordRetriever());
    expect(response.reply).toMatch(/999/);
    expect(detectSafetyConcern("Mornings are tricky and shoes are a battle")).toBe(false);
  });

  it("instructs live models to stay within their role and ground answers in retrieved passages", async () => {
    const passages = await new KeywordRetriever().retrieve("transitions leaving the house", 3);
    const system = buildSpecialistSystem({ messages: [], childContext: null, preferences: [], passages, safetyConcern: false });
    expect(system).toContain('<passage slug="easing-transitions"');
    expect(SPECIALIST_ROLE).toMatch(/not a clinician/);
    expect(SPECIALIST_ROLE).toMatch(/Never invent research/);
    expect(SPECIALIST_ROLE).toMatch(/at most one gentle question/);
  });

  it("validates chat requests", () => {
    expect(ChatRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(4001) }] }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ messages: [{ role: "system", content: "x" }] }).success).toBe(false);
  });
});

describe("knowledge base", () => {
  it("covers every category and marks evidence on every article", () => {
    for (const category of KNOWLEDGE_CATEGORIES) expect(ARTICLES.some((a) => a.category === category.id), category.id).toBe(true);
    expect(new Set(ARTICLES.map((a) => a.slug)).size).toBe(ARTICLES.length);
    for (const article of ARTICLES) {
      expect(article.reviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.summary.length).toBeGreaterThan(20);
      if (article.status === "placeholder") {
        expect(article.evidence).toBe("placeholder");
        expect(article.sources).toEqual([]);
      } else {
        expect(article.content.length).toBeGreaterThanOrEqual(3);
        expect(article.sources.length).toBeGreaterThan(0);
        // Anything not backed by organisation guidance or research must say so.
        if (article.evidence === "general_guidance") expect(article.content.join(" ")).toMatch(/general guidance|little research/i);
      }
      for (const source of article.sources) if (source.url) expect(source.url).toMatch(/^https:\/\//);
    }
  });
  it("finds relevant articles and ignores noise", () => {
    expect(searchArticles("meltdowns")[0].article.slug).toBe("overwhelm-and-meltdowns");
    expect(searchArticles("how do I talk to the teacher at school")[0].article.slug).toBe("working-with-school");
    expect(searchArticles("exhausted parent")[0].article.slug).toBe("looking-after-yourself");
    expect(searchArticles("the and of")).toEqual([]);
    expect(searchArticles("sleep").length).toBe(0);
    expect(searchArticles("sleep", { includePlaceholders: true })[0].article.status).toBe("placeholder");
  });
});

describe("authentication messages", () => {
  it("are friendly and do not reveal whether an account exists", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe("That email and password don’t match. Please try again.");
    expect(friendlyAuthError("User already registered")).toMatch(/may already exist/);
    expect(friendlyAuthError("Email not confirmed")).toMatch(/confirm your email/);
    expect(friendlyAuthError("weird internal error 0x1")).not.toMatch(/0x1/);
  });
});

describe("database security (static checks on the migrations)", () => {
  const dir = join(process.cwd(), "supabase/migrations");
  const sql = readdirSync(dir).sort().map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  const TABLES = ["profiles", "child_profiles", "communication_preferences", "translations", "translation_feedback", "saved_translations", "conversations", "messages", "knowledge_articles", "user_settings"];
  const PERSONAL = TABLES.filter((t) => t !== "knowledge_articles");

  it("creates every required table with RLS enabled", () => {
    for (const table of TABLES) {
      expect(sql, table).toMatch(new RegExp(`create table public\\.${table} \\(`));
      expect(sql, table).toMatch(new RegExp(`alter table public\\.${table} enable row level security`));
    }
  });
  it("gives each personal table owner-only select, insert, update and delete policies", () => {
    for (const table of PERSONAL) {
      const policies = [...sql.matchAll(new RegExp(`create policy "[^"]+" on public\\.${table} for (select|insert|update|delete) to ([a-z_, ]+?) (using|with check) \\(\\(select auth\\.uid\\(\\)\\) = (user_id|id)\\)`, "g"))];
      expect(policies.map((p) => p[1]).sort(), table).toEqual(["delete", "insert", "select", "update"]);
      expect(policies.every((p) => p[2].trim() === "authenticated"), `${table} must not grant anon`).toBe(true);
    }
    expect(sql).not.toMatch(/using \(true\)/);
  });
  it("cascades deletion from the auth user and keeps knowledge read-only", () => {
    for (const table of PERSONAL) expect(sql, table).toMatch(new RegExp(`create table public\\.${table} \\([\\s\\S]*?references auth\\.users \\(id\\) on delete cascade`));
    expect([...sql.matchAll(/create policy "[^"]+" on public\.knowledge_articles\s+for (\w+)/g)].map((m) => m[1])).toEqual(["select"]);
  });
  it("defaults profile sharing to off and prevents cross-user references", () => {
    expect(sql).toMatch(/share_profile_with_ai boolean not null default false/);
    expect(sql).toMatch(/create trigger translations_same_owner/);
    expect(sql).toMatch(/set search_path = ''/);
  });
});

describe("secrets stay server-side", () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const files = walk(join(process.cwd(), "src")).filter((f) => /\.(ts|tsx)$/.test(f));

  it("client components never reference server-only credentials or the service client", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (!/^["']use client["']/.test(source.trimStart())) continue;
      expect(source, file).not.toMatch(/process\.env\.(SUPABASE_SERVICE|ANTHROPIC|OPENAI)|getServiceSupabase|supabase\/server|serverConfig\(/);
    }
  });
  it("no secret is exposed through a NEXT_PUBLIC_ variable and none is hardcoded", () => {
    const all = files.map((f) => readFileSync(f, "utf8")).join("\n") + readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(all).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET|ANTHROPIC|OPENAI)/);
    expect(all).not.toMatch(/sk-ant-[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{32,}|eyJhbGciOi/);
    for (const line of readFileSync(join(process.cwd(), ".env.example"), "utf8").split("\n")) {
      if (line && !line.startsWith("#")) expect(line, line).toMatch(/^[A-Z_]+=$/);
    }
  });
  it("the logger is never given user content", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const call of source.matchAll(/logger\.(info|warn|error|debug)\(([^;]*)\);/g)) {
        expect(call[2], file).not.toMatch(/\b(text|content|transcript|prompt|reply|body|situation|original)\b\s*[,}:]/);
      }
    }
  });
});
