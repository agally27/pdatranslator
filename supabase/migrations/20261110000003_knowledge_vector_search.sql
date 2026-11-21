-- PDA Companion – optional semantic search for the knowledge base (pgvector).
-- Safe to run on any Supabase project; only used when KNOWLEDGE_RETRIEVAL=vector.

create extension if not exists vector with schema extensions;

alter table public.knowledge_articles
  add column if not exists embedding extensions.vector(1536);

create index if not exists knowledge_articles_embedding_idx
  on public.knowledge_articles using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_knowledge_articles(
  query_embedding extensions.vector(1536),
  match_count integer default 3
)
returns table (slug text, title text, similarity double precision)
language sql
stable
set search_path = ''
as $$
  select a.slug, a.title, 1 - (a.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.knowledge_articles a
  where a.status = 'published' and a.embedding is not null
  order by a.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 10);
$$;

grant execute on function public.match_knowledge_articles(extensions.vector, integer) to anon, authenticated;
