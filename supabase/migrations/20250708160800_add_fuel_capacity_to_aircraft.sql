alter table public.aircraft
add column fuel_capacity numeric not null default 0;

alter table public.aircraft
alter column fuel_capacity drop default;
