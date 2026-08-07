create table if not exists halo_planner_snapshots (
  user_id text primary key,
  snapshot jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists halo_planner_snapshots_updated_at_idx
  on halo_planner_snapshots (updated_at desc);

comment on table halo_planner_snapshots is
  'Latest owner-scoped Halo planner snapshot for Clerk-authenticated account sync.';
