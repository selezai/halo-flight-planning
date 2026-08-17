create table if not exists halo_test_pilot_events (
  id bigserial primary key,
  event_name text not null check (event_name in ('test_pilot_started', 'test_pilot_opened')),
  source text not null,
  pilot_code text,
  session_id text not null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists halo_test_pilot_events_created_at_idx
  on halo_test_pilot_events (created_at desc);

create index if not exists halo_test_pilot_events_pilot_code_idx
  on halo_test_pilot_events (pilot_code)
  where pilot_code is not null;

comment on table halo_test_pilot_events is
  'Anonymous first-party activity events for Halo test-pilot link usage.';
