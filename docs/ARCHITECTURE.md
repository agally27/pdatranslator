# Architecture

## Overview

```
Browser (React client components)
 ├─ AuthProvider ........ Supabase Auth session, or a local demo session
 ├─ AppDataProvider ..... loads the user's data once; exposes actions
 │    └─ DataClient ..... LocalDataClient (demo) | SupabaseDataClient (RLS)
 └─ fetch /api/* ........ stateless AI endpoints
        │
Next.js server (route handlers)
 ├─ withApi ............. auth, same-origin check, rate limit, validation, error mapping
 ├─ translation pipeline  intent → demands → generate → validate → regenerate
 ├─ specialist chat ..... safety screen → retrieval → generate → attribution
 ├─ transcription ....... OpenAI | demo
 └─ AIProvider .......... Anthropic | OpenAI | mock
```

Two design decisions shape everything:

1. **AI endpoints are stateless.** They receive text (plus, only with consent, a pseudonymised profile), return a result and store nothing. Persistence is done by the client through the data layer. The server therefore never needs elevated database access for normal operation.
2. **Personal data is reached through one interface, `DataClient`.** In Supabase mode it runs in the browser with the anon key and the user's session, and Row Level Security is the enforcement point. In demo mode the same interface is backed by `localStorage`. The UI cannot tell the difference.

## Directory structure

```
src/
  app/
    page.tsx, login/, privacy/           public pages
    (app)/                               signed-in pages behind AppShell
      dashboard/ translator/ specialist/ profiles/ history/ knowledge/ settings/
    api/
      translate/ translate/refine/ specialist/chat/ transcribe/
      knowledge/search/ account/delete/ config/ health/
    auth/callback/                       Supabase email-link handler
  proxy.ts                               session refresh + route protection (Next.js 16 "proxy")
  components/
    ui/                                  design-system primitives
    app/                                 shell, navigation, history, knowledge hub, settings, consent
    translator/ specialist/ profiles/    feature components
  lib/
    ai/                                  see AI_FOUNDATION.md
    data/                                DataClient, local + Supabase implementations, demo seed, React store
    personalisation/                     feedback → insights; what may be sent to AI
    knowledge/                           articles, sources, search
    auth/                                auth context
    supabase/                            browser and server clients
    api.ts  api-client.ts  config.ts  logger.ts  rate-limit.ts  types.ts  utils.ts
supabase/migrations/                     schema, RLS, vector search
scripts/seed-knowledge.ts                knowledge table + embeddings
tests/                                   unit, api, quality, e2e
docs/
```

## Request flow: a translation

1. `Translator` builds the request. `buildAiContext()` returns the profile slice and confirmed preferences **only if** the parent has opted in; otherwise `null` and `[]`.
2. `POST /api/translate` → `withApi` → same-origin check → `requireUser` → rate limit → Zod validation.
3. `runTranslationPipeline(getAIProvider(), request)` returns a `TranslationResult`.
4. The client stores it with `actions.createTranslation` (unless history is off) and renders it.
5. Save, feedback and refine actions update the stored record; feedback also runs `planInsightSync` to create or update observations and suggestions.

## Modes

| Concern | Decided by | Values |
| --- | --- | --- |
| Data and auth | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase` or `demo` |
| AI | `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | `anthropic`, `openai` or `mock` |
| Transcription | `OPENAI_API_KEY` | live or demo |
| Retrieval | `KNOWLEDGE_RETRIEVAL` | `keyword` or `vector` |

The modes are independent. `GET /api/config` reports them (without secrets) and the UI labels demo behaviour accordingly.

## Authentication

- **Supabase mode:** email + password with email confirmation and password reset. `proxy.ts` refreshes the session cookie and redirects signed-out visitors from app routes; `AppShell` guards on the client; every protected API route calls `requireUser`, which verifies the session server-side with `supabase.auth.getUser()`.
- **Demo mode:** a local session object in `localStorage`. API routes identify callers by IP for rate limiting only.

## State management

No external state library. `AppDataProvider` loads profile, settings, children, preferences, translations, feedback, favourites and conversations once, and exposes `actions` that write through the `DataClient` and patch local state. Messages are loaded per conversation.

## Error handling

- `AIError` has a code (`timeout`, `rate_limited`, `auth`, `refused`, `invalid_response`, `provider_error`, `not_configured`), each mapped to an HTTP status and a calm user-facing message. Upstream error text is never forwarded.
- `ApiError` covers 400/401/403/413/415/429.
- Anything else becomes a generic 500. The client's `api-client.ts` always resolves to a readable message.
- Pages have loading skeletons, empty states, inline error cards with retry, and toasts.

## Logging

`logger.ts` writes one JSON line per event (route, status, duration, error code; AI provider, model, task, tokens). User text, transcripts, profile data and AI output are never logged – a test scans for this. `LOG_LEVEL` controls verbosity.

## Extending

- **New AI provider:** implement `AIProvider`, add it to `getAIProvider()` and `resolveProviderId()`.
- **New communication approach:** add to `STYLE_IDS`/`STYLE_META` in `types.ts`, the database check constraints, the demo topic library and `STYLE_VISUAL`.
- **New knowledge article:** add to `articles.ts` (and `sources.ts`), then re-run `npm run seed:knowledge` if using vector retrieval.
- **Shared rate limiting:** implement `RateLimitStore` against Redis/KV and swap it in `rate-limit.ts`.
