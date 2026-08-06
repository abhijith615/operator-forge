-- ═══════════════════════════════════════════════════════════════════════════
-- OPERATOR FORGE — Phase 1 schema
-- Run in the Supabase SQL editor, or `supabase db push`.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.operators (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text        not null,
  full_name   text,
  whatsapp    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.operators is
  'Operator profile. One row per authenticated user; created on onboarding.';

-- ── Row level security: an operator sees and writes only their own row ────
alter table public.operators enable row level security;

drop policy if exists "operators_select_own" on public.operators;
create policy "operators_select_own"
  on public.operators for select
  using (auth.uid() = id);

drop policy if exists "operators_insert_own" on public.operators;
create policy "operators_insert_own"
  on public.operators for insert
  with check (auth.uid() = id);

drop policy if exists "operators_update_own" on public.operators;
create policy "operators_update_own"
  on public.operators for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Keep updated_at honest ────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operators_touch_updated_at on public.operators;
create trigger operators_touch_updated_at
  before update on public.operators
  for each row execute function public.touch_updated_at();
