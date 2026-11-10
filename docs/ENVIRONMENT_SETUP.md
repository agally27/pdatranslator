# Environment setup

Copy `.env.example` to `.env.local` for local development. In Vercel, add the same names under **Project → Settings → Environment Variables**. Every variable is optional: with none set the app runs in demo mode.

## Variables

### AI

| Name | Default | Description |
| --- | --- | --- |
| `AI_PROVIDER` | auto | `anthropic`, `openai` or `mock`. Blank selects Anthropic if its key is set, otherwise OpenAI if its key is set, otherwise the demo engine. Naming a provider whose key is missing falls back to demo and shows a warning banner |
| `AI_MODEL` | `claude-opus-5-5` / `gpt-4o` | Model ID for the selected provider |
| `AI_EFFORT` | `medium` | Anthropic only: `low`, `medium` or `high`. Lower is faster and cheaper |
| `AI_TIMEOUT_MS` | `45000` | Timeout for each provider call |
| `ANTHROPIC_API_KEY` | – | Server-only |
| `OPENAI_API_KEY` | – | Server-only. Enables transcription, embeddings and OpenAI as a provider |

### Voice

| Name | Default | Description |
| --- | --- | --- |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | For example `gpt-4o-transcribe` or `whisper-1` |

### Knowledge retrieval

| Name | Default | Description |
| --- | --- | --- |
| `KNOWLEDGE_RETRIEVAL` | `keyword` | `vector` uses pgvector (needs Supabase, `OPENAI_API_KEY` and a seeded table) |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Must produce 1536-dimension vectors to match the migration |

### Supabase

| Name | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL. Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key. Public by design; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only – never prefix with `NEXT_PUBLIC_`.** Used for account deletion and `npm run seed:knowledge` |

### Other

| Name | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_PER_MINUTE` | `20` | Translate/refine requests per user per minute |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |

`NEXT_PUBLIC_*` values are inlined at build time: rebuild or redeploy after changing them.

## Common configurations

**Demo (default)** – nothing set.

**Live AI, local data** – for trying the real model on your own machine:

```
ANTHROPIC_API_KEY=sk-ant-…
```

Do not expose this configuration publicly: without Supabase there is no sign-in in front of the AI endpoints.

**Full production**

```
ANTHROPIC_API_KEY=…
OPENAI_API_KEY=…                 # voice transcription
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…
```

**OpenAI for everything**

```
AI_PROVIDER=openai
OPENAI_API_KEY=…
AI_MODEL=gpt-4o
```

## Supabase step by step

1. Create a project and note the URL, anon key and service-role key (**Project Settings → API**).
2. Apply migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   or run the three files in `supabase/migrations/` in order in the SQL editor.
3. **Authentication → URL Configuration:** set the Site URL; add `http://localhost:3000/auth/callback` and `https://<domain>/auth/callback` to Redirect URLs.
4. **Authentication → Providers → Email:** keep "Confirm email" on for production.
5. Optional – semantic search:
   ```bash
   node --env-file=.env.local node_modules/.bin/tsx scripts/seed-knowledge.ts
   ```
   then set `KNOWLEDGE_RETRIEVAL=vector`.

## Checking your configuration

- `GET /api/health` – `dataMode`, `aiProvider`, `aiLive`, `transcriptionLive`.
- **Settings → Connected services** in the app shows the same in plain language.
- A banner appears on every page while any part of the app is in demo mode.

## Credentials still required from the owner

None are needed to run the demo. For live operation: an Anthropic **or** OpenAI API key (AI), an OpenAI API key (voice), and a Supabase project (URL, anon key, service-role key).
