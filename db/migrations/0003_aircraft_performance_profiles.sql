create table if not exists halo_aircraft_profiles (
  id text primary key,
  user_id text not null,
  status text not null default 'draft',
  registration text not null,
  aircraft_type text not null,
  profile jsonb not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint halo_aircraft_profiles_status_check
    check (status in ('draft', 'approved', 'archived'))
);

create index if not exists halo_aircraft_profiles_user_id_idx
  on halo_aircraft_profiles (user_id);

create index if not exists halo_aircraft_profiles_updated_at_idx
  on halo_aircraft_profiles (updated_at desc);

create index if not exists halo_aircraft_profiles_registration_idx
  on halo_aircraft_profiles (registration);

comment on table halo_aircraft_profiles is
  'Owner-scoped Halo POH/AFM aircraft performance profiles for advanced fuel planning.';
