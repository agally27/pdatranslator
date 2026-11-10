# Deployment guide (Vercel + Supabase)

Nothing in this repository deploys itself. Follow these steps when you are ready.

## 1. Supabase

See ENVIRONMENT_SETUP.md → "Supabase step by step": create the project, apply the three migrations, configure auth redirect URLs.

## 2. Vercel

1. **Add New → Project**, import the GitHub repository. The framework is detected as Next.js; keep the default build command (`next build`) and output settings. Node.js 20 or 22.
2. Add environment variables (Production, and Preview if you want previews to use live services):
   `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus any optional ones.
3. Deploy.
4. Add your production domain to Supabase's redirect URLs (`https://<domain>/auth/callback`) and set it as the Site URL.

## 3. Verify

- `https://<domain>/api/health` returns `"status":"ok"` with `"dataMode":"supabase"` and `"aiLive":true`.
- Create an account, confirm the email, sign in.
- Run one translation and one specialist message. Results should be badged **AI-generated**, not **Demo response**.
- Try voice input on a phone (HTTPS is required for the microphone).
- In Supabase, confirm rows appear in `translations` with your `user_id`, and that a second test account cannot see them.
- Settings → Download my data, then Delete my account; confirm the auth user is gone.

## Function duration

A live translation makes four or more model calls. The routes declare `maxDuration` (120 s for `/api/translate`, 60 s for the others). If your Vercel plan has a lower limit, either reduce latency (`AI_MODEL=claude-sonnet-5-5` or `claude-haiku-5-5`, `AI_EFFORT=low`) or raise the plan limit. Watch real timings in the logs (`ai.usage` events include `durationMs` per task).

## Production configuration already in place

- Security headers and CSP (`next.config.ts`); `X-Powered-By` removed.
- `Cache-Control: no-store` on all API responses.
- Structured JSON logs without user content; `LOG_LEVEL` to tune.
- Health-check endpoint.
- Friendly error pages (`error.tsx`, `not-found.tsx`).
- Pages set `noindex` – remove from `src/app/layout.tsx` metadata if you want the landing page indexed.

## Before real users

Work through the operator checklist in PRIVACY_AND_SECURITY.md. In particular:

- Replace the in-memory rate limiter with a shared store.
- Set spending limits and alerts on your AI provider accounts.
- Have the Knowledge Hub references verified and the privacy notice completed.
- Add error monitoring (for example Sentry) and uptime monitoring on `/api/health`.

## Rolling back

Vercel keeps every deployment: **Deployments → … → Promote to Production** on a previous build. Database migrations are additive; there are no down-migrations, so take a Supabase backup before applying future schema changes.

## Running elsewhere

The app is a standard Next.js server: `npm run build && npm run start` on any Node 20+ host behind HTTPS, with the same environment variables.
