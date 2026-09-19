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

-- ═══════════════════════════════════════════════════════════════════════════
-- 7-Day Challenge
--
-- Challenge days are played by operator accounts, so a score belongs to
-- somebody and the leaderboard has a name to show. One row per operator per
-- day: replaying a day replaces the row rather than accumulating attempts.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.challenge_runs (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid        not null references public.operators (id) on delete cascade,
  day          integer     not null default 1,
  score        integer     not null,
  band         text        not null,
  signature    text        not null,
  competencies jsonb       not null default '{}'::jsonb,
  decisions    jsonb       not null default '[]'::jsonb,
  -- The full scorecard. Day 1 is playable once, so the second visit reads this
  -- back rather than re-running the shift — the scorecard an operator returns
  -- to is the one they earned, not an approximation rebuilt from the columns.
  -- Nullable: rows written before the column existed have no stored result.
  result       jsonb,
  sop_breaches integer     not null default 0,
  duration_ms  integer,
  completed_at timestamptz not null default now(),
  unique (operator_id, day)
);

-- `create table if not exists` above is a no-op on a database that already has
-- the table, so columns added later need saying twice.
alter table public.challenge_runs add column if not exists result jsonb;

create index if not exists challenge_runs_day_score_idx
  on public.challenge_runs (day, score desc);

alter table public.challenge_runs enable row level security;

drop policy if exists "challenge_runs_select_own" on public.challenge_runs;
create policy "challenge_runs_select_own"
  on public.challenge_runs for select using (auth.uid() = operator_id);

drop policy if exists "challenge_runs_insert_own" on public.challenge_runs;
create policy "challenge_runs_insert_own"
  on public.challenge_runs for insert with check (auth.uid() = operator_id);

drop policy if exists "challenge_runs_update_own" on public.challenge_runs;
create policy "challenge_runs_update_own"
  on public.challenge_runs for update
  using (auth.uid() = operator_id) with check (auth.uid() = operator_id);

-- ── Leaderboard ───────────────────────────────────────────────────────────
--
-- Row level security correctly stops one operator reading another's row, so a
-- board every operator can see has to run as its owner. What it returns is
-- deliberately narrow: rank, score, band, signature and a shortened name.
-- Never an email, never a phone number, never the decision record.
--
-- Names are shortened to a first name plus a last initial. A leaderboard is a
-- public surface inside the product, and "Ananya R." is enough to recognise
-- yourself and your cohort without publishing a directory of full names to
-- everyone who signs up.

create or replace function public.challenge_leaderboard(
  p_day integer default 1,
  p_limit integer default 50
)
returns table (
  rank integer, display_name text, score integer, band text,
  signature text, completed_at timestamptz, is_you boolean
)
language sql security definer set search_path = '' stable
as $$
  select
    row_number() over (order by r.score desc, r.completed_at asc)::integer,
    case
      when coalesce(nullif(trim(o.full_name), ''), '') = '' then 'Operator'
      when position(' ' in trim(o.full_name)) = 0 then trim(o.full_name)
      else split_part(trim(o.full_name), ' ', 1) || ' ' ||
           left(split_part(trim(o.full_name), ' ',
                array_length(string_to_array(trim(o.full_name), ' '), 1)), 1) || '.'
    end,
    r.score, r.band, r.signature, r.completed_at,
    r.operator_id = auth.uid()
  from public.challenge_runs r
  join public.operators o on o.id = r.operator_id
  where r.day = p_day
  order by r.score desc, r.completed_at asc
  limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.challenge_leaderboard(integer, integer) from public;
revoke all on function public.challenge_leaderboard(integer, integer) from anon;
grant execute on function public.challenge_leaderboard(integer, integer) to authenticated;

/* Where the signed-in operator sits, including outside the visible top N. */
create or replace function public.challenge_standing(p_day integer default 1)
returns table (rank integer, total integer, score integer)
language sql security definer set search_path = '' stable
as $$
  with mine as (
    select score from public.challenge_runs
    where day = p_day and operator_id = auth.uid()
  )
  select
    ((select count(*) from public.challenge_runs r
       where r.day = p_day and r.score > (select score from mine)) + 1)::integer,
    (select count(*) from public.challenge_runs where day = p_day)::integer,
    (select score from mine)::integer;
$$;

revoke all on function public.challenge_standing(integer) from public;
revoke all on function public.challenge_standing(integer) from anon;
grant execute on function public.challenge_standing(integer) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Challenge explainer videos
--
-- A public bucket, so the Day 1 / Day 2 players can stream by URL with no
-- session. No insert, update or delete policy exists for it: uploads are an
-- admin action done from the dashboard (or a short-lived, name-scoped policy
-- dropped straight after), never something the app's anon key can do.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('challenge-videos', 'challenge-videos', true, 104857600, array['video/mp4'])
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7-Day Operations Leader Challenge — registrations
-- The landing page at /7-day-challenge takes a name, phone and email before
-- sending someone to payment, so a registration that never pays can still be
-- followed up. Anyone may add a row through the API; nobody can read, change
-- or delete one through it. Registrations are read in the Supabase dashboard.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.challenge_registrations (
  id           uuid        primary key default gen_random_uuid(),
  cohort       text        not null check (char_length(cohort) <= 32),
  name         text        not null check (char_length(name) between 2 and 80),
  phone        text        not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  -- Stored lowercased, so the access check below can match it exactly.
  email        text        not null check (
                 char_length(email) <= 254
                 and email = lower(email)
                 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
               ),
  attribution  jsonb       not null default '{}'::jsonb check (pg_column_size(attribution) <= 2048),
  created_at   timestamptz not null default now(),
  -- Set by an admin once the payment is confirmed in Razorpay. Access to the
  -- challenge waits for it.
  paid_at      timestamptz,
  payment_ref  text
);

alter table public.challenge_registrations add column if not exists paid_at timestamptz;
alter table public.challenge_registrations add column if not exists payment_ref text;
alter table public.challenge_registrations drop constraint if exists challenge_registrations_payment_ref_check;
alter table public.challenge_registrations add constraint challenge_registrations_payment_ref_check
  check (payment_ref is null or char_length(payment_ref) <= 64);

comment on table public.challenge_registrations is
  'Sign-ups from the paid-challenge landing page, captured before payment.';

create index if not exists challenge_registrations_cohort_idx
  on public.challenge_registrations (cohort, created_at desc);

create index if not exists challenge_registrations_email_idx
  on public.challenge_registrations (email, cohort);

alter table public.challenge_registrations enable row level security;

grant insert on public.challenge_registrations to anon, authenticated;

-- Insert only. There is deliberately no select, update or delete policy.
drop policy if exists "challenge_registrations_insert" on public.challenge_registrations;
create policy "challenge_registrations_insert"
  on public.challenge_registrations for insert
  to anon, authenticated
  with check (true);

-- ── Cohort calendar ───────────────────────────────────────────────────────
--
-- When each cohort opens, and what a seat costs, so the database can refuse
-- early access and underpaid payments on its own. No policies: read only by
-- the security definer functions below.

create table if not exists public.challenge_cohorts (
  cohort      text        primary key check (char_length(cohort) <= 32),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  price_paise integer     not null check (price_paise > 0),
  check (ends_at > starts_at)
);
alter table public.challenge_cohorts enable row level security;

-- The cohort id is a label only. This cohort was first set for 28 Sept and
-- moved to 12–18 Oct 2026; its id stayed so existing registrations keep it.
insert into public.challenge_cohorts (cohort, starts_at, ends_at, price_paise)
values ('2026-09-28', '2026-10-12 00:00:00+05:30', '2026-10-18 23:59:59+05:30', 49900)
on conflict (cohort) do update
  set starts_at = excluded.starts_at, ends_at = excluded.ends_at, price_paise = excluded.price_paise;

-- ── Payments, as Razorpay reported them ───────────────────────────────────
--
-- Written only by razorpay_webhook. No policies and no grants.

create table if not exists public.challenge_payments (
  payment_id      text        primary key check (payment_id ~ '^pay_[A-Za-z0-9]{6,40}$'),
  event           text        not null,
  amount_paise    integer,
  currency        text,
  email           text,
  phone           text,
  order_id        text,
  registration_id uuid        references public.challenge_registrations (id) on delete set null,
  payload         jsonb       not null,
  received_at     timestamptz not null default now()
);
alter table public.challenge_payments enable row level security;
create index if not exists challenge_payments_email_idx on public.challenge_payments (email);

-- ── Who may play ──────────────────────────────────────────────────────────
--
-- The challenge days are for people who registered and paid. An operator gets
-- in when the email on their account — confirmed by Google or by a magic link,
-- never a value the client sends — matches a registration marked paid. Admins
-- always get in. Registrations stay unreadable through the API; these answer
-- about the caller only.

create or replace function public.challenge_access_status(p_cohort text default null)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  with mine as (
    select r.cohort, r.paid_at
    from auth.users u
    join public.challenge_registrations r on r.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and (p_cohort is null or r.cohort = p_cohort)
  )
  select case
    when public.is_admin() then 'granted'
    when exists (
      select 1 from mine m
      left join public.challenge_cohorts c on c.cohort = m.cohort
      where m.paid_at is not null and (c.starts_at is null or c.starts_at <= now())
    ) then 'granted'
    -- Paid, but nobody except an admin plays before the cohort starts.
    when exists (select 1 from mine where paid_at is not null) then 'upcoming'
    when exists (select 1 from mine) then 'unpaid'
    else 'unregistered'
  end;
$$;

comment on function public.challenge_access_status is
  'granted, upcoming, unpaid or unregistered — for the signed-in caller''s confirmed email and the cohort (any cohort when null).';

revoke all on function public.challenge_access_status(text) from public;
revoke all on function public.challenge_access_status(text) from anon;
grant execute on function public.challenge_access_status(text) to authenticated;

create or replace function public.has_challenge_access(p_cohort text default null)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.challenge_access_status(p_cohort) = 'granted';
$$;

revoke all on function public.has_challenge_access(text) from public;
revoke all on function public.has_challenge_access(text) from anon;
grant execute on function public.has_challenge_access(text) to authenticated;

-- ── Registrations in the admin panel ──────────────────────────────────────

create or replace function public.admin_challenge_registrations()
returns table (
  id uuid, cohort text, name text, phone text, email text,
  attribution jsonb, created_at timestamptz, paid_at timestamptz, payment_ref text,
  has_account boolean
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
  select r.id, r.cohort, r.name, r.phone, r.email, r.attribution, r.created_at,
         r.paid_at, r.payment_ref,
         exists (select 1 from auth.users u where lower(u.email) = r.email)
  from public.challenge_registrations r
  order by r.created_at desc;
end;
$$;

/* Marking paid keeps the first paid time; marking unpaid clears both fields. */
create or replace function public.admin_set_registration_paid(
  p_id uuid, p_paid boolean, p_ref text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  update public.challenge_registrations
  set paid_at = case when p_paid then coalesce(paid_at, now()) else null end,
      payment_ref = case
        when p_paid then coalesce(nullif(left(trim(coalesce(p_ref, '')), 64), ''), payment_ref)
        else null
      end
  where id = p_id;

  if not found then
    raise exception 'registration not found' using errcode = 'P0002';
  end if;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_challenge_registrations()',
    'admin_set_registration_paid(uuid, boolean, text)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

-- ── Razorpay webhook ──────────────────────────────────────────────────────
--
-- /api/razorpay/webhook relays the raw body and the X-Razorpay-Signature
-- header here. The HMAC is checked against the Vault secret named
-- `razorpay_webhook_secret` (the same value is set on the webhook in the
-- Razorpay dashboard), so the function is safe to expose: without the secret
-- nobody can produce a signature it accepts. Create the secret once with
--   select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'),
--                              'razorpay_webhook_secret');

create or replace function public.razorpay_webhook(p_body text, p_signature text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret   text;
  v_expected text;
  v_event    jsonb;
  v_name     text;
  v_payment  jsonb;
  v_id       text;
  v_amount   integer;
  v_currency text;
  v_email    text;
  v_phone    text;
  v_digits   text;
  v_reg      uuid;
  v_matches  integer;
begin
  if p_body is null or p_signature is null or char_length(p_body) > 262144 then
    return 'rejected';
  end if;

  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets s
  where s.name = 'razorpay_webhook_secret'
  limit 1;
  if coalesce(v_secret, '') = '' then
    return 'not_configured';
  end if;

  v_expected := encode(
    extensions.hmac(convert_to(p_body, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'),
    'hex'
  );
  if v_expected <> lower(trim(p_signature)) then
    return 'rejected';
  end if;

  begin
    v_event := p_body::jsonb;
  exception when others then
    return 'ignored';
  end;

  v_name := v_event ->> 'event';
  if v_name is null or v_name not in ('payment.captured', 'order.paid') then
    return 'ignored';
  end if;

  v_payment := v_event -> 'payload' -> 'payment' -> 'entity';
  v_id := v_payment ->> 'id';
  if v_payment is null or v_id is null or v_id !~ '^pay_[A-Za-z0-9]{6,40}$'
     or coalesce(v_payment ->> 'status', '') <> 'captured' then
    return 'ignored';
  end if;

  v_amount   := nullif(v_payment ->> 'amount', '')::integer;
  v_currency := v_payment ->> 'currency';
  v_email    := nullif(lower(trim(coalesce(v_payment ->> 'email', ''))), '');
  v_digits   := regexp_replace(coalesce(v_payment ->> 'contact', ''), '[^0-9]', '', 'g');
  v_phone    := case when v_digits ~ '[6-9][0-9]{9}$' then '+91' || right(v_digits, 10) end;

  -- payment.captured and order.paid both describe the same payment.
  insert into public.challenge_payments
    (payment_id, event, amount_paise, currency, email, phone, order_id, payload)
  values
    (v_id, v_name, v_amount, v_currency, v_email, v_phone, v_payment ->> 'order_id', v_event)
  on conflict (payment_id) do nothing;

  if exists (select 1 from public.challenge_payments where payment_id = v_id and registration_id is not null) then
    return 'duplicate';
  end if;

  -- Only a full-price rupee payment for a cohort opens anything.
  if v_currency is distinct from 'INR' or v_amount is null
     or v_amount < (select min(price_paise) from public.challenge_cohorts) then
    return 'recorded_unmatched';
  end if;

  -- Email first: the newest unpaid registration under the payer's email.
  select r.id into v_reg
  from public.challenge_registrations r
  where v_email is not null and r.email = v_email
  order by (r.paid_at is null) desc, r.created_at desc
  limit 1;

  -- Phone only when it points at exactly one unpaid registration, so nobody
  -- can claim someone else's payment by registering with their number.
  if v_reg is null and v_phone is not null then
    select count(*) into v_matches
    from public.challenge_registrations r
    where r.phone = v_phone and r.paid_at is null;
    if v_matches = 1 then
      select r.id into v_reg
      from public.challenge_registrations r
      where r.phone = v_phone and r.paid_at is null;
    end if;
  end if;

  if v_reg is null then
    return 'recorded_unmatched';
  end if;

  update public.challenge_registrations
  set paid_at = coalesce(paid_at, now()),
      payment_ref = coalesce(payment_ref, v_id)
  where id = v_reg;

  update public.challenge_payments set registration_id = v_reg where payment_id = v_id;

  return 'matched';
end;
$$;

revoke all on function public.razorpay_webhook(text, text) from public;
grant execute on function public.razorpay_webhook(text, text) to anon, authenticated;

/* A registration that arrives after its payment claims it — by email only. */
create or replace function public.challenge_registration_claim_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment text;
begin
  select p.payment_id into v_payment
  from public.challenge_payments p
  where p.registration_id is null
    and p.email = new.email
    and p.currency = 'INR'
    and p.amount_paise >= (select min(price_paise) from public.challenge_cohorts)
  order by p.received_at desc
  limit 1;

  if v_payment is not null then
    update public.challenge_registrations
    set paid_at = now(), payment_ref = v_payment
    where id = new.id and paid_at is null;
    update public.challenge_payments set registration_id = new.id where payment_id = v_payment;
  end if;
  return null;
end;
$$;

revoke all on function public.challenge_registration_claim_payment() from public, anon, authenticated;

drop trigger if exists challenge_registration_claim_payment on public.challenge_registrations;
create trigger challenge_registration_claim_payment
  after insert on public.challenge_registrations
  for each row execute function public.challenge_registration_claim_payment();

create or replace function public.admin_unmatched_payments()
returns table (
  payment_id text, amount_paise integer, currency text,
  email text, phone text, received_at timestamptz
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
  select p.payment_id, p.amount_paise, p.currency, p.email, p.phone, p.received_at
  from public.challenge_payments p
  where p.registration_id is null
  order by p.received_at desc;
end;
$$;

revoke all on function public.admin_unmatched_payments() from public;
revoke all on function public.admin_unmatched_payments() from anon;
grant execute on function public.admin_unmatched_payments() to authenticated;

-- ── Registration form diagnostics ─────────────────────────────────────────
--
-- When the landing-page form refuses a submission in the browser, it reports
-- which fields failed and the *shape* of what was entered (digits and letters
-- masked), so autofill quirks can be found without collecting anyone's
-- details. Insert-only through the API; read in the dashboard.

create table if not exists public.challenge_form_events (
  id          uuid        primary key default gen_random_uuid(),
  kind        text        not null check (kind in ('invalid', 'request_failed')),
  fields      text[]      not null default '{}' check (cardinality(fields) <= 3),
  detail      jsonb       not null default '{}'::jsonb check (pg_column_size(detail) <= 1024),
  user_agent  text        check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);

comment on table public.challenge_form_events is
  'Why registration attempts failed in the browser. Masked shapes only — never the values people typed.';

alter table public.challenge_form_events enable row level security;
grant insert on public.challenge_form_events to anon, authenticated;

drop policy if exists "challenge_form_events_insert" on public.challenge_form_events;
create policy "challenge_form_events_insert"
  on public.challenge_form_events for insert
  to anon, authenticated
  with check (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Certificates of completion
--
-- Earned by completing all five simulations (Days 1–5) with access to the
-- challenge. Issued once per operator; the name is fixed at issue time. The
-- code is unguessable and is what the public verification page looks up.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.challenge_certificates (
  code         text        primary key check (code ~ '^OF-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$'),
  operator_id  uuid        not null unique references public.operators (id) on delete cascade,
  cohort       text        not null,
  full_name    text        not null check (char_length(full_name) between 1 and 120),
  completed_at timestamptz not null,
  issued_at    timestamptz not null default now()
);

comment on table public.challenge_certificates is
  'Certificates of completion. Issued once per operator by issue_challenge_certificate; verified publicly by code.';

alter table public.challenge_certificates enable row level security;

drop policy if exists "challenge_certificates_select_own" on public.challenge_certificates;
create policy "challenge_certificates_select_own"
  on public.challenge_certificates for select
  to authenticated
  using (auth.uid() = operator_id);

create or replace function public.challenge_certificate_progress()
returns table (days_done integer, days_required integer, eligible boolean)
language sql
security definer
set search_path = ''
stable
as $$
  with done as (
    select count(distinct r.day)::integer as n
    from public.challenge_runs r
    where r.operator_id = auth.uid() and r.day between 1 and 5
  )
  select d.n, 5, d.n >= 5 and public.challenge_access_status(null) = 'granted'
  from done d;
$$;

revoke all on function public.challenge_certificate_progress() from public;
revoke all on function public.challenge_certificate_progress() from anon;
grant execute on function public.challenge_certificate_progress() to authenticated;

create or replace function public.issue_challenge_certificate()
returns table (code text, full_name text, cohort text, completed_at timestamptz, issued_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_name   text;
  v_done   timestamptz;
  v_cohort text;
  v_code   text;
  v_hex    text;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if not exists (select 1 from public.challenge_certificates c where c.operator_id = v_uid) then
    if not (select p.eligible from public.challenge_certificate_progress() p) then
      raise exception 'not eligible' using errcode = 'P0001';
    end if;

    select nullif(trim(o.full_name), '') into v_name from public.operators o where o.id = v_uid;
    if v_name is null then
      raise exception 'no name on the account' using errcode = 'P0001';
    end if;

    select max(r.completed_at) into v_done
    from public.challenge_runs r
    where r.operator_id = v_uid and r.day between 1 and 5;

    -- The cohort they paid for; admins without a registration get the
    -- cohort that has most recently started.
    select coalesce(
      (select r.cohort
         from auth.users u
         join public.challenge_registrations r on r.email = lower(u.email)
        where u.id = v_uid and r.paid_at is not null
        order by r.paid_at desc
        limit 1),
      (select k.cohort from public.challenge_cohorts k
        order by (k.starts_at <= now()) desc, k.starts_at desc
        limit 1)
    ) into v_cohort;

    loop
      v_hex := upper(encode(extensions.gen_random_bytes(6), 'hex'));
      v_code := 'OF-' || substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4) || '-' || substr(v_hex, 9, 4);
      exit when not exists (select 1 from public.challenge_certificates c where c.code = v_code);
    end loop;

    insert into public.challenge_certificates (code, operator_id, cohort, full_name, completed_at)
    values (v_code, v_uid, v_cohort, left(v_name, 120), v_done)
    on conflict (operator_id) do nothing;
  end if;

  return query
  select c.code, c.full_name, c.cohort, c.completed_at, c.issued_at
  from public.challenge_certificates c
  where c.code is not null and c.operator_id = v_uid;
end;
$$;

revoke all on function public.issue_challenge_certificate() from public;
revoke all on function public.issue_challenge_certificate() from anon;
grant execute on function public.issue_challenge_certificate() to authenticated;

create or replace function public.verify_challenge_certificate(p_code text)
returns table (code text, full_name text, cohort text, completed_at timestamptz, issued_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select c.code, c.full_name, c.cohort, c.completed_at, c.issued_at
  from public.challenge_certificates c
  where c.code = upper(trim(p_code));
$$;

revoke all on function public.verify_challenge_certificate(text) from public;
grant execute on function public.verify_challenge_certificate(text) to anon, authenticated;
