# Halo Flight Planning

Browser-first flight planning for pilots. Built with Next.js 14, TypeScript, MapLibre GL, OpenAIP proxies, AviationWeather.gov weather, Zustand, Vitest, and Tailwind CSS.

Live production deployment: https://halo-flight-planning.vercel.app

## Current Features

- Interactive planning map with OpenAIP server-side proxy support.
- Airspace-first aviation chart rendering with OpenAIP airspaces, airways, controlled/restricted areas, airports, navaids, reporting points, and obstacles.
- Authentic OpenAIP sprites for aviation icons, symbols, and patterned airspace overlays.
- Click-to-detail inspection for OpenAIP airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Server-side OpenAIP Core route-corridor airspace review that compares crossed/nearby airspaces with selected cruise altitude and surfaces critical/caution/info alerts.
- Rendered OpenAIP map airspace review remains available as a browser fallback while Core API review is checking or unavailable.
- Graceful fallback base map when OpenAIP credentials or aviation resources are unavailable.
- Route planning with global OpenAIP Core airport/navaid search, instant starter fallback results, manual coordinates, map-click waypoints, reordering, removal, and persisted local routes.
- Leg-by-leg distance, true course, estimated magnetic course, ETE, and fuel burn.
- Aircraft presets plus editable cruise speed, fuel burn, usable fuel, reserve, contingency, and magnetic variation.
- Personal minimums for ceiling, visibility, reserve fuel, wind, and crosswind.
- METAR and TAF lookup through validated server API routes using AviationWeather.gov.
- Weather category display for VFR, MVFR, IFR, LIFR, and UNKNOWN.
- Briefing generation with risk review, weather, fuel, NOTAM checklist, print, text export, and clipboard copy.
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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do not add `NEXT_PUBLIC_OPENAIP_API_KEY`. OpenAIP credentials must stay server-side.

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
- Live NOTAM data is not faked; Halo includes an explicit NOTAM review item in each briefing.
- Weight-and-balance needs aircraft-specific arms/envelopes before it can be operationally useful.

## Documentation

- Design: `docs/superpowers/plans/2026-07-19-halo-flight-planning-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-19-halo-flight-planning.md`
- OpenAIP global vector map plan: `docs/superpowers/plans/2026-07-19-openaip-global-vector-map.md`
- Route airspace review plan: `docs/superpowers/plans/2026-07-19-route-airspace-review.md`
- Backend airspace corridor review plan: `docs/superpowers/plans/2026-07-19-backend-airspace-corridor-review.md`
- OpenAIP global route search plan: `docs/superpowers/plans/2026-07-19-openaip-global-route-search.md`
- Integration tests and CI plan: `docs/superpowers/plans/2026-07-19-integration-tests-ci.md`
- Research: `docs/research/competitor-pain-points.md`
- Setup detail: `SETUP.md`
- Implementation notes: `IMPLEMENTATION_NOTES.md`
