# Halo Session Log

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 3 Data Freshness

Objective: make stale/unknown planning data visible instead of letting old weather, NOTAM, airspace, route, or W&B state appear clear.

Decisions:

- Freshness statuses are `current`, `stale`, and `unknown`.
- Missing timestamps are `unknown` and require pilot review.
- Freshness is surfaced in the Briefing tab, Pilot Digest, exported briefing text, and route status bar.

Changes:

- Added `DataFreshness` and `DataFreshnessStatus` types.
- Added `assessDataFreshness`, threshold constants, labels, and worst-status helper.
- Added route, weather, airspace, NOTAM, and W&B freshness calculations in the Briefing tab.
- Added freshness badges and freshness export section.
- Added compact airspace/NOTAM freshness chips to the bottom route status bar.
- Added unit tests for current/stale/unknown classification, worst-status priority, digest inclusion, and exported briefing text.

Verification:

- `pnpm test -- tests/planning/freshness.test.ts`: 55 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 55 tests passed.
  - `pnpm lint`: no warnings or errors after fixing the route timestamp hook dependency.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 2 Briefing Digest

Objective: reduce briefing overload by adding a concise, prioritized Pilot Digest above the full raw briefing.

Decisions:

- Digest status is `stop`, `review`, or `ready` based on highest-priority critical/caution/info items.
- Digest items are generated from the same verified route, risk, W&B, weather, airspace, and NOTAM inputs already used by the briefing.
- The raw briefing remains available underneath the digest for backup and completeness.

Changes:

- Added `BriefingDigest`, `BriefingDigestItem`, and `BriefingDigestStatus` types.
- Added `buildBriefingDigest` and digest text formatting in the briefing library.
- Added a Pilot Digest panel in the Briefing tab and included the digest in exported briefing text.
- Added unit tests for critical status priority, review actions, and export inclusion.

Verification:

- `pnpm test -- tests/planning/briefingDigest.test.ts`: 52 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 52 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 1 W&B

Objective: finish W&B as the first required launch slice before implementing the 8 social/forum pain-point features.

Decisions:

- W&B is hybrid: existing aircraft presets remain available, but CG status is `unconfigured` until the pilot enters aircraft-specific POH/AFM empty weight, arms, max weights, station arms, and envelope points.
- Halo calculates ramp, takeoff, and landing states and does not invent missing aircraft envelope data.
- W&B status is included in Aircraft, Briefing, Risk Review, and exported briefing text.

Changes:

- Added W&B domain types, loading state, envelope interpolation, ramp/takeoff/landing CG calculations, station loading, and status labels.
- Extended aircraft profiles with `weightBalance`, `glideRatio`, and `compassDeviationDeg`.
- Added Aircraft-panel W&B setup/loading UI for empty weight/arm, max weights, fuel arm, station arms/weights, and envelope points.
- Added Briefing-panel W&B review and briefing/risk text output.
- Added unit tests for envelope interpolation, unconfigured setup, within-limits states, overweight/out-of-limits states, incomplete setup, and landing fuel state.

Verification:

- `pnpm test -- tests/planning/weightBalance.test.ts`: 49 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 49 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-19 Live South Africa NOTAM Data Path

Objective: build the live SACAA/ATNS NOTAM data path without scraping, faking data, or using FAA as the South Africa launch default.

Research:

- SACAA's NOTAM page says the public daily summary should not be used for flight preparation and directs pilots to AIMU/File2Fly for latest NOTAMs.
- ATNS File2Fly provides online pre-flight preparation, NOTAM briefing, MET, and e-AIP behind a registered login.
- The File2Fly manual documents route, aerodrome, and zone PIBs produced in browser HTML or PDF.
- No public unauthenticated SACAA/ATNS machine-readable NOTAM API was found.

Decision:

- Keep `NOTAM_PROVIDER=south-africa-manual` as the production-safe default.
- Add an authorized live JSON adapter behind `NOTAM_PROVIDER=south-africa-live`.
- Require real `SOUTH_AFRICA_NOTAM_API_URL` and `SOUTH_AFRICA_NOTAM_API_KEY` from SACAA/ATNS or an authorized provider before enabling the live provider.
- Do not scrape File2Fly, automate a logged-in File2Fly browser session, parse SACAA's public summary as operational data, or fake NOTAM results.
- Keep `NOTAM_PROVIDER=faa` available only for later international rollout.

Changes:

- Extended `RouteNotamReview` with `source=south-africa-official` and `status=manual-required`.
- Refactored `/api/notams/route` to choose between South Africa manual, South Africa live, and FAA providers.
- Added a South Africa live adapter that posts route locations/waypoints to an authorized JSON endpoint with server-side auth, rejects unsafe config, and normalizes flexible provider payloads.
- Updated route sync, default persisted state, risk review, briefing export, and sidebar NOTAM panel copy for South Africa-first behavior.
- Updated env templates, README, setup docs, provider research, and launch TODOs.
- Added Vercel production env vars:
  - `SOUTH_AFRICA_NOTAM_SOURCE_URL`
  - `SOUTH_AFRICA_NOTAM_API_AUTH_HEADER`
  - `SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME`
- Did not add `SOUTH_AFRICA_NOTAM_API_URL` or `SOUTH_AFRICA_NOTAM_API_KEY` because no authorized SACAA/ATNS API endpoint/key was available.

Verification:

- `pnpm test -- tests/planning/notams.test.ts tests/planning/navigation.test.ts`: 44 tests passed.
- `pnpm test`: 44 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Final verification rerun:
  - `pnpm test`: 44 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed when rerun sequentially after build completed. A parallel verification attempt produced TS6053 missing `.next/types` errors because `next build` regenerated `.next` while `tsc` was reading generated type files.
- Local production API smoke on port 3011:
  - `POST /api/notams/route` with FAOR/FALA returned `source=south-africa-official`, `status=manual-required`, `locations=["FAOR","FALA"]`, `sourceUrl=https://file2fly.atns.co.za/aes/login.jsp`.
- Local live-provider safety smoke on port 3012:
  - `NOTAM_PROVIDER=south-africa-live` without `SOUTH_AFRICA_NOTAM_API_URL` / `SOUTH_AFRICA_NOTAM_API_KEY` returned HTTP 503, `source=south-africa-official`, `status=unavailable`, and explicit official File2Fly/SACAA guidance.
- Vercel production deployment inspected as Ready:
  - Deployment URL: `https://halo-flight-planning-9dyovsrz6-pilotmerch-gmailcoms-projects.vercel.app`
  - Production alias: `https://halo-flight-planning.vercel.app`
  - Deployment ID: `dpl_8PHrikwis9AtCni66hjVDinSX8y2`
- Production API smoke:
  - `POST https://halo-flight-planning.vercel.app/api/notams/route` with FAOR/FALA returned HTTP 200 and `status=manual-required`.
- Vercel runtime log stream emitted no runtime errors during the post-deploy smoke window.

Prevention guidelines:

- Provider failure or missing credentials must never be interpreted as "no NOTAMs."
- Public SACAA summaries are not operational flight-prep data.
- All live NOTAM credentials stay server-side and must never use `NEXT_PUBLIC_`.

## 2026-07-19 Initial Completion

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
- Added OpenAIP-style clicked-feature stack inspection so a click keeps the full deduped aviation feature stack and the sidebar can switch between overlapping icons, airspaces, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded parsed feature support for airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Added detail API proxies for reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded sidebar fields for vertical limits, activation flags, runway hints, navaid alignment, obstacle dimensions, RC airfield power types, source layer, and source ID.
- Added parser/converter regression tests for actual OpenAIP vector-tile property names.

Prevention guidelines:

- Do not deploy empty sprite placeholders; `pnpm build:sprites` validates file sizes and sprite key count.
- Do not strip all `symbol` layers; filter only incompatible basemap/terrain sources.
- Do not discard overlapping click results. OpenAIP supplies data; Halo must preserve and rank the clicked feature stack so the pilot can inspect the intended aviation record.
- Normalize OpenAIP snake_case tile properties at the parser boundary before displaying feature information.
- Keep OpenAIP API keys server-side in route handlers/proxies only.
- Convert legacy OpenAIP style `stops` carefully for MapLibre: tokenized text/icon strings, array-valued offsets, one-stop functions, and font-stack arrays each need specific handling.
- Use `cache: 'no-store'` for the client style fetch so a bad browser-cached style does not survive deployment.

Local verification:

- `pnpm build:sprites`: generated 128 OpenAIP sprite entries.
- `pnpm test`: 41 tests passed, including clicked-feature stack ordering/deduplication.
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

Clicked-feature stack follow-up:

- Added `lib/openaip/featureSelection.ts` and sidebar stack selection so overlapping OpenAIP click results are preserved instead of discarded.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `f679905`
- Verification:
  - `pnpm test`: 41 tests passed.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
- Vercel production deployment inspected Ready:
  - Deployment URL: https://halo-flight-planning-qmk9rmzj2-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_DVXvVwLtRyuNXxhVWT2SAVYCM4BQ`
- Production API checks:
  - `/api/openaip/style`: HTTP 200, 96 layers, 22 symbol layers.
  - `/api/openaip/sprites/openaip.json`: HTTP 200, 128 sprite keys.
  - `/api/openaip/tiles/8/147/147.pbf`: HTTP 200, 50,990 bytes, no stale `Content-Encoding`.

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

## 2026-07-19 Backend Airspace Corridor Review Slice

Objective: replace the viewport-only airspace review limitation with a server-side OpenAIP Core route-corridor review.

Research and decisions:

- OpenAIP docs load Swagger specs from `https://api.core.openaip.net/api/system/specs/v1/schema.json`.
- The live Core API schema verifies `GET /airspaces` and `GET /airspaces/{id}`. `GET /airspaces` supports `bbox`, `limit`, `fields`, search, type, class, and activation filters.
- OpenAIP documents bbox queries as compute-intensive and rate-limited, so Halo uses bounded leg-segment queries, a 24-query cap, deduplication, and partial/rate-limited review states.
- Core API review is now preferred over rendered-vector review. Rendered-vector review remains a fallback when Core review is unavailable.
- Core API vertical-limit unit parsing was corrected separately from elevation unit parsing: airspace limits use `0=m`, `1=ft`, and `6=FL`.

Changes:

- Added `lib/planning/airspaceCorridor.ts` for bbox generation, route splitting, polygon intersection, and corridor-distance filtering.
- Added validated read-only `POST /api/openaip/airspace-review`.
- Added `components/planning/RouteAirspaceReviewSync.tsx` and mounted it on the dashboard.
- Split route airspace state into rendered fallback, Core API review, and active selected review.
- Updated route panel and status bar to display review source, query count, candidate count, and corridor width.
- Added tests for corridor geometry, Core vertical-limit parsing, and corridor alert descriptions.

Verification:

- `pnpm test`: 29 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/airspace-review`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-h7r99c6ns-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FhHKr9zxqQFTeis7AdiCbHCEPxSR`
- Production API: FAOR→FALA at 6,500 ft returned `source=openaip-core`, `status=complete`, `queryCount=1`, `candidateCount=24`, `alerts=18`, and `critical=4`.
- Production browser: route panel showed Core API review with 4 critical airspace items (`ATZ FAGC`, `CTR FALA`, `CTR FAOR`, `TMA FALA A`), 1 query, 24 candidates, and 5 nm corridor.
- Production briefing/export text included the Core API corridor review and critical risk item.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `565479d`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1

## 2026-07-19 Global OpenAIP Route Search Slice

Objective: remove the starter-only waypoint search limitation by adding global OpenAIP Core airport and navaid search to the route panel.

Research and decisions:

- The live OpenAIP Core schema verifies `GET /airports` and `GET /navaids`; both support search, pagination/limit, field selection, and optional country filtering.
- OpenAIP supplies global records, but Halo owns the planning function. Search results are converted into Halo waypoints so they can be used by route math, airspace review, weather lookup, briefing, and persistence.
- The search endpoint is read-only and server-side to keep `OPENAIP_API_KEY` out of the browser.
- Starter search stays in place as an instant fallback when the query is short or OpenAIP is unavailable.

Changes:

- Added `GET /api/openaip/search`.
- Added OpenAIP airport/navaid waypoint normalization.
- Added shared route-search deduplication so starter and OpenAIP versions of the same ICAO/navaid ident display once.
- Updated the route panel with debounced global search, OpenAIP result counts, global-source badges, and loading/warning/error/empty states.
- Added tests for normalization and deduplication.

Verification:

- `pnpm test`: 34 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/search`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-3fr8tvz7a-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_Eo6AWb36Npec35v2YruTr7SYE25G`
- Production API: `/api/openaip/search?q=EGLL&limit=6` returned one OpenAIP waypoint for `EGLL` London Heathrow.
- Production API: `/api/openaip/style` returned 96 layers, 50 airspace-named layers, and 22 aviation symbol layers; `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production browser: route search for `EGLL` showed one deduped result row, and route search for `LOWW` showed an OpenAIP-only global result badge.
- Production browser: map inspection mode selected point feature `FARF` with enriched airport details and airspace `JOHANNESBURG SOUTHWEST` with class, vertical limits, activation flags, source layer/id, and enriched Core API record status.
- Vercel CLI returned `Not authorized` after creating the deployment URL, but inspection showed the deployment completed as Ready and assigned the production alias; no second deployment was started.

## 2026-07-19 Integration Tests and CI Slice

Objective: add production-build integration coverage and GitHub Actions gates before continuing into deeper launch features.

Decisions:

- Playwright must run against `next build && next start`, not `next dev`.
- CI should not depend on OpenAIP/MapTiler credentials; Halo's degraded OpenAIP style/search/airspace-review behavior is now a tested contract.
- Keep unit tests and integration tests separated by runner and filename pattern.

Changes:

- Added `@playwright/test` and `pnpm test:e2e`.
- Added `playwright.config.ts` with a production Next.js web server and deterministic no-credential env.
- Added UI integration coverage for route creation and briefing generation.
- Added API integration coverage for route-handler validation/degraded states.
- Added `.github/workflows/ci.yml` for install, unit tests, typecheck, lint, production build, Playwright Chromium install, and e2e tests.

Verification:

- `pnpm install --frozen-lockfile`: passed.
- `pnpm test`: 34 Vitest tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm build`: production build passed.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`.

## 2026-07-19 Route NOTAM Review Slice

Objective: replace the static NOTAM checklist with a credential-gated live-provider integration path that filters by route airport/navaid identifiers and clearly attributes source/status.

Research and decisions:

- FAA NOTAM API is available behind FAA API Portal credentials and is cataloged with base URL `https://external-api.faa.gov/notamapi/v1`.
- Unauthenticated FAA NOTAM API probe returned HTTP 401.
- AviationWeather.gov Data API does not provide NOTAM products.
- Halo must not say "no NOTAMs" when the provider is unavailable. Missing credentials, authentication failure, or provider errors produce unavailable/partial states.

Changes:

- Added NOTAM planning types and helper functions.
- Added `POST /api/notams/route`.
- Added route NOTAM sync/state to the app.
- Added briefing-panel NOTAM review UI, source link, route locations, count/status, and NOTAM rows.
- Added NOTAM review to risk assessment and exported briefing text.
- Added NOTAM provider research documentation and setup instructions.
- Preserved prepared route locations in unavailable NOTAM reviews so missing FAA credentials do not hide the route identifiers that would be queried.

Verification:

- `pnpm test tests/planning/notams.test.ts tests/planning/navigation.test.ts`: 9 targeted tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm test`: 38 Vitest tests passed.
- `pnpm build`: production build passed and included `/api/notams/route`.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`, including the no-credential NOTAM unavailable API/UI path.
- Follow-up route-location fix verification: `pnpm typecheck`, `pnpm test:e2e`, `pnpm test`, `pnpm lint`, and `pnpm build` passed.

## 2026-07-20 Full Pilot Pain-Point Slice 4: Training / Checkride Navlog

Objective: add a checkride-friendly navlog view without changing Halo's operational route math.

Decisions:

- Keep training calculations as a separate view/export section driven by one manually entered route-wind value.
- Reuse existing route legs, aircraft true airspeed, magnetic variation, compass deviation, and fuel burn.
- Preserve the normal route ETE/fuel calculations above the training panel so teaching/checkride math cannot silently alter the operational summary.

Changes:

- Added `TrainingWind`, `TrainingNavLogLeg`, and `TrainingNavLog` planning types.
- Added `lib/planning/trainingNavlog.ts` for WCA, true heading, magnetic heading, compass heading, groundspeed, ETE, and fuel calculations.
- Persisted route-wind inputs in local Zustand state.
- Added a Training / Checkride Navlog panel to the Briefing tab.
- Added a `TRAINING / CHECKRIDE NAVLOG` section to briefing text exports with formula explanation.
- Added unit tests for calm wind, headwind/tailwind, crosswind correction, heading derivation, fuel/time, and export text.

Verification:

- `pnpm test -- tests/planning/trainingNavlog.test.ts`: 13 test files passed, 59 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 13 test files passed, 59 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m9my9k0uy-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_rsVbQ6vXu8epQsTHNSPWWUq4hBJP`

## 2026-07-20 Full Pilot Pain-Point Slice 5: Backup / Print Pack

Objective: add a one-click printable/text backup pack that gives pilots an offline cockpit reference and explicit official-source reminders.

Decisions:

- Build the pack as a pure text-export helper so it is testable and reusable by later filing/emergency slices.
- Keep raw briefing export unchanged, and add a separate backup-pack download button for pilots who want a fuller offline worksheet.
- Include emergency and filing worksheet fields now, then enrich them with calculated state in later slices.

Changes:

- Added `lib/planning/backupPack.ts` and exported `buildBackupPackText(...)`.
- Backup pack includes pilot digest, freshness warnings, dispatch snapshot, waypoint list, operational navlog, training navlog, fuel, W&B, weather, airspace, NOTAM source/status, risk review, filing worksheet, emergency worksheet, official-source links, and pilot notes.
- Added a Backup pack download button in the Briefing package panel.
- Added unit tests for backup-pack inclusion of W&B, digest, NOTAM official source, stale warnings, emergency section, and training formula text.

Verification:

- `pnpm test -- tests/planning/backupPack.test.ts`: 14 test files passed, 60 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 14 test files passed, 60 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-is13397w6-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AAHTqxt1oKFM8RUbBAgZ6GtQGFHd`

## 2026-07-20 Full Pilot Pain-Point Slice 6: Airspace Vertical Profile

Objective: make airspace review more usable by showing where along the route airspace bands occur relative to the selected cruise altitude.

Decisions:

- Extend existing airspace alerts with optional along-route distance ranges instead of creating a separate hidden review model.
- Estimate Core API ranges by sampling the planned route against matched OpenAIP geometry and corridor distance.
- Estimate rendered-browser ranges by aggregating the route sample distances that hit each rendered airspace feature.
- Keep profile visualization compact and aligned with existing critical/caution/info risk colors.

Changes:

- Added `AirspaceVerticalProfile` and `AirspaceVerticalProfileItem` planning types.
- Added `lib/planning/airspaceProfile.ts` for route-distance clamping and profile status generation.
- Added optional `startDistanceNm` and `endDistanceNm` to route airspace alerts.
- Extended Core and rendered airspace review paths to populate approximate route ranges where possible.
- Added vertical profile UI inside the airspace review panel.
- Added `AIRSPACE VERTICAL PROFILE` sections to briefing and backup-pack text exports.
- Added unit tests for profile distance/altitude mapping, range clamping, Core geometry range estimation, and briefing export text.

Verification:

- `pnpm test -- tests/planning/airspaceProfile.test.ts tests/planning/airspaceCorridor.test.ts`: 15 test files passed, 64 tests passed.
- Initial `pnpm typecheck` failed because `airspaceVerticalProfile` was accidentally passed into `buildBriefingDigest`; root cause was corrected by moving the profile argument to `buildBriefingText`.
- Rerun `pnpm typecheck`: passed.
- `pnpm test`: 15 test files passed, 64 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-q9r730x59-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_9eENWf4d3PPvXxmYYmhjrLnBKGkJ`

## 2026-07-20 Full Pilot Pain-Point Slice 7: Filing + Close Reminder

Objective: add a South Africa-safe official filing handoff and close-flight reminder workflow without automating File2Fly/SACAA/ATNS filing.

Decisions:

- Do not file, close, scrape, or fake any official SACAA/ATNS/File2Fly state.
- Persist the checklist and reminder locally in Zustand.
- Use explicit pilot action for browser notification permission; notifications only work while the app remains open.
- Treat missing close reminder and incomplete filing handoff as review items, and overdue close reminder as critical.

Changes:

- Added `FilingChecklistState`, `FlightCloseReminder`, `FilingReminderStatus`, and `FilingWorkflowReview` planning types.
- Added `lib/planning/filingReminder.ts` for not-planned/planned/due-soon/overdue/closed state calculation, checklist completion, route-ETE time seeding, and export lines.
- Added persisted filing checklist and close-reminder state/actions.
- Added Briefing-tab Filing + Close Reminder panel with checklist toggles, File2Fly handoff link, planned/arrival/close-by fields, route-ETE seeding, close acknowledgement, and optional browser notification.
- Added filing/close state to briefing digest, risk review, briefing export, and backup-pack export.
- Added unit tests for planned, due-soon, overdue, closed, digest, and briefing export states.

Verification:

- `pnpm test -- tests/planning/filingReminder.test.ts`: 16 test files passed, 68 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 16 test files passed, 68 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-98voiojdb-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AhpRthQKXsb3FMiDBRJ6yci1wQt4`

## 2026-07-20 Full Pilot Pain-Point Slice 8: Emergency / Forced-Landing Layer

Objective: add emergency planning surfaces for glide radius, nearest available landing candidates, and pilot-marked forced-landing sites.

Decisions:

- Use available local route airport waypoints, starter aerodromes, and user-marked sites. Do not invent live aerodrome suitability.
- Treat glide rings as approximate still-air planning aids from selected cruise altitude and aircraft glide ratio.
- Persist user forced-landing sites locally.
- Feed emergency state into digest, risk review, briefing export, backup pack, and map overlays.

Changes:

- Added `EmergencyLandingSite`, `EmergencyAerodromeCandidate`, `EmergencyPlanningReview`, and suitability types.
- Added `lib/planning/emergencyPlanning.ts` for glide radius, candidate scoring, route-distance calculation, candidate generation, and export lines.
- Added persisted user emergency landing sites and store actions.
- Added Briefing-tab Emergency / Forced Landing panel with candidate list, glide radius, user site creation/editing/removal, suitability, notes, and last verified date.
- Added map overlays for approximate glide rings around route waypoints and colored user forced-landing site markers.
- Added emergency state to briefing digest, risk review, briefing export, and backup-pack export.
- Added unit tests for glide radius, scoring, candidate generation, user-site inclusion, digest, and briefing export.

Verification:

- `pnpm test -- tests/planning/emergencyPlanning.test.ts`: 17 test files passed, 72 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 17 test files passed, 72 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-hbq24i38h-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_GbC5RHeHg9DkaruaXS9ghVpEGBC9`

## 2026-07-20 Full Pilot Pain-Point Completion + Flight Admin

Objective: complete the remaining launch-readiness pilot pain-point work without Playwright/E2E and keep South Africa as the default launch market.

Completed:

- Hybrid W&B with editable POH/AFM setup, ramp/takeoff/landing CG checks, custom stations, caution/out-of-limits states, and insufficient loaded trip fuel detection.
- Pilot Digest, data freshness badges, training/checkride navlog, backup/print pack, airspace vertical profile, filing/close reminders, emergency/forced-landing layer, and rubber-band routing.
- Optional Flight Admin records for official NOTAM briefing and manual flight-plan filing:
  - NOTAM statuses: `not-recorded`, `completed`, `not-applicable`, `needs-rebrief`.
  - Filing statuses: `not-filing`, `preparing`, `filed-manually`, `accepted`, `rejected`, `cancelled`, `closed`.
  - Copyable route PIB request text and File2Fly handoff link.
  - Stale official NOTAM record detection when route or ETD changes.
  - Missing admin records are informational; rejected filing and overdue close remain stop-level states.
- Next.js upgraded to `15.5.18`; dynamic route handlers updated to the Next 15 async params contract.
- Broad global API CORS removed; public tile/sprite CORS remains route-specific.

Verification:

- `pnpm test`: passed, 19 files / 83 tests for the Flight Admin deployment.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-jwfl6opsq-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_EK27rQDsTKn8dbrZsRL8wMnfxvki`

## 2026-07-20 Observability + GitHub Sync

Objective: add production observability instrumentation and sync the local codebase to GitHub.

Changes:

- Added `@vercel/analytics` and `@vercel/speed-insights`.
- Mounted Vercel Analytics and Speed Insights in the root App Router layout.
- Added `lib/observability/api.ts` for structured API route logging with route, method, status, duration, Vercel request id, and safe error names for unhandled failures.
- Wrapped all app API route handlers with the structured logging helper.
- Added `app/error.tsx` and `app/global-error.tsx` safe client error boundaries that log failures without exposing secret values.
- Added unit coverage for structured logging output, wrapper completion logs, and safe generic failure responses.
- Updated the TODO list to mark observability implemented.
- Updated GitHub Actions CI to run only the approved automated gate: unit tests, typecheck, lint, and production build. Playwright/E2E remains excluded for this implementation path.

Verification:

- `pnpm test`: passed, 20 files / 86 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run; manual E2E remains user-owned.

Production deployment and smoke verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2o2fsh9qe-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_72rPhuL3XXL5rxYResFAssGajduK`
- Production API: `/api/openaip/style` returned HTTP 200 with style version 8 and 96 layers.
- Production API: `/api/notams/route` for FAOR → FALA returned HTTP 200 with `source=south-africa-official` and `status=manual-required`.
- Vercel runtime log stream showed structured `api_request_start` and `api_request_complete` entries for `/api/notams/route` with route, method, request id, status, and duration.
- This Vercel CLI version does not support `vercel logs --level`; downstream JSON filtering is required for error-only scans.

GitHub sync scope:

- Sync target is the existing GitHub PR branch `agent/complete-halo-flight-planner-20260719` on `selezai/halo-flight-planning`.
- The local app source is being mirrored into that Git checkout without `.env.local`, `.vercel`, `.next`, `node_modules`, or other local/generated artifacts.

Remaining external blockers:

- Live SACAA/ATNS NOTAM data remains deferred until an authorized feed/API exists.
- Automatic File2Fly/SACAA/ATNS filing remains deferred until authorized integration access exists.
- Paid/commercial launch remains blocked until OpenAIP grants written permission for authentic sprite/icon usage or the icon set is replaced.

## 2026-07-20 Clerk + Neon Account Sync

Objective: replace the deferred Supabase account-sync path with the best fit for Halo: Clerk authentication plus Neon Postgres persistence.

Decision:

- Use Clerk for auth because it has a Vercel Marketplace integration and drop-in Next.js account UI.
- Use Neon Postgres because Halo data is relational and Postgres remains the right long-term storage model.
- Use one owner-scoped latest planner snapshot for this phase instead of normalizing routes/aircraft immediately. This preserves the full current Zustand planner shape while the product model continues to evolve.
- Keep local-only mode as the default fallback when Clerk/Neon env vars are not present.
- Do not expose database credentials to the browser. Sync mutations go through authenticated server API routes only.

Vercel provisioning status:

- `vercel integration add neon` and `vercel integration add clerk` both reached Vercel Marketplace terms/account approval and opened the Dashboard.
- `vercel integration ls` still reports no resources, so production account sync remains pending until those external approvals are completed.
- Current Vercel env still has aviation/runtime variables only; Clerk/Neon env vars are not present yet.

Changes:

- Added `@clerk/nextjs`, `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, and `zod`.
- Added a conditional Clerk provider so the app builds and runs without Clerk env vars.
- Added account sync UI in the sidebar with signed-out, signed-in, save, refresh, load, merge, and local-only states.
- Added `app/api/account/snapshot` with authenticated GET/PUT handlers.
- Added server-side auth guard for Clerk and lazy Neon/Drizzle database initialization.
- Added `halo_planner_snapshots` migration SQL and `pnpm db:migrate`.
- Added snapshot validation, size limiting, extraction, and merge helpers.
- Added a Zustand restore action that reuses existing persisted-state defaults and legacy migration behavior.
- Updated README, SETUP, QUICKSTART, TODO, and env template for the Clerk + Neon path.

Focused verification:

- `pnpm test -- tests/account/plannerSnapshot.test.ts tests/account/snapshotApi.test.ts`: passed, 22 files / 95 tests.
- `pnpm typecheck`: initially failed because the route test passed plain `Request` to a `NextRequest` route handler; fixed by constructing `NextRequest` in the test.
- `pnpm typecheck`: passed after the test fix.
- Production smoke initially showed `/api/account/snapshot` returning HTTP 500 while Clerk/Neon were not configured.
- Root cause: production-only Clerk auth initialization can throw before account sync is fully configured; the original guard only handled the obvious missing-env path.
- Fix: hardened `requireAccountUserId()` to trim env values and convert Clerk import/session failures into a safe HTTP 503 setup/auth-unavailable response.
- Follow-up root cause: once Clerk env vars appeared, Clerk auth still needed request context from `clerkMiddleware()`. Without middleware, signed-in account sync would not be reliable.
- Fix: added conditional `middleware.ts` that runs Clerk middleware only when Clerk env vars are configured and otherwise passes through for local-only environments.
- Added `tests/auth/accountAuth.test.ts`.

Final verification:

- `pnpm test`: passed, 23 files / 97 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Re-ran the full gate after adding `middleware.ts`; all checks still passed.
- No Playwright/browser E2E command was run.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-dd3rrxayf-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CBJQbZfbEKooLCMbCY42EnNzE37k`
- Production API: `/api/openaip/style` returned HTTP 200 with style version 8 and 96 layers.
- Production API: `/api/notams/route` for FAOR → FALA returned HTTP 200 with `source=south-africa-official` and `status=manual-required`.
- Production API: `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming Clerk middleware/auth context is active.
- Vercel runtime logs showed structured account and NOTAM API start/complete entries; no unhandled `api_request_failed` entry appeared after the auth-guard fix.

Remaining account-sync blocker:

- Clerk is installed and production/preview env vars are present.
- Neon still requires Vercel Dashboard web UI provisioning; no Neon resource or `POSTGRES_URL`/`DATABASE_URL` env var is present yet.
- After Neon provisioning, run `vercel env pull .env.local --yes`, `pnpm db:migrate`, redeploy, and smoke-test signed-in save/load/merge.
