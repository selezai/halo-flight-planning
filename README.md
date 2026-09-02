# Halo Flight Planning

Browser-first flight planning for pilots. Built with Next.js 15, TypeScript, MapLibre GL, OpenAIP proxies, AviationWeather.gov weather, Zustand, Clerk-ready account sync, Neon-ready Postgres persistence, Vitest, and Tailwind CSS.

Live production deployment: https://halo-flight-planning.vercel.app

## Current Features

- Daylight luxury aviation UI with a map-first compact mission status card, unified Planner surface, local Mission Library, responsive mobile bottom-sheet workflow, tablet/desktop Planner panel, and SVG halo-ring route-arrow app mark.
- Interactive planning map with OpenAIP server-side proxy support.
- Airspace-first aviation chart rendering with OpenAIP airspaces, airways, controlled/restricted areas, airports, navaids, reporting points, and obstacles.
- Authentic OpenAIP sprites for aviation icons, symbols, and patterned airspace overlays.
- Click-to-detail inspection for OpenAIP airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields, including a switchable clicked-feature stack when icons and airspaces overlap.
- Server-side OpenAIP Core route-corridor airspace review that compares crossed/nearby airspaces with selected cruise altitude and surfaces critical/caution/info alerts.
- Compact airspace vertical profile showing route distance, cruise altitude, and along-route airspace bands with critical/caution/info coloring.
- Rendered OpenAIP map airspace review remains available as a browser fallback while Core API review is checking or unavailable.
- Emergency/forced-landing planning with approximate glide rings, route/starter/user landing candidates, suitability scoring, and user-marked forced-landing sites.
- Graceful fallback base map when OpenAIP credentials or aviation resources are unavailable.
- Route planning with global OpenAIP Core airport/navaid search, instant starter fallback results, manual coordinates, map-click waypoints, rubber-band map editing, snap-to-feature drops, reordering, removal, and persisted local routes.
- Route Advisor v1 with Direct, Current/User Route, and Provider Route candidate cards; typed route token review recognizes waypoints, coordinates, airway/procedure-looking tokens, and altitude hints without fabricating licensed navdata.
- Mission Library for saving, switching, duplicating, and archiving multiple local mission drafts while keeping one active mission on the map.
- Leg-by-leg distance, true course, estimated magnetic course, ETE, and fuel burn.
- Weather + Fuel Advisor v1 with route airport METAR/TAF collection, manual route wind fallback, provider-gated winds aloft status, required-fuel, target-landing-fuel, and W&B-constrained max-fuel policy reviews.
- Aircraft presets plus editable cruise speed, fuel burn, usable fuel, reserve, contingency, magnetic variation, compass deviation, glide ratio, and POH/AFM W&B setup.
- Hybrid weight-and-balance with preset aircraft templates, custom station/envelope entry, ramp/takeoff/landing CG checks, and briefing/risk review status.
- W&B saved load templates with locked/default load items plus JSON export/import for profile and manifest handoff.
- Training/checkride navlog mode with pilot-entered route wind, TC/MC/WCA/TH/MH/CH/GS/ETE/fuel calculations, formula explanation, and export text.
- Personal minimums for ceiling, visibility, reserve fuel, wind, and crosswind.
- METAR and TAF lookup through validated server API routes using AviationWeather.gov.
- Weather category display for VFR, MVFR, IFR, LIFR, and UNKNOWN.
- South Africa airfield and frequency digest built from available OpenAIP-style route airport records, with explicit official SACAA/ATNS/AIP verification states when data is missing or unofficial.
- South Africa-first route NOTAM review with official File2Fly/SACAA manual briefing mode by default, an authorized live-provider adapter path, route airport/navaid filtering, source attribution, and explicit unavailable states.
- South Africa-safe filing handoff checklist with File2Fly link, close-flight reminder times, overdue state, and optional browser notification while the app is open.
- Data freshness badges for route, Route Advisor, weather, airspace, NOTAM, fuel, Grid MORA, airfields, and W&B states so stale or unknown data is never presented as clear.
- Briefing generation with pilot digest, risk review, W&B, weather, fuel, route advisor, route airfields/frequencies, airspace, NOTAM status/results, print, text export, clipboard copy, one-click backup/print pack download, and structured dispatch package export.
- Repository research docs documenting competitor pain points and Halo's product response.
- Optional Clerk + Neon account sync path with local-only fallback, authenticated server-side snapshot APIs, and browser-to-account save/load/merge controls.
- Unit tests for navigation and weather logic.

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
NEXT_PUBLIC_MAPTILER_BASE_STYLE=outdoor-v2
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
POSTGRES_URL=
DATABASE_URL=
NOTAM_PROVIDER=south-africa-manual
SOUTH_AFRICA_NOTAM_SOURCE_URL=https://file2fly.atns.co.za/aes/login.jsp
SOUTH_AFRICA_NOTAM_API_URL=
SOUTH_AFRICA_NOTAM_API_KEY=
SOUTH_AFRICA_NOTAM_API_AUTH_HEADER=Authorization
SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME=Bearer
FAA_NOTAM_CLIENT_ID=your_faa_notam_client_id_here
FAA_NOTAM_CLIENT_SECRET=your_faa_notam_client_secret_here
HALO_NAVDATA_PROVIDER_URL=
HALO_NAVDATA_PROVIDER_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not add `NEXT_PUBLIC_OPENAIP_API_KEY`, a public NOTAM API key, public navdata key, or any public FAA credential. Aviation, NOTAM, and navdata credentials must stay server-side.

`NEXT_PUBLIC_MAPTILER_BASE_STYLE` defaults to `outdoor-v2` because OpenAIP renders its map as a full vector style: ground land/water/road/place-label layers underneath OpenAIP aviation vector layers. Halo mirrors that structure with MapTiler vector ground layers, tuned city/town/POI label thresholds, and OpenAIP aviation layers above. If the vector style cannot be fetched, Halo falls back to a basic raster basemap rather than leaving the map blank.

`NOTAM_PROVIDER=south-africa-manual` is the safe production default for South Africa launch. Set `NOTAM_PROVIDER=south-africa-live` only after SACAA/ATNS or an authorized provider supplies a legitimate JSON API endpoint and key. Halo must not scrape File2Fly or treat SACAA's public daily summary as flight-preparation data.

Route Advisor provider routing remains unavailable unless `HALO_NAVDATA_PROVIDER_URL` and `HALO_NAVDATA_PROVIDER_KEY` are configured for a licensed navdata source. Halo does not expand airways, SIDs, STARs, approaches, or official preferred routes without that authorized provider boundary.

Account sync uses Clerk for authentication and Neon Postgres for storage. If `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `POSTGRES_URL`/`DATABASE_URL` are absent, Halo remains fully usable in local-only mode. After provisioning Neon, run:

```bash
vercel env pull .env.local --yes
pnpm db:migrate
```

If Vercel Marketplace marks Neon values as sensitive, `vercel env pull` may write empty local placeholders. In that case local account sync needs connection values copied from Neon into `.env.local` by the developer, but Vercel deployments still receive the real runtime env values. The production app creates the account-sync table idempotently on the first authenticated save if the migration has not already run.

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
pnpm db:migrate # Apply the Neon account-sync migration after env vars are present
pnpm test:e2e   # Run Playwright integration tests against next build && next start
```

## Project Structure

```text
app/
  api/account/      Authenticated account snapshot sync route
  api/openaip/      OpenAIP style, tile, sprite, and detail proxies
  api/route-intelligence/ Authenticated route candidate provider boundary
  api/weather/      METAR and TAF proxies
components/
  auth/             Clerk provider and account sync controls
  map/              MapLibre map and Halo route overlays
  planning/         Route status surface
  shell/            Responsive map-first app shell, unified Planner, Mission Library, and Halo brand mark
  sidebar/          Route, weather, aircraft/W&B, briefing, admin, and emergency panels
db/                 SQL migrations for account sync
e2e/                Playwright integration tests against a production server
lib/
  account/          Planner snapshot validation, merge, and persistence helpers
  auth/             Clerk auth guard helpers
  db/               Lazy Neon/Drizzle database client and schema
  openaip/          OpenAIP style conversion and feature parsing
  planning/         Navigation math, aircraft, weather, briefing, starter data
  research/         Competitor pain-point mapping
stores/             Zustand persisted planning/map state
tests/              Vitest unit tests
types/              OpenAIP and planning TypeScript models
```

## Operational Notes

- Production is deployed on Vercel. `OPENAIP_API_KEY` and `NEXT_PUBLIC_MAPTILER_KEY` are configured for the production deployment.
- Supabase auth/account sync has been replaced by the current Clerk + Neon path. Vercel Marketplace approval/account setup is required before production account sync can be enabled.
- Live NOTAM data is not faked. Halo defaults to South Africa official manual briefing mode, prepares route locations, and links ATNS File2Fly. The live South Africa adapter is present behind `NOTAM_PROVIDER=south-africa-live` but requires a real authorized API URL and key. FAA remains available only behind `NOTAM_PROVIDER=faa` for future international rollout.
- Route Advisor does not fake airway, procedure, or official preferred-route expansion. Direct and Current/User Route candidates use local waypoint geometry; Provider Route returns an explicit unavailable/not-configured state until licensed navdata is configured.
- Airfield and frequency briefs use available OpenAIP-style feature data only and keep official SACAA/ATNS/AIP verification visible. Missing frequency/runway data is treated as a review item, not a successful blank result.
- Winds aloft remains provider-gated; manual route wind is the default operational fallback when no authorized winds provider is configured.
- Weight-and-balance remains aircraft-registration-specific: presets provide structure, but pilots must enter verified POH/AFM empty weight, arms, max weights, and envelope points before using the CG status operationally.

## Documentation

- Design: `docs/superpowers/plans/2026-07-19-halo-flight-planning-design.md`
- UX/UI overhaul: `docs/superpowers/plans/2026-07-21-halo-ux-ui-overhaul.md`
- Unified Planner + Mission Library: `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- Implementation plan: `docs/superpowers/plans/2026-07-19-halo-flight-planning.md`
- OpenAIP global vector map plan: `docs/superpowers/plans/2026-07-19-openaip-global-vector-map.md`
- Route airspace review plan: `docs/superpowers/plans/2026-07-19-route-airspace-review.md`
- Backend airspace corridor review plan: `docs/superpowers/plans/2026-07-19-backend-airspace-corridor-review.md`
- OpenAIP global route search plan: `docs/superpowers/plans/2026-07-19-openaip-global-route-search.md`
- Integration tests and CI plan: `docs/superpowers/plans/2026-07-19-integration-tests-ci.md`
- Route NOTAM review plan: `docs/superpowers/plans/2026-07-19-route-notam-review.md`
- Research: `docs/research/competitor-pain-points.md`
- NOTAM provider research: `docs/research/notam-provider-research.md`
- Setup detail: `SETUP.md`
- Implementation notes: `IMPLEMENTATION_NOTES.md`
