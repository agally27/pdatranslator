# Privacy and security

PDA Companion handles information about children, some of which may be special category data under UK GDPR. This document describes how the software is designed to protect it, and what the operator still has to do. It is not legal advice.

## Data protection by design

| Principle | How the software applies it |
| --- | --- |
| Data minimisation | Every child profile field is optional. No surname, date of birth, address, school name, diagnosis or health record is requested, and the UI asks parents not to enter them. Server-side length limits apply to every field |
| Purpose limitation | Data is used only to provide translations, specialist replies and personalisation to the same user |
| Consent for sharing with AI | `share_profile_with_ai` defaults to **off**. Turning it on shows a disclosure naming what is sent, what is never sent and who processes it; the consent time is recorded; it can be withdrawn in Settings at any time |
| Pseudonymisation | The child's name is never sent to an AI provider. The request schema has no name field, `buildAiContext()` omits it, and prompts refer to "your child" |
| Three-category preferences | Only parent-confirmed preferences are used. Feedback-derived observations and AI suggestions are never promoted automatically |
| No audio retention | Recordings are held in memory for the transcription request and discarded. Nothing is written to disk, storage or logs |
| Storage limitation | History can be switched off; individual translations, conversations and profiles can be deleted |
| Access and portability | Settings → Download my data (JSON) |
| Erasure | Settings → Delete my account removes all rows and the login |
| No training on user content | The app does not use conversations or profiles to train shared models. The operator must also confirm their AI providers' data-use terms |
| Transparency | `/privacy` notice; Settings shows which external services are connected; demo content is labelled |

## Processors

| Service | Receives | When |
| --- | --- | --- |
| Supabase | Account, profiles, history, conversations | When Supabase is configured |
| Anthropic or OpenAI | The text submitted; the pseudonymised profile only with opt-in | When a live AI provider is configured |
| OpenAI | Audio for transcription | When `OPENAI_API_KEY` is set and voice input is used |
| Vercel | Hosting; technical logs without content | Always in production |

In demo mode none of these receive anything: data stays in the browser and responses come from the built-in engine.

## Security controls

**Authentication and authorisation**
- Supabase Auth; sessions in secure cookies refreshed by `proxy.ts`.
- Protected API routes verify the session server-side (`getUser()`), not just the cookie's presence.
- Row Level Security on every table with owner-only policies, plus triggers that block cross-user references. See DATABASE_SPEC.md.
- Sign-in errors do not reveal whether an email is registered; password reset always returns the same message.

**Secrets**
- AI keys and the service-role key are read only on the server. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser, and both are designed to be public.
- The service-role client is used in exactly one place (account deletion) plus the offline seeding script.
- `.env*` files are git-ignored; `.env.example` contains names only. Tests check that no client component references server credentials and that nothing secret is hardcoded.

**Input handling**
- Every request body is validated with Zod; bodies over 64 KB are rejected; audio is limited by size and type.
- User text is escaped and wrapped in data tags inside prompts, with an explicit instruction to treat it as content, to limit prompt injection.
- Model output is rendered as plain text by React; `dangerouslySetInnerHTML` is not used anywhere.
- All AI output is schema-validated before use.

**Abuse and availability**
- Per-user rate limits on all AI endpoints, with `Retry-After`.
- Timeouts on every provider call.
- Same-origin enforcement on state-changing routes, alongside SameSite cookies.

**Transport and browser**
- Headers set in `next.config.ts`: Content-Security-Policy (self + the Supabase origin only), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict Referrer-Policy, and a Permissions-Policy that allows only the microphone, for this origin.
- Pages are marked `noindex`.

**Logging**
- Structured logs contain route, status, duration, error codes and AI token counts. No user text, transcripts, profile content or model output. A test scans logger calls for this.

## Known limitations

- **Rate limiting is in-memory per server instance.** On serverless platforms it is a baseline, not a guarantee. Replace `RateLimitStore` with a shared store (for example Upstash Redis or Vercel KV) before real traffic.
- **CSP allows inline scripts and styles**, which Next.js needs without a nonce set-up. A nonce-based policy would be stricter.
- **Demo data mode with a live AI key has no authentication** in front of the AI endpoints (there are no accounts to check), so anyone who can reach the site can spend the key within the rate limit. Configure Supabase before exposing a live key publicly.
- **Demo mode stores data unencrypted in `localStorage`** on the device.
- **The Supabase and live-AI paths have not been exercised against real services** in this build (no credentials were available). They are covered by unit tests with mocked clients only.
- There is no multi-factor authentication, audit log or automated retention schedule yet.

## Operator checklist before launch

- [ ] Complete a Data Protection Impact Assessment.
- [ ] Record the lawful basis and the Article 9 condition (explicit consent is what the software is built around).
- [ ] Sign data processing agreements with Supabase, the AI provider(s) and Vercel; check hosting regions and international transfer terms.
- [ ] Confirm each AI provider's retention and training settings for API data.
- [ ] Fill in the data controller and contact details in `src/app/privacy/page.tsx` and have the notice legally reviewed.
- [ ] Enable email confirmation and review password policy in Supabase Auth.
- [ ] Replace the in-memory rate limiter; set spend limits on AI provider accounts.
- [ ] Decide a retention policy for inactive accounts.
- [ ] Set up a route for subject access requests and safeguarding concerns.
- [ ] Commission a security review or penetration test.

## Safeguarding

The specialist is told to put safety first and signpost UK help, and a deterministic screen adds signposting whenever a message suggests risk. This is a safety net, not a safeguarding service: the app does not monitor conversations or alert anyone. The operator should decide whether additional safeguarding procedures are required for their context.
