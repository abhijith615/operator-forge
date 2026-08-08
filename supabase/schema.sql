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

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 — mission runs
-- One row per shift. The browser holds live state; this is the durable record
-- Phase 3 reads to build the Operator Genome.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.mission_runs (
  id            text primary key,
  operator_id   uuid        not null references public.operators (id) on delete cascade,
  mission_id    text        not null default 'first-shift',
  status        text        not null check (status in ('briefing','live','complete','abandoned')),
  started_at    timestamptz not null,
  completed_at  timestamptz,
  world         jsonb       not null default '{}'::jsonb,
  timeline      jsonb       not null default '[]'::jsonb,
  conversations jsonb       not null default '{}'::jsonb,
  -- The task queue and, more importantly, every decision made against it.
  -- `decisions` is what Phase 3 scores: option quality, capability tags,
  -- time-to-decide and the queue depth at the moment of the call.
  tasks         jsonb       not null default '[]'::jsonb,
  decisions     jsonb       not null default '[]'::jsonb,
  achievements  jsonb       not null default '[]'::jsonb,
  -- Phase 3. `telemetry` is the invisible record: navigation, dwell, prompts,
  -- glossary lookups. `traces` is the sampled floor state that drives the
  -- replay. `rating` is written only at handover and is what the cohort ranks.
  telemetry     jsonb       not null default '[]'::jsonb,
  traces        jsonb       not null default '[]'::jsonb,
  rating        integer,
  updated_at    timestamptz not null default now()
);

comment on table public.mission_runs is
  'A single shift: final world state, the full timeline, and every conversation.';

create index if not exists mission_runs_operator_idx
  on public.mission_runs (operator_id, started_at desc);

alter table public.mission_runs enable row level security;

drop policy if exists "runs_select_own" on public.mission_runs;
create policy "runs_select_own"
  on public.mission_runs for select
  using (auth.uid() = operator_id);

drop policy if exists "runs_insert_own" on public.mission_runs;
create policy "runs_insert_own"
  on public.mission_runs for insert
  with check (auth.uid() = operator_id);

drop policy if exists "runs_update_own" on public.mission_runs;
create policy "runs_update_own"
  on public.mission_runs for update
  using (auth.uid() = operator_id)
  with check (auth.uid() = operator_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Cohort ranking
--
-- Row level security means an operator can only read their own runs, which is
-- correct — and it makes ranking impossible from the client, because a rank
-- needs to know about everyone else's ratings.
--
-- This function runs as its owner, so it can count across every run, but it
-- returns two integers and nothing else. No operator ever sees another
-- operator's row, rating or identity.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.mission_cohort_standing(
  p_mission text,
  p_rating  integer
)
returns table (cohort_rank integer, cohort_total integer)
language sql
security definer
set search_path = public
stable
as $$
  with completed as (
    select rating
    from public.mission_runs
    where mission_id = p_mission
      and status = 'complete'
      and rating is not null
  )
  select
    ((select count(*) from completed where rating > p_rating) + 1)::integer,
    (select count(*) from completed)::integer;
$$;

comment on function public.mission_cohort_standing is
  'Rank and cohort size for a rating. Security definer so it can see across '
  'operators; returns only aggregates.';

-- `anon` must be revoked by name. Supabase's default privileges grant execute
-- on new functions to anon, authenticated and service_role explicitly, and
-- revoking from PUBLIC does not touch a grant made to a named role — so the
-- revoke below is the only thing standing between a signed-out visitor and a
-- probe of the rating distribution.
revoke all on function public.mission_cohort_standing(text, integer) from public;
revoke all on function public.mission_cohort_standing(text, integer) from anon;
grant execute on function public.mission_cohort_standing(text, integer) to authenticated;

-- ── Keep updated_at honest ────────────────────────────────────────────────
-- `search_path = ''` pins name resolution at definition time. Without it the
-- function resolves names against whatever search_path the calling session
-- happens to have, which is a foothold for shadowing a referenced object. The
-- body only calls now(), which lives in pg_catalog and is always searched, so
-- an empty path costs nothing here.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
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

drop trigger if exists mission_runs_touch_updated_at on public.mission_runs;
create trigger mission_runs_touch_updated_at
  before update on public.mission_runs
  for each row execute function public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Interest signals
--
-- "Would you want this if it existed." Nothing here is a purchase and nothing
-- here is a promise — the 1:1 sessions the genome mentions are not built, not
-- priced and not staffed. This table only records that somebody said yes.
--
-- One row per operator per topic, so a second submission updates rather than
-- accumulating duplicates.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.interest_signals (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid        not null references public.operators (id) on delete cascade,
  topic       text        not null,
  email       text        not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (operator_id, topic)
);

comment on table public.interest_signals is
  'Waitlist interest. Not an order, not a payment, not a commitment either way.';

alter table public.interest_signals enable row level security;

drop policy if exists "signals_select_own" on public.interest_signals;
create policy "signals_select_own"
  on public.interest_signals for select
  using (auth.uid() = operator_id);

drop policy if exists "signals_insert_own" on public.interest_signals;
create policy "signals_insert_own"
  on public.interest_signals for insert
  with check (auth.uid() = operator_id);

drop policy if exists "signals_update_own" on public.interest_signals;
create policy "signals_update_own"
  on public.interest_signals for update
  using (auth.uid() = operator_id)
  with check (auth.uid() = operator_id);
