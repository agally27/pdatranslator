# PDA Companion

**Communication. Understanding. Connection.**

PDA Companion is a standalone web application for parents and carers of autistic children with a PDA (Pathological Demand Avoidance) profile. It helps them communicate in ways that reduce unnecessary perceived demands, support autonomy and preserve connection.

- **PDA Translator** – turns an everyday sentence (typed, spoken or described as a situation) into six PDA-informed alternatives: descriptive, collaborative, autonomy-supporting, playful, reassuring and minimal language. Every result includes a demand analysis and has been through an independent validation step.
- **PDA Specialist** – a conversational assistant grounded in a curated knowledge base, with source attribution and safety signposting.
- **Child profiles and personalisation** – optional profiles, and a feedback engine that keeps parent-confirmed preferences strictly separate from observations and AI suggestions.
- **Translation history, favourites and a Knowledge Hub** with an evidence label on every article.

> PDA Companion offers communication ideas and general information. It is not a clinical service, does not diagnose, and makes no claim that any wording will produce a particular response. Passing the automated test suite is not clinical validation.

## Works out of the box (demo mode)

With **no environment variables at all**, the app runs in demo mode:

| Area | Demo mode | Live mode |
| --- | --- | --- |
| Accounts and data | Local demo session; data in this browser's `localStorage` | Supabase Auth + Postgres with Row Level Security |
| Translations and specialist | Built-in rule-based demo engine, labelled **Demo response** | Anthropic Claude or OpenAI |
| Voice input | Records, then inserts a labelled example sentence | OpenAI transcription |

Demo output is never presented as live AI.

## Technology

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-style components on Radix primitives · Lucide icons · Supabase (Postgres, Auth, RLS, pgvector) · Anthropic SDK · OpenAI REST API · Zod · Vitest · Playwright.

## Install and run

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the site, choose **Get started → Continue in demo mode**. An example child profile, translations and a conversation are created for you.

Production build:

```bash
npm run build
npm run start
```

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Everything is optional; each service switches on independently. Full detail: [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md).

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Claude for translations and the specialist |
| `OPENAI_API_KEY` | Enables voice transcription; also an alternative AI provider |
| `OPENAI_TRANSCRIPTION_MODEL` | Transcription model (default `gpt-4o-mini-transcribe`) |
| `AI_PROVIDER` | `anthropic`, `openai` or `mock`. Blank = auto (Anthropic → OpenAI → mock) |
| `AI_MODEL` | Model override (defaults: `claude-opus-5-5`, `gpt-4o`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used for account deletion and knowledge seeding |

Optional: `AI_EFFORT`, `AI_TIMEOUT_MS`, `KNOWLEDGE_RETRIEVAL`, `OPENAI_EMBEDDING_MODEL`, `RATE_LIMIT_PER_MINUTE`, `LOG_LEVEL`.

### Supabase

1. Create a project at supabase.com.
2. Apply the migrations in `supabase/migrations/` in filename order – either `supabase link --project-ref <ref> && supabase db push`, or paste each file into the SQL editor.
3. In **Authentication → URL Configuration**, set the Site URL and add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) as redirect URLs.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

Once the two public values are set, the login page offers sign in / create account and the demo session is no longer used.

### Anthropic

Create an API key in the Claude Console and set `ANTHROPIC_API_KEY`. The default model is `claude-opus-5-5`; set `AI_MODEL` to use another (for example `claude-sonnet-5-5` for faster, cheaper responses). `AI_EFFORT` (`low` | `medium` | `high`) trades depth for speed.

### OpenAI

Set `OPENAI_API_KEY`. To use OpenAI for translations and the specialist as well as transcription, also set `AI_PROVIDER=openai` (and optionally `AI_MODEL`).

### Microphone transcription

Set `OPENAI_API_KEY` (and optionally `OPENAI_TRANSCRIPTION_MODEL`). Recording needs HTTPS or `localhost`. Audio is sent once for transcription and is never stored; the parent always reviews and edits the transcript before anything is translated.

### Demo mode

Leave the Supabase and AI variables blank. To force demo AI while keeping real accounts, set `AI_PROVIDER=mock`.

## Tests

```bash
npm run lint
npm run typecheck
npm test                 # unit, API, security and quality suites
npm run test:quality     # the 122-scenario translation quality suite only
npm run check            # lint + typecheck + tests + production build

# End-to-end (needs a running server)
npm run build && npm run start -- -p 3100 &
BASE_URL=http://localhost:3100 npm run test:e2e
```

See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md).

## Deploy to Vercel

1. Import the GitHub repository into Vercel (framework preset: Next.js; no build settings to change).
2. Add the environment variables above for Production (and Preview if wanted).
3. Apply the Supabase migrations and set the auth redirect URLs.
4. Deploy, then check `https://<your-domain>/api/health`.

Details and a launch checklist: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

## Documentation

| | |
| --- | --- |
| [PRODUCT_SPEC](docs/PRODUCT_SPEC.md) | What the product does and why |
| [AI_FOUNDATION](docs/AI_FOUNDATION.md) | Principles, pipeline, prompts, knowledge editorial rules |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Code structure and data flow |
| [DATABASE_SPEC](docs/DATABASE_SPEC.md) | Tables, relationships, RLS |
| [API_DOCUMENTATION](docs/API_DOCUMENTATION.md) | HTTP endpoints |
| [PRIVACY_AND_SECURITY](docs/PRIVACY_AND_SECURITY.md) | Data protection design and security controls |
| [ENVIRONMENT_SETUP](docs/ENVIRONMENT_SETUP.md) | Every environment variable |
| [DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md) | Vercel + Supabase |
| [TESTING_GUIDE](docs/TESTING_GUIDE.md) | Test suites and how to extend them |
| [FUTURE_ROADMAP](docs/FUTURE_ROADMAP.md) | Known limitations and next steps |

## Before a public launch

The software is complete, but these need a person: verify the Knowledge Hub references, complete the data-controller details in the privacy notice, carry out a DPIA and sign processor agreements, test the live AI and Supabase paths with real credentials, and have the content reviewed by someone with PDA expertise. See [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md).
