-- PDA Companion – initial schema
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ── Shared helpers ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles: one row per auth user ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── child_profiles ──────────────────────────────────────────────────────────
-- Every field is optional free text supplied by the parent. No diagnosis,
-- date of birth, surname, school name or health record is collected.
create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  preferred_name text not null default '' check (char_length(preferred_name) <= 60),
  age_range text not null default '' check (char_length(age_range) <= 40),
  communication_preferences text not null default '' check (char_length(communication_preferences) <= 600),
  preferred_communication_style text not null default '' check (char_length(preferred_communication_style) <= 300),
  sensory_sensitivities text not null default '' check (char_length(sensory_sensitivities) <= 600),
  interests text not null default '' check (char_length(interests) <= 300),
  anxiety_triggers text not null default '' check (char_length(anxiety_triggers) <= 600),
  transition_difficulties text not null default '' check (char_length(transition_difficulties) <= 600),
  responses_to_questions text not null default '' check (char_length(responses_to_questions) <= 600),
  responses_to_choices text not null default '' check (char_length(responses_to_choices) <= 600),
  effective_strategies text not null default '' check (char_length(effective_strategies) <= 600),
  approaches_that_dont_work text not null default '' check (char_length(approaches_that_dont_work) <= 600),
  notes text not null default '' check (char_length(notes) <= 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index child_profiles_user_idx on public.child_profiles (user_id, created_at);

-- ── user_settings ───────────────────────────────────────────────────────────
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_child_profile_id uuid references public.child_profiles (id) on delete set null,
  -- Explicit opt-in before any child profile detail is included in AI requests.
  share_profile_with_ai boolean not null default false,
  share_profile_consent_at timestamptz,
  save_history boolean not null default true,
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ── communication_preferences ───────────────────────────────────────────────
-- category: confirmed (parent) | observation (repeated feedback) | suggestion (AI, unconfirmed)
create table public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  key text not null check (key in (
    'prefers_descriptive', 'fewer_questions', 'humour_helps', 'choices_pressure', 'time_anxiety',
    'short_explanations', 'prefers_minimal', 'prefers_collaborative', 'reassurance_helps', 'custom')),
  statement text not null check (char_length(statement) between 1 and 240),
  category text not null check (category in ('confirmed', 'observation', 'suggestion')),
  source text not null check (source in ('parent', 'feedback', 'ai')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index communication_preferences_user_idx on public.communication_preferences (user_id, child_profile_id);

-- ── translations ────────────────────────────────────────────────────────────
create table public.translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete set null,
  original text not null check (char_length(original) between 1 and 1000),
  situation text not null default '' check (char_length(situation) <= 1500),
  input_method text not null default 'text' check (input_method in ('text', 'voice', 'situation')),
  -- Full structured result (intent, demand analysis, alternatives, validation, meta).
  result jsonb not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index translations_user_created_idx on public.translations (user_id, created_at desc);
create index translations_child_idx on public.translations (child_profile_id);

-- ── translation_feedback ────────────────────────────────────────────────────
create table public.translation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  translation_id uuid not null references public.translations (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete set null,
  alternative_id text not null check (char_length(alternative_id) <= 80),
  style text not null check (style in ('descriptive', 'collaborative', 'autonomy', 'playful', 'reassuring', 'minimal')),
  feedback text not null check (feedback in ('worked', 'didnt_work', 'still_demanding', 'too_complicated', 'not_appropriate')),
  created_at timestamptz not null default now(),
  unique (translation_id, alternative_id)
);
create index translation_feedback_user_idx on public.translation_feedback (user_id, created_at);

-- ── saved_translations (favourites) ─────────────────────────────────────────
create table public.saved_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  translation_id uuid not null references public.translations (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete set null,
  alternative_id text not null check (char_length(alternative_id) <= 80),
  style text not null check (style in ('descriptive', 'collaborative', 'autonomy', 'playful', 'reassuring', 'minimal')),
  text text not null check (char_length(text) between 1 and 1200),
  original text not null check (char_length(original) <= 1000),
  created_at timestamptz not null default now(),
  unique (translation_id, alternative_id)
);
create index saved_translations_user_idx on public.saved_translations (user_id, created_at desc);

-- ── conversations & messages (PDA Specialist) ───────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete set null,
  title text not null default 'New conversation' check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  sources jsonb not null default '[]'::jsonb,
  is_demo boolean not null default false,
  safety_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_user_idx on public.messages (user_id);

-- ── knowledge_articles (shared, read-only for users) ────────────────────────
create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  title text not null,
  summary text not null,
  content jsonb not null default '[]'::jsonb,
  practical_examples jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  evidence text not null check (evidence in ('organisation_guidance', 'peer_reviewed', 'lived_experience', 'general_guidance', 'placeholder')),
  review_date date not null,
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('published', 'placeholder', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_articles_category_idx on public.knowledge_articles (category);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger child_profiles_updated_at before update on public.child_profiles for each row execute function public.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
create trigger communication_preferences_updated_at before update on public.communication_preferences for each row execute function public.set_updated_at();
create trigger knowledge_articles_updated_at before update on public.knowledge_articles for each row execute function public.set_updated_at();

-- ── Create profile + settings rows for every new auth user ──────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80))
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
