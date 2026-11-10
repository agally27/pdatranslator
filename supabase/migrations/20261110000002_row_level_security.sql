-- PDA Companion – Row Level Security
-- Every personal table is locked to its owner. There are no policies for the
-- `anon` role on personal tables, so unauthenticated requests see nothing.

alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.translations enable row level security;
alter table public.translation_feedback enable row level security;
alter table public.saved_translations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_articles enable row level security;

-- profiles (keyed by id)
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- child_profiles
create policy "child_profiles_select_own" on public.child_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "child_profiles_insert_own" on public.child_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "child_profiles_update_own" on public.child_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "child_profiles_delete_own" on public.child_profiles for delete to authenticated using ((select auth.uid()) = user_id);

-- user_settings
create policy "user_settings_select_own" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings_update_own" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_settings_delete_own" on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);

-- communication_preferences
create policy "communication_preferences_select_own" on public.communication_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "communication_preferences_insert_own" on public.communication_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "communication_preferences_update_own" on public.communication_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "communication_preferences_delete_own" on public.communication_preferences for delete to authenticated using ((select auth.uid()) = user_id);

-- translations
create policy "translations_select_own" on public.translations for select to authenticated using ((select auth.uid()) = user_id);
create policy "translations_insert_own" on public.translations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "translations_update_own" on public.translations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "translations_delete_own" on public.translations for delete to authenticated using ((select auth.uid()) = user_id);

-- translation_feedback
create policy "translation_feedback_select_own" on public.translation_feedback for select to authenticated using ((select auth.uid()) = user_id);
create policy "translation_feedback_insert_own" on public.translation_feedback for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "translation_feedback_update_own" on public.translation_feedback for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "translation_feedback_delete_own" on public.translation_feedback for delete to authenticated using ((select auth.uid()) = user_id);

-- saved_translations
create policy "saved_translations_select_own" on public.saved_translations for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_translations_insert_own" on public.saved_translations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_translations_update_own" on public.saved_translations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saved_translations_delete_own" on public.saved_translations for delete to authenticated using ((select auth.uid()) = user_id);

-- conversations
create policy "conversations_select_own" on public.conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "conversations_insert_own" on public.conversations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "conversations_update_own" on public.conversations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations_delete_own" on public.conversations for delete to authenticated using ((select auth.uid()) = user_id);

-- messages
create policy "messages_select_own" on public.messages for select to authenticated using ((select auth.uid()) = user_id);
create policy "messages_insert_own" on public.messages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "messages_update_own" on public.messages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "messages_delete_own" on public.messages for delete to authenticated using ((select auth.uid()) = user_id);

-- knowledge_articles: shared reference content. Anyone may read published or
-- placeholder rows; nobody can write through the API (the service role, which
-- bypasses RLS, is used by the seeding script).
create policy "knowledge_articles_read_published" on public.knowledge_articles
  for select to anon, authenticated using (status in ('published', 'placeholder'));

-- Cross-ownership guards: a row may only reference a child profile,
-- translation or conversation that belongs to the same user.
create or replace function public.assert_same_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  row_data jsonb := to_jsonb(new);
begin
  if row_data ? 'child_profile_id' and (row_data ->> 'child_profile_id') is not null then
    select user_id into owner from public.child_profiles where id = (row_data ->> 'child_profile_id')::uuid;
    if owner is distinct from new.user_id then raise exception 'child profile does not belong to this user'; end if;
  end if;
  if row_data ? 'selected_child_profile_id' and (row_data ->> 'selected_child_profile_id') is not null then
    select user_id into owner from public.child_profiles where id = (row_data ->> 'selected_child_profile_id')::uuid;
    if owner is distinct from new.user_id then raise exception 'child profile does not belong to this user'; end if;
  end if;
  if row_data ? 'translation_id' then
    select user_id into owner from public.translations where id = (row_data ->> 'translation_id')::uuid;
    if owner is distinct from new.user_id then raise exception 'translation does not belong to this user'; end if;
  end if;
  if row_data ? 'conversation_id' then
    select user_id into owner from public.conversations where id = (row_data ->> 'conversation_id')::uuid;
    if owner is distinct from new.user_id then raise exception 'conversation does not belong to this user'; end if;
  end if;
  return new;
end;
$$;

create trigger user_settings_same_owner before insert or update on public.user_settings for each row execute function public.assert_same_owner();
create trigger communication_preferences_same_owner before insert or update on public.communication_preferences for each row execute function public.assert_same_owner();
create trigger translations_same_owner before insert or update on public.translations for each row execute function public.assert_same_owner();
create trigger translation_feedback_same_owner before insert or update on public.translation_feedback for each row execute function public.assert_same_owner();
create trigger saved_translations_same_owner before insert or update on public.saved_translations for each row execute function public.assert_same_owner();
create trigger conversations_same_owner before insert or update on public.conversations for each row execute function public.assert_same_owner();
create trigger messages_same_owner before insert or update on public.messages for each row execute function public.assert_same_owner();

revoke execute on function public.assert_same_owner() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
