-- Execute once in the dedicated Khedmti project's SQL Editor.
-- No service key is required by the browser app.
create table if not exists public.khedmti_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"clients":[],"jobs":[],"payments":[],"company":"Mon entreprise","phone":""}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint workspace_shape check (jsonb_typeof(payload) = 'object' and jsonb_typeof(payload->'clients') = 'array' and jsonb_typeof(payload->'jobs') = 'array')
);
alter table public.khedmti_workspaces enable row level security;
revoke all on public.khedmti_workspaces from anon;
grant select, insert, update, delete on public.khedmti_workspaces to authenticated;
create policy "Read own workspace" on public.khedmti_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own workspace" on public.khedmti_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own workspace" on public.khedmti_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own workspace" on public.khedmti_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
