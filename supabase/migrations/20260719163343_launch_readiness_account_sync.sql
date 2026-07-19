create table if not exists public.saved_routes (
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id text not null default 'primary',
  name text not null,
  notes text not null default '',
  departure_time text not null default '',
  cruise_altitude_ft integer not null default 0,
  waypoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create table if not exists public.aircraft_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  aircraft_id text not null,
  profile jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, aircraft_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal_minimums jsonb not null default '{}'::jsonb,
  visible_layers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_routes_user_id_idx on public.saved_routes (user_id);
create index if not exists aircraft_profiles_user_id_idx on public.aircraft_profiles (user_id);
create unique index if not exists aircraft_profiles_one_active_per_user_idx
  on public.aircraft_profiles (user_id)
  where is_active;
create index if not exists user_preferences_user_id_idx on public.user_preferences (user_id);

alter table public.saved_routes enable row level security;
alter table public.aircraft_profiles enable row level security;
alter table public.user_preferences enable row level security;

revoke all on public.saved_routes from anon, authenticated;
revoke all on public.aircraft_profiles from anon, authenticated;
revoke all on public.user_preferences from anon, authenticated;

drop policy if exists "saved routes are owner scoped" on public.saved_routes;
create policy "saved routes are owner scoped"
  on public.saved_routes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "aircraft profiles are owner scoped" on public.aircraft_profiles;
create policy "aircraft profiles are owner scoped"
  on public.aircraft_profiles
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user preferences are owner scoped" on public.user_preferences;
create policy "user preferences are owner scoped"
  on public.user_preferences
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.save_account_snapshot(
  p_user_id uuid,
  p_route_id text,
  p_name text,
  p_notes text,
  p_departure_time text,
  p_cruise_altitude_ft integer,
  p_waypoints jsonb,
  p_aircraft_id text,
  p_aircraft_profile jsonb,
  p_personal_minimums jsonb,
  p_visible_layers jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_route_id <> 'primary' then
    raise exception 'unsupported route_id';
  end if;

  update public.aircraft_profiles
  set is_active = false,
      updated_at = now()
  where user_id = p_user_id
    and aircraft_id <> p_aircraft_id
    and is_active = true;

  insert into public.saved_routes (
    user_id,
    route_id,
    name,
    notes,
    departure_time,
    cruise_altitude_ft,
    waypoints,
    updated_at
  )
  values (
    p_user_id,
    p_route_id,
    p_name,
    p_notes,
    p_departure_time,
    p_cruise_altitude_ft,
    p_waypoints,
    now()
  )
  on conflict (user_id, route_id)
  do update set
    name = excluded.name,
    notes = excluded.notes,
    departure_time = excluded.departure_time,
    cruise_altitude_ft = excluded.cruise_altitude_ft,
    waypoints = excluded.waypoints,
    updated_at = now();

  insert into public.aircraft_profiles (
    user_id,
    aircraft_id,
    profile,
    is_active,
    updated_at
  )
  values (
    p_user_id,
    p_aircraft_id,
    p_aircraft_profile,
    true,
    now()
  )
  on conflict (user_id, aircraft_id)
  do update set
    profile = excluded.profile,
    is_active = true,
    updated_at = now();

  insert into public.user_preferences (
    user_id,
    personal_minimums,
    visible_layers,
    updated_at
  )
  values (
    p_user_id,
    p_personal_minimums,
    p_visible_layers,
    now()
  )
  on conflict (user_id)
  do update set
    personal_minimums = excluded.personal_minimums,
    visible_layers = excluded.visible_layers,
    updated_at = now();
end;
$$;

revoke all on function public.save_account_snapshot(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text,
  jsonb,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_account_snapshot(
  uuid,
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  text,
  jsonb,
  jsonb,
  jsonb
) to service_role;
