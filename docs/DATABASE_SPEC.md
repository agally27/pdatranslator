# Database specification

PostgreSQL on Supabase. Migrations live in `supabase/migrations/` and are applied in filename order.

| File | Contents |
| --- | --- |
| `20261110000001_initial_schema.sql` | Tables, constraints, indexes, `updated_at` triggers, new-user trigger |
| `20261110000002_row_level_security.sql` | RLS on every table, owner-only policies, cross-ownership guard |
| `20261110000003_knowledge_vector_search.sql` | pgvector column, HNSW index, `match_knowledge_articles()` |

## Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | One row per auth user | `id` (= `auth.users.id`), `display_name` |
| `user_settings` | Preferences and privacy choices | `user_id` PK, `selected_child_profile_id`, `share_profile_with_ai` (default **false**), `share_profile_consent_at`, `save_history`, `reduce_motion` |
| `child_profiles` | Optional child details | `user_id`, 13 optional text fields, each length-limited |
| `communication_preferences` | Preferences in three categories | `child_profile_id`, `key`, `statement`, `category` (`confirmed` \| `observation` \| `suggestion`), `source` (`parent` \| `feedback` \| `ai`), `evidence_count` |
| `translations` | History | `original`, `situation`, `input_method`, `result` (jsonb – full structured result), `is_demo` |
| `translation_feedback` | Feedback per alternative | `translation_id`, `alternative_id`, `style`, `feedback`; unique per alternative |
| `saved_translations` | Favourites | `translation_id`, `alternative_id`, `style`, `text`, `original`; unique per alternative |
| `conversations` | Specialist conversations | `title`, `child_profile_id` |
| `messages` | Conversation messages | `conversation_id`, `role`, `content`, `sources` (jsonb), `is_demo`, `safety_flag` |
| `knowledge_articles` | Shared reference content | `slug`, `category`, `content`, `sources`, `evidence`, `review_date`, `status`, `embedding` |

All tables have `created_at`; mutable tables have `updated_at` maintained by trigger.

## Relationships and deletion

```
auth.users ─┬─ profiles (cascade)
            ├─ user_settings (cascade) ── selected_child_profile_id → child_profiles (set null)
            ├─ child_profiles (cascade)
            │     └─ communication_preferences (cascade)
            ├─ translations (cascade) ── child_profile_id (set null)
            │     ├─ translation_feedback (cascade)
            │     └─ saved_translations (cascade)
            └─ conversations (cascade) ── child_profile_id (set null)
                  └─ messages (cascade)
```

- Deleting the auth user removes everything they own (this is how account deletion works).
- Deleting a child profile removes its preferences but keeps history, unlinked.
- Deleting a translation removes its feedback and favourites.

## Constraints

Check constraints enforce enumerations (style, feedback type, category, source, input method, evidence class) and maximum lengths on every free-text column, so limits hold even if a client bypasses the UI.

## Row Level Security

RLS is enabled on every table.

- **Personal tables** (all except `knowledge_articles`): four policies each – select, insert, update, delete – granted `to authenticated` only, with `(select auth.uid()) = user_id` (or `= id` for `profiles`). There are no policies for `anon`, so unauthenticated requests see nothing.
- **`knowledge_articles`:** one select policy for published and placeholder rows. There are no write policies; only the service role (seeding script) can write.
- **Cross-ownership guard:** `assert_same_owner()` triggers reject any row that references a child profile, translation or conversation belonging to a different user. RLS alone would not stop a user pointing their own row at someone else's id.
- Functions use `set search_path = ''`; trigger functions are not executable by API roles.

A test (`tests/unit/specialist-security.test.ts`) statically checks that every required table exists, has RLS enabled, has exactly the four owner-only policies, and cascades from `auth.users`.

## New users

`handle_new_user()` runs after insert on `auth.users` and creates the `profiles` and `user_settings` rows. The client also upserts them on first read as a fallback.

## Indexes

Per-user listing indexes on every personal table (`user_id` with the sort column), `messages (conversation_id, created_at)`, and an HNSW cosine index on `knowledge_articles.embedding`.

## Storage

Supabase Storage is not used. Voice recordings are never persisted, and the app has no file uploads.

## Mapping to the application

`SupabaseDataClient` converts top-level keys between camelCase and snake_case; jsonb columns (`result`, `sources`) are stored as produced. IDs are UUIDs generated client-side so the local and Supabase clients behave identically.
