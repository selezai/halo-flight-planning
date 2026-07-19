# 2026-07-19 Launch Readiness: Auth, W&B, South Africa NOTAM, Observability, OpenAIP Licensing

## Decisions implemented

- Halo remains South Africa-first for launch.
- NOTAM defaults to official manual briefing mode through ATNS File2Fly/SACAA references. Halo does not scrape or fabricate live South Africa NOTAM data.
- FAA NOTAM provider code remains available only when `NOTAM_PROVIDER=faa` and FAA credentials are configured.
- Supabase account sync is implemented in code, but production DB mutation is gated until the live Supabase project, schema, and RLS policies are inspected.
- Aircraft presets remain useful for performance, but W&B output is marked unusable until the pilot enters aircraft-specific POH/AFM data.
- Authentic OpenAIP sprites remain active/default. Commercial release is blocked until written OpenAIP permission is obtained or the sprites are replaced.
- Playwright/E2E is not part of this launch implementation verification gate. Manual E2E inspection is owned outside this batch.

## Weight and balance

Implemented hybrid W&B:

- `AircraftProfile.weightBalance` stores optional POH/AFM configuration.
- `AircraftProfile.weightBalanceLoading` stores the current loading scenario.
- Presets start as “Needs POH setup” instead of pretending generic envelopes are operational.
- Users can enter empty weight/arm, ramp/takeoff/landing limits, fuel arm/weight, station arms/limits, loading, taxi fuel, and CG envelope points.
- Halo calculates ramp, takeoff, and landing W&B.
- Statuses: `unconfigured`, `incomplete`, `within-limits`, `caution`, `out-of-limits`.
- Caution is shown near envelope limits and near maximum weight.
- Station overloads are flagged without clamping away the entered overload.
- W&B status appears in Aircraft, Briefing, risk review, and exported briefing text.

## South Africa NOTAM

Implemented provider-neutral NOTAM handling:

- Default provider: `south-africa-manual`.
- South Africa route review returns `manual-required` and `south-africa-official`.
- Halo prepares route airport/navaid identifiers and points pilots to official ATNS File2Fly/SACAA briefing sources.
- No SACAA/ATNS scraping, unofficial parsing, or fake live NOTAM results.
- FAA remains behind `NOTAM_PROVIDER=faa`.

Official references:

- ATNS File2Fly: https://file2fly.atns.co.za/aes/login.jsp
- SACAA NOTAM summaries: https://www.caa.co.za/industry-information/aeronautical-information-notam-summaries/

## Supabase auth/account sync

Implemented:

- Supabase SSR/browser client setup using:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Server-only persistence requires `SUPABASE_SERVICE_ROLE_KEY` after production migration/RLS verification. Do not expose it to the browser.
- Magic link sign-in.
- Google OAuth sign-in.
- Auth callback route.
- Account sync panel with signed-in/signed-out states.
- API-only persistence through `/api/account/snapshot`; client components do not write directly to database tables.
- Snapshot validation with Zod before persistence.
- Local planner data is preserved after sign-in; users can explicitly save local data to cloud or load a cloud snapshot.
- Migration for owner-scoped tables:
  - `public.saved_routes`
  - `public.aircraft_profiles`
  - `public.user_preferences`
- RLS enabled on all tables with `TO authenticated` and `auth.uid() = user_id` policies.
- Direct browser table DML grants are revoked; validated writes go through `/api/account/snapshot`, which calls the atomic `save_account_snapshot` RPC server-side.

Production DB mutation status:

- Migration file exists locally.
- It has not been applied to production in this batch because the live Supabase project/schema/RLS could not be inspected here.
- Before enabling production sync, inspect the target project, apply the migration, and smoke-test authenticated select/insert/update under RLS.

## Monitoring and analytics

Implemented:

- `@vercel/analytics`.
- `@vercel/speed-insights`.
- App and global error boundaries that log non-secret failure metadata.
- Structured API request logging with route, method, status, duration, and Vercel request id.

Post-deploy requirement:

- After production deployment, scan Vercel runtime logs for errors and structured `api_request` entries.

## OpenAIP licensing

Implemented:

- Authentic OpenAIP sprites remain active/default.
- Attribution strengthened in `public/sprites/ATTRIBUTION.md`.
- Commercial readiness checklist added at `docs/legal/openaip-commercial-permission.md`.

## Verification gate

Run only:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Do not run:

- `pnpm test:e2e`
- Playwright browser automation

Manual E2E/browser inspection is outside this implementation batch.
