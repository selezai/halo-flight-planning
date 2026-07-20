# Halo Flight Planning

Browser-first flight planning for pilots. Built with Next.js 14, TypeScript, MapLibre GL, OpenAIP proxies, AviationWeather.gov weather, Zustand, Vitest, and Tailwind CSS.

Live production deployment: https://halo-flight-planning.vercel.app

## Current Features

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
- Leg-by-leg distance, true course, estimated magnetic course, ETE, and fuel burn.
- Aircraft presets plus editable cruise speed, fuel burn, usable fuel, reserve, contingency, magnetic variation, compass deviation, glide ratio, and POH/AFM W&B setup.
- Hybrid weight-and-balance with preset aircraft templates, custom station/envelope entry, ramp/takeoff/landing CG checks, and briefing/risk review status.
- Training/checkride navlog mode with pilot-entered route wind, TC/MC/WCA/TH/MH/CH/GS/ETE/fuel calculations, formula explanation, and export text.
- Personal minimums for ceiling, visibility, reserve fuel, wind, and crosswind.
- METAR and TAF lookup through validated server API routes using AviationWeather.gov.
- Weather category display for VFR, MVFR, IFR, LIFR, and UNKNOWN.
- South Africa-first route NOTAM review with official File2Fly/SACAA manual briefing mode by default, an authorized live-provider adapter path, route airport/navaid filtering, source attribution, and explicit unavailable states.
- South Africa-safe filing handoff checklist with File2Fly link, close-flight reminder times, overdue state, and optional browser notification while the app is open.
- Data freshness badges for route, weather, airspace, NOTAM, and W&B states so stale or unknown data is never presented as clear.
- Briefing generation with pilot digest, risk review, W&B, weather, fuel, airspace, NOTAM status/results, print, text export, clipboard copy, and one-click backup/print pack download.
- Research panel documenting competitor pain points and Halo's product response.
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
NOTAM_PROVIDER=south-africa-manual
SOUTH_AFRICA_NOTAM_SOURCE_URL=https://file2fly.atns.co.za/aes/login.jsp
SOUTH_AFRICA_NOTAM_API_URL=
SOUTH_AFRICA_NOTAM_API_KEY=
SOUTH_AFRICA_NOTAM_API_AUTH_HEADER=Authorization
SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME=Bearer
FAA_NOTAM_CLIENT_ID=your_faa_notam_client_id_here
FAA_NOTAM_CLIENT_SECRET=your_faa_notam_client_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not add `NEXT_PUBLIC_OPENAIP_API_KEY`, a public NOTAM API key, or any public FAA credential. Aviation and NOTAM credentials must stay server-side.

`NOTAM_PROVIDER=south-africa-manual` is the safe production default for South Africa launch. Set `NOTAM_PROVIDER=south-africa-live` only after SACAA/ATNS or an authorized provider supplies a legitimate JSON API endpoint and key. Halo must not scrape File2Fly or treat SACAA's public daily summary as flight-preparation data.

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
pnpm test:e2e   # Run Playwright integration tests against next build && next start
```

## Project Structure

```text
app/
  api/openaip/      OpenAIP style, tile, sprite, and detail proxies
  api/weather/      METAR and TAF proxies
components/
  map/              MapLibre map and Halo route overlays
  planning/         Route status surface
  sidebar/          Route, weather, aircraft, briefing, and research panels
e2e/                Playwright integration tests against a production server
lib/
  openaip/          OpenAIP style conversion and feature parsing
  planning/         Navigation math, aircraft, weather, briefing, starter data
  research/         Competitor pain-point mapping
stores/             Zustand persisted planning/map state
tests/              Vitest unit tests
types/              OpenAIP and planning TypeScript models
```

## Operational Notes

- Production is deployed on Vercel. `OPENAIP_API_KEY` and `NEXT_PUBLIC_MAPTILER_KEY` are configured for the production deployment.
- Supabase auth/account sync is intentionally deferred until the live project schema and RLS policies are verified.
- Live NOTAM data is not faked. Halo defaults to South Africa official manual briefing mode, prepares route locations, and links ATNS File2Fly. The live South Africa adapter is present behind `NOTAM_PROVIDER=south-africa-live` but requires a real authorized API URL and key. FAA remains available only behind `NOTAM_PROVIDER=faa` for future international rollout.
- Weight-and-balance remains aircraft-registration-specific: presets provide structure, but pilots must enter verified POH/AFM empty weight, arms, max weights, and envelope points before using the CG status operationally.

## Documentation

- Design: `docs/superpowers/plans/2026-07-19-halo-flight-planning-design.md`
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
