# API documentation

All endpoints are Next.js route handlers under `/api`. Responses are JSON with `Cache-Control: no-store`.

## Conventions

**Authentication.** With Supabase configured, every endpoint except `/api/health` and `/api/config` requires a valid session cookie and returns `401` otherwise. In demo mode there are no accounts; callers are identified by IP for rate limiting.

**CSRF.** State-changing endpoints reject requests whose `Origin` does not match the host (`403`).

**Rate limiting.** Per user (or per IP in demo mode), per minute: translate + refine share `RATE_LIMIT_PER_MINUTE` (default 20), specialist 20, transcribe 10, knowledge search 60, account 5. Exceeding it returns `429` with `Retry-After`.

**Errors.**

```json
{ "error": { "code": "invalid_request", "message": "Please enter something to translate." } }
```

| Status | Codes |
| --- | --- |
| 400 | `invalid_json`, `invalid_request` |
| 401 | `unauthorised` |
| 403 | `forbidden` |
| 413 | `too_large` |
| 415 | `unsupported_media` |
| 422 | `ai_refused` |
| 429 | `rate_limited` |
| 502 | `ai_auth`, `ai_invalid_response`, `ai_provider_error`, `delete_failed` |
| 503 | `ai_rate_limited`, `ai_not_configured`, `not_configured` |
| 504 | `ai_timeout` |
| 500 | `server_error` |

Messages are written for end users. Upstream provider detail is never included.

---

## POST /api/translate

Runs the full translation workflow. Stateless.

```json
{
  "text": "Put your shoes on now, we're late!",
  "situation": "",
  "inputMethod": "text",
  "childContext": null,
  "preferences": [],
  "variant": 0
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `text` | string, 1–1000 | Required |
| `situation` | string, ≤1500 | Optional |
| `inputMethod` | `text` \| `voice` \| `situation` | Default `text` |
| `childContext` | object \| null | Pseudonymised profile (no name field exists). Sent only with parental opt-in |
| `preferences` | `{ key, statement }[]`, ≤30 | Confirmed preferences only |
| `variant` | integer 0–1000 | Increment for "Try again" |

**200**

```json
{
  "result": {
    "original": "…", "situation": "",
    "intent": { "summary": "…", "practicalObjective": "…", "topic": "…", "involvesSafety": false, "safetyNote": "" },
    "demandAnalysis": { "level": "high", "reasoning": "…", "triggers": [{ "type": "time_pressure", "phrase": "now", "explanation": "…" }] },
    "alternatives": [{
      "id": "alt_…", "style": "descriptive", "text": "…", "explanation": "…",
      "validation": { "passed": true, "checks": { "intentPreserved": true, "…": true }, "issues": [] },
      "attempts": 1
    }],
    "overallExplanation": "…",
    "personalisationApplied": [],
    "meta": { "provider": "mock", "model": "demo-rules-v1", "isDemo": true, "generatedAt": "…", "durationMs": 12, "profileUsed": false }
  }
}
```

`style` is one of `descriptive`, `collaborative`, `autonomy`, `playful`, `reassuring`, `minimal`. `meta.isDemo` is true when the built-in demo engine produced the result.

## POST /api/translate/refine

Applies one control to one alternative.

```json
{
  "action": "shorter",
  "original": "Put your shoes on now.",
  "situation": "",
  "style": "reassuring",
  "currentText": "It's just shoes and then we're in the car. Nothing else is coming.",
  "intentSummary": "…", "topic": "…", "involvesSafety": false,
  "triggers": [{ "type": "time_pressure", "phrase": "now" }],
  "childContext": null, "preferences": [], "variant": 1
}
```

`action`: `shorter`, `more_natural`, `more_playful`, `less_demanding`, `remove_questions`, `explain`, `another`.

**200** `{ "alternative": { …, "refinedBy": "shorter" }, "meta": { "provider", "model", "isDemo" } }`. For `explain` the text is unchanged and `explanation` holds the fuller explanation.

## POST /api/specialist/chat

One specialist turn. Stateless; the client stores messages.

```json
{
  "messages": [{ "role": "user", "content": "What can I try when my child is overwhelmed?" }],
  "childContext": null,
  "preferences": []
}
```

1–40 messages, each ≤4000 characters; the last must be from the user.

**200**

```json
{
  "reply": "…",
  "sources": [{ "slug": "overwhelm-and-meltdowns", "title": "Overwhelm and meltdowns" }],
  "safetyFlag": false,
  "suggestedTitle": "When your child is overwhelmed",
  "meta": { "provider": "mock", "model": "demo-rules-v1", "isDemo": true, "retrievedSlugs": ["…"] }
}
```

`sources` only ever contains articles that were retrieved for this message. When `safetyFlag` is true the reply includes UK emergency signposting.

## POST /api/transcribe

`multipart/form-data` with one file field, `audio`. Accepted types: webm, mp4/m4a, mpeg, ogg, wav, aac. Maximum 10 MB.

**200** `{ "text": "…", "isDemo": false, "provider": "openai", "model": "gpt-4o-mini-transcribe" }`

Without `OPENAI_API_KEY` the audio is discarded unread and a fixed example sentence is returned with `"isDemo": true`. Audio is held in memory for the request only and never written to disk, storage or logs.

## GET /api/knowledge/search?q=

Keyword search over the knowledge base (1–200 characters).

**200** `{ "results": [{ "slug", "title", "summary", "category", "evidence", "status", "score" }] }`

## POST /api/account/delete

Body `{ "confirm": "DELETE" }`. Deletes the signed-in auth user with the service role; all personal rows cascade. Returns `{ "deleted": true, "mode": "supabase" | "demo" }`, or `503 not_configured` if `SUPABASE_SERVICE_ROLE_KEY` is missing. (The client deletes the user's rows through RLS first, so data is removed even in that case.)

## GET /api/config

Public, non-secret feature status used by the UI.

```json
{
  "dataMode": "demo",
  "ai": { "provider": "mock", "model": "demo-rules-v1", "live": false, "misconfigured": null },
  "transcription": { "live": false, "model": "demo" },
  "knowledgeRetrieval": "keyword",
  "accountDeletion": true
}
```

## GET /api/health

Liveness check for monitoring. `{ "status": "ok", "time", "version", "dataMode", "aiProvider", "aiLive", "transcriptionLive" }`. No secrets, no user data.

## GET /auth/callback

Completes Supabase email-confirmation and password-reset links (`?code=…&next=/path`), then redirects. Only same-site relative `next` values are honoured.

## Data access

Profiles, preferences, history, favourites, feedback and conversations are not exposed through custom endpoints. The browser reads and writes them through Supabase's API under Row Level Security (see DATABASE_SPEC.md), via `SupabaseDataClient`. Data export is produced client-side from the same interface.
