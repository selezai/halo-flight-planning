# Halo Session Log

## 2026-07-19

Objective: complete the Halo flight planning project into a deployable, useful browser-first planning app.

Decisions:

- Use the local `halo-scaffold` Next.js app as the implementation base because it has the safer server-proxied OpenAIP architecture.
- Use the GitHub `selezai/halo-flight-planning` repo as historical reference because it is an older Vite/Supabase implementation.
- Keep Supabase account sync deferred until live schema and RLS can be verified. No database mutations were added.
- Keep NOTAMs as an explicit briefing risk/checklist item until an authorized live NOTAM API is configured.
- Prioritize local route planning, aircraft performance, METAR/TAF weather, fuel reserves, personal minimums, briefing export, and graceful map degradation.

Files changed in this session are documented in `halo-scaffold/docs/superpowers/plans/2026-07-19-halo-flight-planning.md`.

Verification:

- `pnpm test`: 5 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Local browser against `next start`: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps (`CTR FALA`, `CTR FAOR`, `TMA FALA A`) plus informational airway/FIR crossings outside cruise altitude.
- Local briefing panel and exported briefing text included the airspace review and critical risk item.
- Browser console/page error checks were clean.
- Browser verification against `next start`: content rendered, no framework overlay, no captured console errors, route creation and briefing flow verified.
- Vercel production deployment inspected as Ready:
  - Primary alias: https://halo-flight-planning.vercel.app
  - Deployment URL: https://halo-flight-planning-pcmjzhdlk-pilotmerch-gmailcoms-projects.vercel.app
- Production smoke checks passed:
  - `/api/openaip/style` returned HTTP 200.
  - `/api/weather/metar/FAOR` returned current METAR JSON.
  - Browser verification on the production alias showed content, no Next.js overlay, no captured console errors, and FAOR→FACT route planning with expected metrics.
- GitHub branch pushed: `agent/complete-halo-flight-planner-20260719`.
- Draft PR opened: https://github.com/selezai/halo-flight-planning/pull/1.

## 2026-07-19 Aviation Map Fix

Problem: the deployed map showed a fallback/ground-style map instead of a useful manned-flight aviation chart.

Root causes:

- Vercel production did not have `OPENAIP_API_KEY` or `NEXT_PUBLIC_MAPTILER_KEY`, so `/api/openaip/style` returned the fallback base-map style.
- After production env was configured, OpenAIP style loaded but vector tiles were still empty because the style converter generated tile URLs with a source prefix, and the proxy forwarded that prefix to OpenAIP. OpenAIP expects only `{z}/{x}/{y}.pbf`.
- The tile proxy copied the upstream `Content-Encoding` header after reading the body through server-side fetch. That can cause browsers to decode an already-decoded protobuf again, preventing vector tile rendering.
- MapLibre errors were being swallowed, hiding the failure mode.

Decision: keep OpenAIP as the primary free/global aviation source. Research found FAA VFR raster charts are authoritative and free but US-only, while openflightmaps is open and VFR-focused but regional and less straightforward as a global app-ready vector source.

Solution:

- Added production Vercel env vars for OpenAIP and MapTiler.
- Normalized OpenAIP tile paths so both `/tiles/{z}/{x}/{y}.pbf` and older `/tiles/{source}/{z}/{x}/{y}.pbf` forms work, but only `{z}/{x}/{y}.pbf` is sent upstream.
- Rewrote converted OpenAIP style sources to coordinate-only proxy tile URLs.
- Removed the stale `Content-Encoding` response header from proxied vector tiles.
- Preserved dashed airspace boundary layers instead of filtering them out.
- Added visible MapLibre error reporting.
- Added regression tests for OpenAIP tile path/style conversion.

Verification:

- Local `pnpm test`: 9 tests passed.
- Local `pnpm typecheck`: passed.
- Local `pnpm lint`: no warnings or errors.
- Local `pnpm build`: production build passed.
- Local API: `/api/openaip/style` returned 74 layers, 46 airspace layers, and tile URL `/api/openaip/tiles/{z}/{x}/{y}.pbf`.
- Local API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 and a 50 KB vector tile.
- Local browser: aviation chart rendered with visible airspace/airway/restricted outlines and feature inspection opened `AWY G853`.
- Production deployment inspected as Ready:
  - https://halo-flight-planning-5pvu1gz5y-pilotmerch-gmailcoms-projects.vercel.app
- Production API: `/api/openaip/style` returned 74 layers and 46 airspace layers.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without `Content-Encoding`.
- Production browser: aviation chart rendered and feature inspection opened `AWY G853`.

## 2026-07-19 Global OpenAIP Vector Map and Sprites Slice

Objective: make Halo's browser map behave like a real manned-flight aviation map with global OpenAIP vector data, authentic sprites, and useful click-to-detail inspection.

Research and decisions:

- OpenAIP remains the best free/global primary aviation map source for Halo because it provides MapLibre-compatible vector tiles through the Tiles API and feature detail records through the Core API.
- OpenAIP is not Halo's flight-planning function layer. It supplies map/data records; Halo supplies route planning, click behavior, filtering, warnings, briefing, and export workflow.
- OpenAIP Core API schema paths were verified for airports, airspaces, navaids, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- The archived `openAIP/mapstyles` build path fails on current Node because its Node 8-era `@mapbox/spritezero-cli` dependency pulls obsolete `mapnik` tooling.
- Current authentic sprites are generated from `openAIP/openaip-map-resources` with `spreet`.
- OpenAIP's current public map resources are CC BY-NC-SA 4.0. Halo needs OpenAIP permission or replacement sprites before commercial use.

Changes:

- Generated real OpenAIP sprite files in `halo-scaffold/public/sprites/` and added attribution.
- Replaced the interactive sprite builder with a non-interactive `pnpm build:sprites` workflow.
- Restored OpenAIP aviation symbol layers and kept Mapbox/composite basemap symbol layers filtered out.
- Added MapLibre token conversion for OpenAIP style values such as `{type}-medium` and `{icao_code}`.
- Added feature click prioritization so point aviation features beat airspace border/decorative layers when stacked.
- Expanded parsed feature support for airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Added detail API proxies for reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded sidebar fields for vertical limits, activation flags, runway hints, navaid alignment, obstacle dimensions, RC airfield power types, source layer, and source ID.
- Added parser/converter regression tests for actual OpenAIP vector-tile property names.

Prevention guidelines:

- Do not deploy empty sprite placeholders; `pnpm build:sprites` validates file sizes and sprite key count.
- Do not strip all `symbol` layers; filter only incompatible basemap/terrain sources.
- Normalize OpenAIP snake_case tile properties at the parser boundary before displaying feature information.
- Keep OpenAIP API keys server-side in route handlers/proxies only.
- Convert legacy OpenAIP style `stops` carefully for MapLibre: tokenized text/icon strings, array-valued offsets, one-stop functions, and font-stack arrays each need specific handling.
- Use `cache: 'no-store'` for the client style fetch so a bad browser-cached style does not survive deployment.

Local verification:

- `pnpm build:sprites`: generated 128 OpenAIP sprite entries.
- `pnpm test`: 15 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included all added OpenAIP detail routes.
- Local production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Local production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Local production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Local browser: no framework overlay, no degraded-map error, aviation symbols/labels visible, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.

Production deployment and verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2k36aug5m-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FYEx7JLtPWeDPV5XM126dUCTbSid`
- Production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Production browser: no framework overlay, no degraded-map error, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `464c5be`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1

## 2026-07-19 Route-Aware Airspace Review Slice

Objective: make Halo use the OpenAIP browser vector map as planning data by reviewing rendered route airspace crossings against the selected cruise altitude.

Decisions:

- Keep OpenAIP as the aviation map/data source and implement route-aware planning logic inside Halo.
- Use currently rendered OpenAIP vector airspaces for this browser-first slice. The UI explicitly says when the review is partial because the route is outside the viewport, the airspace layer is hidden, or map tiles are still loading.
- Compare parsed airspace vertical limits in feet against the pilot-selected cruise altitude.
- Treat controlled/special-use intersections at cruise altitude as critical, unknown vertical data as caution, and crossed airspaces outside cruise altitude as informational.
- Keep derived route airspace review state out of persisted local storage because it depends on live map render state.

Changes:

- Added `RouteAirspaceAlert` and `RouteAirspaceReview` planning types.
- Added `lowerLimitFt` and `upperLimitFt` to parsed OpenAIP airspace features.
- Added `lib/planning/airspaceReview.ts` for pure alert classification and sorting.
- Added MapLibre route sampling against visible OpenAIP airspace layers.
- Added route airspace review output to the route panel, briefing panel, route status bar, and exported briefing text.
- Added regression tests for altitude parsing and airspace conflict classification.

Local verification:

- `pnpm test`: 21 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Local browser against `next start`: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps (`CTR FALA`, `CTR FAOR`, `TMA FALA A`) plus informational airway/FIR crossings outside cruise altitude.
- Local briefing panel and exported briefing text included the airspace review and critical risk item.
- Browser console/page error checks were clean.

Production deployment and verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2zz9w1tks-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CXFcKk8gw94YcSQ9abmrPbSFVJn7`
- Production API: `/api/openaip/style` returned 96 layers, 49 airspace layers, and 22 aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 and a 50,990-byte vector tile.
- Production browser: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps and the same briefing/risk output as local.
- Sampled Vercel runtime log stream showed no errors after production smoke requests.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `3ec0d42`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1
