# Testing guide

## Commands

```bash
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm test                # all Vitest suites
npm run test:quality    # translation quality scenarios only
npm run test:watch
npm run check           # lint + typecheck + test + production build
```

End-to-end (Playwright, against a running server in demo mode):

```bash
npm run build && npm run start -- -p 3100 &
BASE_URL=http://localhost:3100 npm run test:e2e
# optional: SCREENSHOT_DIR=./screenshots  PW_EXECUTABLE=/path/to/chromium
```

If Chromium is not installed: `npx playwright install chromium`.

All tests run with no credentials; `tests/setup.ts` clears every relevant environment variable before each test.

## What is covered

| Area | Where |
| --- | --- |
| Authentication – demo session, restore, sign out; 401 on every protected route without a session; friendly errors | `tests/unit/auth.test.tsx`, `tests/api/routes.test.ts`, `tests/unit/specialist-security.test.ts` |
| Profile creation, editing, deletion; input sanitising | `tests/unit/data.test.ts` |
| Translation input validation | `tests/unit/pipeline.test.ts`, `tests/api/routes.test.ts` |
| AI response validation (JSON extraction, schema, retry, timeout) | `tests/unit/pipeline.test.ts` |
| Demand detection – all 13 types, levels, quoted phrases | `tests/unit/heuristics.test.ts` |
| All six styles; stage order; regeneration; flagged failures; lint overruling a lenient reviewer | `tests/unit/pipeline.test.ts` |
| Refine controls (all seven) | `tests/unit/pipeline.test.ts`, `tests/api/routes.test.ts` |
| Feedback and the personalisation engine; consent gating; name never shared | `tests/unit/data.test.ts` |
| Saved translations and history search/filter | `tests/unit/data.test.ts` |
| Specialist conversations, starters, source attribution, safety signposting | `tests/unit/specialist-security.test.ts`, `tests/api/routes.test.ts` |
| API error handling, rate limiting, CSRF, body limits, no leakage of upstream errors | `tests/api/routes.test.ts` |
| Missing credentials → demo behaviour, clearly reported | `tests/api/routes.test.ts` |
| Provider adapters (Anthropic, OpenAI, selection from env) with mocked clients | `tests/unit/pipeline.test.ts` |
| Security and data isolation – per-user storage, RLS policies (static SQL checks), secrets server-side, no content in logs | `tests/unit/data.test.ts`, `tests/unit/specialist-security.test.ts` |
| Knowledge base integrity and search | `tests/unit/specialist-security.test.ts` |
| Whole-app flows and responsive layout at 375/390/768/1280/1440 px | `tests/e2e/smoke.mjs` |

## Translation quality suite

`tests/quality/scenarios.ts` holds 122 scenarios across direct, indirect and disguised demands, questions, transitions, safety, medical appointments, school, eating and drinking, personal care, sleep, play and family life. Each is run through the full pipeline and checked for:

- **Structure** – six approaches, all distinct, none repeating the original.
- **Semantic preservation** – the validation stage's intent check passes.
- **Hidden demands** – an independent lint pass finds no demand wording, urgency, conditions, promises or false choices.
- **Naturalness** – sayable length, complete sentences, no template leftovers; minimal language ≤ 12 words.
- **Safety** – safety scenarios are recognised, carry a safety note and keep the boundary; non-safety scenarios are not mislabelled.
- **Demand analysis** – expected trigger types and minimum level for the original wording.

### What this suite does and does not show

It runs against the **demo engine**, so it verifies that the pipeline, guard-rails and example library behave as designed. It does **not** measure the quality of a live model, and it is **not clinical validation**: no automated check can establish that a phrase will help a particular child.

### Live evaluation (recommended before launch)

Not automated here because it needs credentials and costs money. Suggested approach:

1. Set `ANTHROPIC_API_KEY` (or OpenAI) in a local shell.
2. Write a small script that imports `SCENARIOS`, calls `runTranslationPipeline(getAIProvider(), …)` for each, and records pass rates per check, regeneration counts and latency.
3. Have at least one person with PDA expertise and one parent review a sample of outputs by hand, especially the safety and medical scenarios.
4. Add any failures as new scenarios or lint patterns.

## Not covered by automated tests

- The Supabase data client and RLS policies against a real database (policies are checked statically; `SupabaseDataClient` is covered only for row mapping).
- Real Anthropic/OpenAI responses and real transcription.
- Real microphones on real devices, particularly iOS Safari.
- Screen-reader behaviour (the markup follows accessible patterns but has not been audited with assistive technology).

Each of these needs a manual pass once credentials exist – see FUTURE_ROADMAP.md.

## Adding tests

- New scenario: append to `SCENARIOS` with the expected trigger types.
- New demand pattern: add to `RULES` or the lint in `heuristics.ts`, with a case in `heuristics.test.ts`.
- New API route: wrap it in `withApi`, call `requireUser`, and add it to the 401 table in `routes.test.ts`.
