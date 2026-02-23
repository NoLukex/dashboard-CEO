-- Optional schema extensions for Executive Command Center
-- Run this in Supabase SQL Editor if these objects do not exist yet.

create extension if not exists pgcrypto;

create table if not exists public.app_user_links (
  auth_uid uuid primary key,
  app_user_id bigint not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_user_links_user on public.app_user_links (app_user_id);

create or replace function public.current_app_user_id()
returns bigint
language sql
stable
as $$
  select app_user_id
  from public.app_user_links
  where auth_uid = auth.uid()
  limit 1
$$;

alter table if exists public.task_items
  add column if not exists priority text not null default 'medium'
  check (priority in ('high', 'medium', 'low'));

alter table if exists public.task_items
  add column if not exists project_id uuid;

create index if not exists idx_task_items_user_status_due on public.task_items (user_id, status, due_date);
create index if not exists idx_task_items_user_priority_due on public.task_items (user_id, priority, due_date);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null,
  name text not null,
  status text not null default 'active',
  deadline date,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_user_status on public.projects (user_id, status, created_at desc);

create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  status text not null default 'on_track',
  progress int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_outcomes_project on public.outcomes (project_id, created_at desc);

create table if not exists public.bot_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id bigint,
  category text,
  title text,
  content text,
  tags text,
  source text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id bigint,
  content text not null,
  category text not null default 'Inbox',
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null,
  category text not null,
  raw_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id bigint primary key,
  think_level text not null default 'medium'
    check (think_level in ('off', 'low', 'medium', 'high')),
  dashboard_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.user_preferences
  add column if not exists dashboard_prefs jsonb not null default '{}'::jsonb;

create index if not exists idx_bot_knowledge_updated on public.bot_knowledge (updated_at desc);
create index if not exists idx_events_user_created on public.events (user_id, created_at desc);
create index if not exists idx_life_events_user_created on public.life_events (user_id, created_at desc);
create index if not exists idx_user_preferences_updated_at on public.user_preferences (updated_at desc);

alter table if exists public.daily_reviews
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_daily_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_reviews_updated_at on public.daily_reviews;
create trigger trg_daily_reviews_updated_at
before update on public.daily_reviews
for each row
execute function public.touch_daily_reviews_updated_at();

create or replace function public.touch_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.touch_user_preferences_updated_at();

-- Recommended RLS baseline
alter table if exists public.app_user_links enable row level security;
alter table if exists public.task_items enable row level security;
alter table if exists public.habit_definitions enable row level security;
alter table if exists public.habit_completions enable row level security;
alter table if exists public.daily_reviews enable row level security;
alter table if exists public.projects enable row level security;
alter table if exists public.outcomes enable row level security;
alter table if exists public.bot_knowledge enable row level security;
alter table if exists public.events enable row level security;
alter table if exists public.life_events enable row level security;
alter table if exists public.user_preferences enable row level security;

drop policy if exists app_user_links_select_own on public.app_user_links;
create policy app_user_links_select_own
on public.app_user_links
for select
to authenticated
using (auth_uid = auth.uid());

drop policy if exists task_items_select_own on public.task_items;
create policy task_items_select_own
on public.task_items
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists task_items_insert_own on public.task_items;
create policy task_items_insert_own
on public.task_items
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists task_items_update_own on public.task_items;
create policy task_items_update_own
on public.task_items
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists task_items_delete_own on public.task_items;
create policy task_items_delete_own
on public.task_items
for delete
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists habit_definitions_select_own on public.habit_definitions;
create policy habit_definitions_select_own
on public.habit_definitions
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists habit_definitions_insert_own on public.habit_definitions;
create policy habit_definitions_insert_own
on public.habit_definitions
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists habit_definitions_update_own on public.habit_definitions;
create policy habit_definitions_update_own
on public.habit_definitions
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists habit_completions_select_own on public.habit_completions;
create policy habit_completions_select_own
on public.habit_completions
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists habit_completions_insert_own on public.habit_completions;
create policy habit_completions_insert_own
on public.habit_completions
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists habit_completions_update_own on public.habit_completions;
create policy habit_completions_update_own
on public.habit_completions
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists habit_completions_delete_own on public.habit_completions;
create policy habit_completions_delete_own
on public.habit_completions
for delete
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists daily_reviews_select_own on public.daily_reviews;
create policy daily_reviews_select_own
on public.daily_reviews
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists daily_reviews_insert_own on public.daily_reviews;
create policy daily_reviews_insert_own
on public.daily_reviews
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists daily_reviews_update_own on public.daily_reviews;
create policy daily_reviews_update_own
on public.daily_reviews
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own
on public.projects
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own
on public.projects
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own
on public.projects
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists outcomes_select_via_project on public.outcomes;
create policy outcomes_select_via_project
on public.outcomes
for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = outcomes.project_id
      and p.user_id = public.current_app_user_id()
  )
);

drop policy if exists outcomes_insert_via_project on public.outcomes;
create policy outcomes_insert_via_project
on public.outcomes
for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = outcomes.project_id
      and p.user_id = public.current_app_user_id()
  )
);

drop policy if exists outcomes_update_via_project on public.outcomes;
create policy outcomes_update_via_project
on public.outcomes
for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = outcomes.project_id
      and p.user_id = public.current_app_user_id()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = outcomes.project_id
      and p.user_id = public.current_app_user_id()
  )
);

drop policy if exists bot_knowledge_select_own_or_shared on public.bot_knowledge;
create policy bot_knowledge_select_own_or_shared
on public.bot_knowledge
for select
to authenticated
using (user_id is null or user_id = public.current_app_user_id());

drop policy if exists bot_knowledge_insert_own on public.bot_knowledge;
create policy bot_knowledge_insert_own
on public.bot_knowledge
for insert
to authenticated
with check (user_id is null or user_id = public.current_app_user_id());

drop policy if exists bot_knowledge_update_own on public.bot_knowledge;
create policy bot_knowledge_update_own
on public.bot_knowledge
for update
to authenticated
using (user_id is null or user_id = public.current_app_user_id())
with check (user_id is null or user_id = public.current_app_user_id());

drop policy if exists events_select_own on public.events;
create policy events_select_own
on public.events
for select
to authenticated
using (user_id is null or user_id = public.current_app_user_id());

drop policy if exists events_insert_own on public.events;
create policy events_insert_own
on public.events
for insert
to authenticated
with check (user_id is null or user_id = public.current_app_user_id());

drop policy if exists life_events_select_own on public.life_events;
create policy life_events_select_own
on public.life_events
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists life_events_insert_own on public.life_events;
create policy life_events_insert_own
on public.life_events
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own
on public.user_preferences
for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
on public.user_preferences
for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
on public.user_preferences
for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());
