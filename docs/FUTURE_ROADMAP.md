# Future roadmap and known limitations

## Needs doing before a public launch

These are outside what could be completed without credentials or human review.

1. **Exercise the live paths.** Apply the migrations to a real Supabase project and test sign-up, RLS isolation between two accounts, export and deletion. Run real translations and specialist conversations with Anthropic and/or OpenAI, and real transcription. None of these have been run against live services.
2. **Evaluate live model quality** with the scenario set and human review (TESTING_GUIDE.md → Live evaluation). Tune prompts, effort and model for quality and latency.
3. **Verify the Knowledge Hub.** Check every reference and link, and have the content reviewed by someone with PDA expertise. Replace the three placeholders (sleep, eating and drinking, personal care).
4. **Legal and privacy work.** DPIA, processor agreements, controller details in the privacy notice, terms of use.
5. **Shared rate limiting and spend controls.**
6. **Device testing.** Microphone flow on iOS Safari and Android Chrome; a screen-reader pass (VoiceOver, TalkBack, NVDA).
7. **Monitoring.** Error tracking and uptime checks.

## Known limitations

- **Latency in live mode.** The translation workflow makes at least four model calls. Expect several seconds; use a faster model or lower effort if needed. Responses are not streamed.
- **Demo engine coverage.** Unrecognised sentences get generic wording, and example sentences may mention everyday details that are not true for the family.
- **Demand detection heuristics are English-only** and tuned for British usage.
- **Personalisation rules are simple.** Insights come from a fixed mapping of (approach, feedback) pairs. A removed suggestion can reappear after further matching feedback.
- **One parent per account.** No sharing between co-parents or carers.
- **Demo data lives in one browser** and is lost if site data is cleared.
- **No offline support.**
- **Specialist conversations send up to the last 20 messages**; very long conversations lose early context.
- **Refined alternatives replace the previous wording** without an undo.

## Next

**Product**
- Streaming responses and progressive display of alternatives as they pass validation.
- Text-to-speech for alternatives, so tone can be heard.
- "Phrase book" collections and printable cards from favourites.
- Shared access for co-parents and carers, with per-person permissions.
- Scenario-based practice ("how might I say this?") and reflective prompts after hard days.
- School-facing export: a one-page communication profile.
- Welsh and other languages.

**Intelligence**
- Use what worked for a child as few-shot examples in generation (with consent).
- Let the specialist propose a profile suggestion in conversation, which the parent can confirm.
- Time-aware insights (for example mornings vs evenings).
- A continuously run live evaluation with human-rated samples.

**Knowledge**
- Complete the placeholder topics; add lived-experience contributions with permission.
- Editorial workflow in the database (draft → reviewed → published) with reviewer and review date.
- Chunk-level retrieval with quoted passages and inline citations.

**Platform**
- Installable PWA; passkeys and multi-factor authentication.
- Nonce-based CSP.
- Retention schedules and an audit log for data access.
- Supabase integration tests in CI against a local stack (`supabase start`), including RLS tests with two users.
- Playwright tests in CI across browsers.
