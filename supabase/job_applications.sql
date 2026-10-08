-- Run after schema.sql to enable job posting verification and daily rewards.
-- Keep the balance nonnegative for projects whose base schema predates this guard.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.progress'::regclass
      and conname = 'progress_coins_nonnegative'
  ) then
    alter table public.progress add constraint progress_coins_nonnegative check (coins >= 0);
  end if;
end $$;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 180),
  company text not null default '' check (length(company) <= 140),
  url text not null check (length(url) <= 2048),
  canonical_url text,
  status text not null default 'saved' check (status in ('saved', 'applied')),
  verified_at timestamptz not null,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url),
  check ((status = 'saved' and applied_at is null) or status = 'applied')
);

-- Canonicalize job URLs so tracking parameters, fragments, and host casing do
-- not allow the same posting to be added multiple times.
create or replace function public.normalize_job_application_url(p_url text)
returns text language plpgsql immutable strict set search_path = public as $$
declare
  v_clean text;
  v_base text;
  v_query text;
  v_params text;
  v_mark integer;
begin
  v_clean := split_part(p_url, '#', 1);
  v_mark := strpos(v_clean, '?');
  v_base := lower(case when v_mark > 0 then left(v_clean, v_mark - 1) else v_clean end);
  v_base := regexp_replace(v_base, '^(https?://)www\.', '\1');
  v_base := regexp_replace(v_base, '/+$', '');
  if v_mark = 0 then return v_base; end if;
  v_query := substr(v_clean, v_mark + 1);
  select string_agg(lower(param), '&' order by lower(param)) into v_params
    from unnest(string_to_array(v_query, '&')) as param
    where left(lower(split_part(param, '=', 1)), 4) <> 'utm_'
      and lower(split_part(param, '=', 1)) not in ('fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'source', 'gh_src', 'lever-source');
  if v_params is null then return v_base; end if;
  return v_base || '?' || v_params;
end;
$$;

alter table public.job_applications add column if not exists canonical_url text;
update public.job_applications set canonical_url = public.normalize_job_application_url(url)
  where canonical_url is null;
alter table public.job_applications alter column canonical_url set not null;
-- Keep existing rows intact if earlier versions allowed tracked-link duplicates;
-- the first matching row remains the canonical one for future duplicate checks.
with ranked as (
  select id, row_number() over (partition by user_id, canonical_url order by created_at, id) as duplicate_number
    from public.job_applications
)
update public.job_applications as application
  set canonical_url = application.canonical_url || '#legacy-duplicate-' || application.id::text
  from ranked
  where ranked.id = application.id and ranked.duplicate_number > 1;
create unique index if not exists job_applications_user_canonical_url
  on public.job_applications(user_id, canonical_url);

create index if not exists job_applications_user_status_date
  on public.job_applications(user_id, status, applied_at);

create table if not exists public.job_application_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal integer not null default 5 check (daily_goal between 1 and 50),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_application_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  goal integer not null,
  reward integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);

create table if not exists public.job_application_goal_cancellations (
  user_id uuid not null references auth.users(id) on delete cascade,
  cancellation_date date not null,
  fee integer not null check (fee >= 0),
  cancelled_at timestamptz not null default now(),
  primary key (user_id, cancellation_date)
);
alter table public.job_application_goal_cancellations
  drop constraint if exists job_application_goal_cancellations_fee_check;
alter table public.job_application_goal_cancellations
  add constraint job_application_goal_cancellations_fee_check check (fee >= 0);

alter table public.job_applications enable row level security;
alter table public.job_application_goals enable row level security;
alter table public.job_application_rewards enable row level security;
alter table public.job_application_goal_cancellations enable row level security;

drop policy if exists "Read own job applications" on public.job_applications;
create policy "Read own job applications" on public.job_applications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Read own job application goal" on public.job_application_goals;
create policy "Read own job application goal" on public.job_application_goals
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Read own job application rewards" on public.job_application_rewards;
create policy "Read own job application rewards" on public.job_application_rewards
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Read own job application goal cancellations" on public.job_application_goal_cancellations;
create policy "Read own job application goal cancellations" on public.job_application_goal_cancellations
  for select to authenticated using (user_id = (select auth.uid()));

-- App writes go through authenticated API handlers using the server-only service key.
revoke all on public.job_applications, public.job_application_goals, public.job_application_rewards, public.job_application_goal_cancellations from anon, authenticated;
grant select on public.job_applications, public.job_application_goals, public.job_application_rewards, public.job_application_goal_cancellations to authenticated;
grant all on public.job_applications, public.job_application_goals, public.job_application_rewards, public.job_application_goal_cancellations to service_role;

create or replace function public.claim_job_application_reward(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_goal integer;
  v_count integer;
  v_reward integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if auth.role() <> 'service_role' then raise exception 'Not authorized'; end if;
  select daily_goal into v_goal from public.job_application_goals
    where user_id = p_user_id for update;
  if not found then
    insert into public.job_application_goals(user_id, daily_goal)
      values (p_user_id, 5) on conflict (user_id) do nothing;
    select daily_goal into v_goal from public.job_application_goals where user_id = p_user_id for update;
  end if;
  if exists (select 1 from public.job_application_goal_cancellations where user_id = p_user_id and cancellation_date = v_today) then
    raise exception 'Today''s goal was cancelled';
  end if;
  select count(*) into v_count from public.job_applications
    where user_id = p_user_id and status = 'applied'
      and applied_at >= (v_today::timestamp at time zone 'utc')
      and applied_at < ((v_today + 1)::timestamp at time zone 'utc');
  if v_count < v_goal then raise exception 'Apply to % jobs today to earn your reward. You have %.', v_goal, v_count; end if;
  v_reward := v_goal * 10;
  insert into public.job_application_rewards(user_id, reward_date, goal, reward)
    values (p_user_id, v_today, v_goal, v_reward) on conflict (user_id, reward_date) do nothing;
  if not found then
    return jsonb_build_object('reward', (select reward from public.job_application_rewards where user_id = p_user_id and reward_date = v_today), 'alreadyClaimed', true);
  end if;
  update public.progress set coins = coins + v_reward where user_id = p_user_id;
  return jsonb_build_object('reward', v_reward, 'alreadyClaimed', false);
end;
$$;

revoke all on function public.claim_job_application_reward(uuid) from public, anon, authenticated;
grant execute on function public.claim_job_application_reward(uuid) to service_role;

create or replace function public.cancel_job_application_goal(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_goal integer;
  v_fee integer;
  v_balance integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if auth.role() <> 'service_role' then raise exception 'Not authorized'; end if;
  select daily_goal into v_goal from public.job_application_goals
    where user_id = p_user_id for update;
  if not found then raise exception 'Set a daily goal before cancelling it'; end if;
  select fee into v_fee from public.job_application_goal_cancellations
    where user_id = p_user_id and cancellation_date = v_today;
  if found then
    return jsonb_build_object('fee', v_fee, 'alreadyCancelled', true);
  end if;
  v_fee := v_goal * 10;
  select coins into v_balance from public.progress where user_id = p_user_id for update;
  if not found then v_balance := 0; end if;
  if v_balance < v_fee then
    v_fee := 0;
  else
    update public.progress set coins = coins - v_fee where user_id = p_user_id;
  end if;
  insert into public.job_application_goal_cancellations(user_id, cancellation_date, fee)
    values (p_user_id, v_today, v_fee);
  delete from public.job_application_goals where user_id = p_user_id;
  return jsonb_build_object('fee', v_fee, 'alreadyCancelled', false);
end;
$$;

revoke all on function public.cancel_job_application_goal(uuid) from public, anon, authenticated;
grant execute on function public.cancel_job_application_goal(uuid) to service_role;
