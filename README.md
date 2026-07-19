# Halo Flight Planning

Browser-first flight planning for pilots. Built with Next.js 14, TypeScript, MapLibre GL, OpenAIP proxies, AviationWeather.gov weather, Zustand, Vitest, and Tailwind CSS.

Live production deployment: https://halo-flight-planning.vercel.app

## Current Features

- Interactive planning map with OpenAIP server-side proxy support.
- Airspace-first aviation chart rendering with OpenAIP airspaces, airways, controlled/restricted areas, airports, navaids, reporting points, and obstacles.
- Authentic OpenAIP sprites for aviation icons, symbols, and patterned airspace overlays.
- Click-to-detail inspection for OpenAIP airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields, including a switchable clicked-feature stack when icons and airspaces overlap.
- Server-side OpenAIP Core route-corridor airspace review that compares crossed/nearby airspaces with selected cruise altitude and surfaces critical/caution/info alerts.
- Rendered OpenAIP map airspace review remains available as a browser fallback while Core API review is checking or unavailable.
- Graceful fallback base map when OpenAIP credentials or aviation resources are unavailable.
- Route planning with global OpenAIP Core airport/navaid search, instant starter fallback results, manual coordinates, map-click waypoints, reordering, removal, and persisted local routes.
- Leg-by-leg distance, true course, estimated magnetic course, ETE, and fuel burn.
- Aircraft presets plus editable cruise speed, fuel burn, usable fuel, reserve, contingency, magnetic variation, and aircraft-specific W&B setup.
- Hybrid weight-and-balance with POH/AFM entry, station loading, CG envelope checks, ramp/takeoff/landing phases, and unconfigured/incomplete/within/caution/out-of-limits statuses.
- Personal minimums for ceiling, visibility, reserve fuel, wind, and crosswind.
- METAR and TAF lookup through validated server API routes using AviationWeather.gov.
- Weather category display for VFR, MVFR, IFR, LIFR, and UNKNOWN.
- South Africa-first route NOTAM briefing mode that prepares route locations and directs pilots to official ATNS File2Fly/SACAA briefing sources without scraping or faking live NOTAM data.
- FAA NOTAM provider integration remains available for international rollout when `NOTAM_PROVIDER=faa` and FAA credentials are configured.
- Supabase magic link/Google auth UI and account snapshot sync for routes, aircraft profiles, and preferences, gated behind public Supabase environment variables and owner-scoped RLS tables.
- Vercel Analytics, Speed Insights, structured API logging, and safe app/global error boundaries.
- Briefing generation with risk review, weather, fuel, airspace, NOTAM status/results, print, text export, and clipboard copy.
- Research panel documenting competitor pain points and Halo's product response.
- Unit tests for navigation, weather, NOTAM, W&B, OpenAIP parsing/search, and account snapshot helpers.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Environment

The app works as a local planner without external keys, but live OpenAIP aviation layers require OpenAIP credentials and authentic sprites.

```env
OPENAIP_API_KEY=your_openaip_api_key_here
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NOTAM_PROVIDER=south-africa-manual
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For FAA rollout only:

```env
NOTAM_PROVIDER=faa
FAA_NOTAM_CLIENT_ID=your_faa_notam_client_id_here
FAA_NOTAM_CLIENT_SECRET=your_faa_notam_client_secret_here
```

Do not add `NEXT_PUBLIC_OPENAIP_API_KEY`, public FAA NOTAM credentials, or any `NEXT_PUBLIC_` Supabase service-role key. Aviation credentials and admin credentials must stay server-side.

## OpenAIP Sprites

The committed sprite files are generated from OpenAIP's public map resources and validated as part of the map build workflow. To regenerate them:

```bash
pnpm build:sprites
```

The generated files belong in `public/sprites/`. See `public/sprites/ATTRIBUTION.md` before using these assets commercially; OpenAIP's current public map resources are licensed CC BY-NC-SA 4.0.

## Commands

```bash
pnpm dev        # Start local development
pnpm build      # Build production bundle
pnpm start      # Start production server after build
pnpm lint       # Run Next.js ESLint checks
pnpm typecheck  # Run TypeScript checks
pnpm test       # Run Vitest unit tests
```

## Project Structure

```text
app/
  api/openaip/      OpenAIP style, tile, sprite, and detail proxies
  api/weather/      METAR and TAF proxies
  auth/callback/    Supabase auth callback
components/
  auth/             Supabase sign-in/account sync panel
  map/              MapLibre map and Halo route overlays
  planning/         Route status surface
  sidebar/          Route, weather, aircraft, briefing, and research panels
lib/
  openaip/          OpenAIP style conversion and feature parsing
  observability/    Structured API logging
  planning/         Navigation math, aircraft, weather, briefing, starter data
  research/         Competitor pain-point mapping
  supabase/         Auth clients, snapshot schemas, merge helpers
stores/             Zustand persisted planning/map state
supabase/           Local migration for owner-scoped account sync tables
tests/              Vitest unit tests
types/              OpenAIP and planning TypeScript models
```

## Operational Notes

- Production is deployed on Vercel. `OPENAIP_API_KEY` and `NEXT_PUBLIC_MAPTILER_KEY` are configured for the production deployment.
- Supabase auth/account sync code is implemented, but production database mutation must wait until the target Supabase project/schema/RLS are inspected, the migration is applied, the server-only `SUPABASE_SERVICE_ROLE_KEY` is configured, and authenticated smoke tests pass.
- Live South Africa NOTAM data is deferred until an authorized SACAA/ATNS data path exists. Launch mode is official manual briefing through ATNS File2Fly/SACAA.
- Live FAA NOTAM review is available only when `NOTAM_PROVIDER=faa` plus `FAA_NOTAM_CLIENT_ID` and `FAA_NOTAM_CLIENT_SECRET` are configured.
- Weight-and-balance needs aircraft-specific POH/AFM arms/envelopes before it can be operationally useful.
- Launch verification uses `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Playwright/E2E is not a completion gate for this batch.
- Commercial OpenAIP sprite use is blocked until written OpenAIP permission is obtained or the sprites are replaced.

## Documentation

- Design: `docs/superpowers/plans/2026-07-19-halo-flight-planning-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-19-halo-flight-planning.md`
- OpenAIP global vector map plan: `docs/superpowers/plans/2026-07-19-openaip-global-vector-map.md`
- Route airspace review plan: `docs/superpowers/plans/2026-07-19-route-airspace-review.md`
- Backend airspace corridor review plan: `docs/superpowers/plans/2026-07-19-backend-airspace-corridor-review.md`
- OpenAIP global route search plan: `docs/superpowers/plans/2026-07-19-openaip-global-route-search.md`
- Integration tests and CI plan: `docs/superpowers/plans/2026-07-19-integration-tests-ci.md`
- Route NOTAM review plan: `docs/superpowers/plans/2026-07-19-route-notam-review.md`
- Launch readiness plan: `docs/superpowers/plans/2026-07-19-launch-readiness-auth-wb-notam-observability.md`
- OpenAIP commercial permission checklist: `docs/legal/openaip-commercial-permission.md`
- Research: `docs/research/competitor-pain-points.md`
- NOTAM provider research: `docs/research/notam-provider-research.md`
- Setup detail: `SETUP.md`
- Implementation notes: `IMPLEMENTATION_NOTES.md`
