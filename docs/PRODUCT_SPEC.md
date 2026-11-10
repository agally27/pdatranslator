# Product specification

## Vision

PDA Companion helps parents and carers of autistic children with a PDA profile communicate in ways that reduce unnecessary perceived demands, support autonomy, improve understanding and preserve connection. It is a standalone, mobile-first web application. It is deliberately not a general chatbot: everything in it is built around PDA-informed communication.

**Tagline:** Communication. Understanding. Connection.
**Audience:** parents and carers.

## Principles

1. Preserve the adult's real intention; change how it is communicated.
2. Reduce pressure genuinely – never disguise a demand.
3. Keep genuine safety boundaries.
4. Never promise an outcome or claim clinical validity.
5. Collect as little as possible about children; the parent controls what is shared.
6. Calm, fast and usable one-handed on a phone in a difficult moment.

## Navigation

| Page | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/dashboard` | Welcome, quick actions, daily message, recent and saved translations, selected profile, tips |
| PDA Translator | `/translator` | Core feature |
| PDA Specialist | `/specialist` | Conversational assistant |
| My Child Profiles | `/profiles` | Profiles and communication preferences |
| Translation History | `/history` | Search, filter, reopen, reuse, favourites |
| PDA Knowledge Hub | `/knowledge`, `/knowledge/[slug]` | Curated articles |
| Settings | `/settings` | Privacy choices, service status, export, deletion |
| Public | `/`, `/login`, `/privacy` | Landing, sign in / demo, privacy notice |

Desktop uses a fixed sidebar; mobile uses a bottom tab bar (Home, Translator, Specialist, History, More). The selected child profile can be changed from the header on every page.

## PDA Translator

**Input** – three methods:

- *Text*: type or paste (up to 1,000 characters), with optional context.
- *Voice*: record in the browser → transcription → **editable transcript** → translate. Handles permission denial, missing microphone, unsupported browsers, empty recordings and a 90-second limit. Recordings are never stored.
- *Situation*: describe what is happening, optionally with what you would normally say.

**Workflow** (see AI_FOUNDATION.md): intent analysis → demand analysis → context → generation of six approaches → validation → regeneration of failures.

**Results**

- Demand analysis: low / moderate / high *potential* demand, reasoning, and each trigger with the quoted phrase. Labelled as an assessment of wording, not a clinical measure.
- Safety note where a real safety boundary is involved.
- Six cards, each with approach, wording, short explanation, validation status, **Copy**, **Save**, **Feedback** and **Adjust**.
- Adjust: make it shorter, more natural, more playful, less demanding, remove questions, explain why, generate another alternative. **Try again** regenerates the whole set.
- Feedback: this worked, this didn't work, still feels demanding, too complicated, not appropriate for my child.
- An overall explanation of how the alternatives differ from the original.
- An alternative that still fails validation after regeneration is shown with a visible "use your judgement" note listing what failed, rather than being hidden or presented as fine.

## PDA Specialist

A warm, practical assistant covering understanding PDA, demand avoidance, anxiety, autonomy, sensory processing, regulation, transitions, sleep, eating, personal care, school, leaving the house, communication, family relationships and parent wellbeing.

- Six conversation starters; persistent conversations (new, rename, delete).
- Retrieves from the knowledge base for every message and shows the articles it drew on.
- Uses the child profile only when the parent has opted in.
- At most one gentle question per reply; no lists of questions.
- A deterministic safety screen adds UK signposting (999, NHS 111, Samaritans) whenever a message suggests risk, regardless of what the model returns.
- Never presents itself as a clinician; distinguishes sourced guidance from suggestions.

## Child profiles

Multiple profiles; every field optional: preferred name, age or range, communication preferences, preferred style, sensory sensitivities, interests, anxiety triggers, transition difficulties, responses to questions, responses to choices, effective strategies, approaches that do not work, notes. Create, edit, delete.

**Three categories of preference, never mixed**

| Category | Origin | Used by AI? |
| --- | --- | --- |
| Confirmed by you | Entered or confirmed by the parent | Yes (if personalisation is on) |
| Noticed in your feedback | Same feedback signal seen at least twice | No, until confirmed |
| Suggestions to consider | A single feedback signal | No, until confirmed |

Parents can confirm, edit or remove any item. Nothing is ever promoted to "confirmed" automatically. The app does not diagnose or infer conditions.

## Personalisation

Feedback on alternatives is mapped to insights (for example "humour can be helpful", "choices can sometimes increase pressure", "longer explanations can be overwhelming"). Confirmed preferences change generation: preferred approaches are listed first, either/or choices are avoided, questions are removed, wording is shortened, interests feed playful ideas. Each result lists what personalisation was applied.

## History

Original sentence, alternatives, date and time, child profile, situation, saved status and feedback. Search (including within alternatives), filter by profile, demand level, saved and feedback; reopen in the translator, reuse the wording, copy, save, delete. A favourites tab lists saved alternatives. History can be switched off.

## Knowledge Hub

Eleven categories. Each article has a title, summary, content, practical examples, sources, review date and an **evidence classification** (organisation guidance, peer-reviewed research, lived experience, general guidance, or research pending). Topics not yet researched are explicit placeholders.

## Demo mode

Fully usable without credentials: local demo session, example profile, example translations and conversation, rule-based translation, demand analysis and specialist replies. Demo content is labelled everywhere it appears, and Settings shows which services are connected.

## Accessibility and design

Mobile-first; sage, cream and soft grey palette; rounded cards; system serif headings. Large touch targets, visible focus, skip link, labelled controls, live regions for loading and errors, AA-oriented contrast, `prefers-reduced-motion` plus an in-app toggle. Tested at 375, 390, 768, 1280 and 1440 px.
