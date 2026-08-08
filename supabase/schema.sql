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

-- ═══════════════════════════════════════════════════════════════════════════
-- Admin
--
-- Everything above is scoped to auth.uid() by row level security, which is
-- correct and which makes an admin view impossible from the client — reading
-- other operators means reading rows the caller must not read.
--
-- The usual answer is the service_role key. It is not used here: it bypasses
-- row level security everywhere, permanently, and one leak exposes every
-- operator's runs, conversations and telemetry. These functions run as their
-- owner instead, check the caller against a table first, and return only the
-- columns the panel actually shows. Granting admin is one insert; revoking it
-- is one delete; no key exists that could bypass anything.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Who may read the admin panel. Rows are added by hand — there is deliberately no UI for granting this.';

alter table public.admins enable row level security;
-- No policies on purpose. Nothing reads this through the API; only the
-- security definer functions below, which run as the owner and ignore RLS.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

comment on function public.is_admin is
  'True when the signed-in caller is listed in admins. Matched on the JWT email, not a client-supplied value.';

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

/* ── Headline counts ──────────────────────────────────────────────────── */

create or replace function public.admin_summary()
returns table (
  total_operators  integer,
  operators_today  integer,
  operators_7d     integer,
  onboarded        integer,
  runs_started     integer,
  runs_completed   integer,
  runs_dropped     integer,
  waitlist_count   integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.operators)::integer,
    (select count(*) from public.operators
      where created_at >= date_trunc('day', now()))::integer,
    (select count(*) from public.operators
      where created_at >= now() - interval '7 days')::integer,
    (select count(*) from public.operators
      where full_name is not null and whatsapp is not null)::integer,
    (select count(*) from public.mission_runs)::integer,
    (select count(*) from public.mission_runs where status = 'complete')::integer,
    (select count(*) from public.mission_runs
      where status in ('live', 'briefing', 'abandoned'))::integer,
    (select count(*) from public.interest_signals)::integer;
end;
$$;

/* ── One row per operator ─────────────────────────────────────────────── */

create or replace function public.admin_operators()
returns table (
  id            uuid,
  full_name     text,
  email         text,
  whatsapp      text,
  created_at    timestamptz,
  runs          integer,
  completed     integer,
  best_rating   integer,
  last_activity timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.full_name,
    o.email,
    o.whatsapp,
    o.created_at,
    (select count(*) from public.mission_runs r where r.operator_id = o.id)::integer,
    (select count(*) from public.mission_runs r
      where r.operator_id = o.id and r.status = 'complete')::integer,
    (select max(r.rating) from public.mission_runs r
      where r.operator_id = o.id and r.status = 'complete')::integer,
    greatest(
      o.updated_at,
      coalesce((select max(r.updated_at) from public.mission_runs r
                where r.operator_id = o.id), o.updated_at)
    )
  from public.operators o
  order by o.created_at desc;
end;
$$;

/* ── Signups per day ──────────────────────────────────────────────────── */

create or replace function public.admin_daily_signups(p_days integer default 30)
returns table (day date, signups integer)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select d::date, count(o.id)::integer
  from generate_series(
         date_trunc('day', now()) - ((greatest(p_days, 1) - 1) * interval '1 day'),
         date_trunc('day', now()),
         interval '1 day'
       ) as d
  left join public.operators o
    on date_trunc('day', o.created_at) = d
  group by d
  order by d;
end;
$$;

/* ── Who stopped, and how far in ──────────────────────────────────────── */

create or replace function public.admin_dropoffs()
returns table (
  run_id          text,
  email           text,
  full_name       text,
  status          text,
  elapsed_seconds integer,
  started_at      timestamptz,
  last_touched    timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    o.email,
    o.full_name,
    r.status,
    -- The shift clock, read out of the stored world. A run that never reached
    -- handover has no completed_at, so wall time would say nothing useful.
    coalesce(nullif(r.world ->> 'elapsed', '')::numeric, 0)::integer,
    r.started_at,
    r.updated_at
  from public.mission_runs r
  join public.operators o on o.id = r.operator_id
  where r.status <> 'complete'
  order by r.updated_at desc;
end;
$$;

/* ── Waitlist ─────────────────────────────────────────────────────────── */

create or replace function public.admin_waitlist()
returns table (
  email      text,
  topic      text,
  full_name  text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select s.email, s.topic, o.full_name, s.created_at
  from public.interest_signals s
  join public.operators o on o.id = s.operator_id
  order by s.created_at desc;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_summary()',
    'admin_operators()',
    'admin_daily_signups(integer)',
    'admin_dropoffs()',
    'admin_waitlist()'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
