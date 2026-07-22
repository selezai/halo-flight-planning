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

Neon activation follow-up:

- After Neon provisioning, `vercel integration ls` reports both Marketplace resources as available for `halo-flight-planning`.
- `vercel env ls` reports Neon database variables and Clerk variables for Preview and Production.
- `vercel env pull .env.local --environment=production --yes` and `vercel pull --environment=production --yes` both wrote sensitive Marketplace values as empty local placeholders in this CLI environment.
- Root cause: the deployed Vercel runtime can receive the real integration secrets, but this local CLI session cannot read those sensitive values back for `pnpm db:migrate`.
- Fix: treat empty quoted env placeholders as unconfigured locally, keep GET read-only when the table is absent, and idempotently ensure the `halo_planner_snapshots` table on authenticated PUT before saving the owner-scoped planner snapshot.
- This keeps local-only mode safe when secrets are unavailable locally while allowing production account sync to initialize through the real runtime Neon env values.

## 2026-07-21 UX/UI Overhaul

Objective: redesign Halo as a daylight luxury aviation planner with a map-first mission dashboard, responsive phone/tablet workflow, premium code-first design system, and no operational Research tab.

Research and decisions:

- Brand direction uses “halo” as a ring/light/protective aura and atmospheric light-ring concept.
- Aviation UI direction follows FAA EFB/human-factors guidance: high legibility, consistent controls, low workload, and clear operational status colors.
- Figma remains deferred because no live Figma MCP tool was available in this session; implementation proceeded code-first.
- Authentic OpenAIP sprites remain active; commercial written-permission blocker is unchanged.
- The Research tab was removed from the production pilot UI. Repository research documentation remains available in `docs/research/`.

Changes:

- Initialized shadcn/ui with Radix defaults and added the requested primitives.
- Added explicit Tailwind/CSS design tokens for pearl/ivory background, navy/graphite text, muted gold accents, cyan route glow, and strict red/amber/green operational states.
- Added a generated-logo-inspired production SVG mark: halo ring plus route arrow, plus `app/icon.svg`.
- Added `HaloAppShell`:
  - full-screen map as the opening workspace;
  - top mission bar;
  - pilot-action mission dashboard;
  - mobile bottom navigation and bottom-sheet command deck;
  - tablet map-first command-deck access;
  - desktop floating right command deck;
  - floating map controls for planning mode, airspace layer, emergency tools, and route focus.
- Refactored sidebar navigation to production panels only: Route, Weather, Aircraft/W&B, Briefing, Admin, Emergency.
- Promoted Flight Admin and Emergency/forced-landing workflow out of the raw briefing into first-class panels.
- Kept existing route, W&B, weather, NOTAM, filing, emergency, OpenAIP, account sync, export, and observability logic intact.
- Added UI state helpers for panel migration and mission summary derivation.
- Persisted legacy `research` panel state now maps to `briefing`; legacy `feature` panel state maps to `route` while clicked-feature inspection remains controlled by selected-feature state.
- Updated README and added `docs/superpowers/plans/2026-07-21-halo-ux-ui-overhaul.md`.

Generated visual reference:

- Image generation prompt: daylight luxury aviation app logo mark, halo ring and route arrow, pearl ivory background, deep navy route arrow, muted gold ring, sky cyan glow, no text, clean vector-like, premium cockpit planning feel.
- Generated bitmap reference path: `/Users/Selezmassozi/.codex/generated_images/019f78b3-5c3d-7e92-9c5a-ebeab3cc43b5/_image_id_.png`
- Final production mark is implemented as SVG code rather than depending on the bitmap.

Verification:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 26 files / 106 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run.
- Local production browser smoke with `agent-browser`: page loaded, no Next.js error overlay, content was present, and key map/deck controls rendered.
- Screenshot artifact: `/Users/Selezmassozi/.agent-browser/tmp/screenshots/screenshot-1784623261194.png`

Production deployment:

- Vercel production deployment inspected as Ready after final dependency cleanup:
  - Deployment URL: https://halo-flight-planning-j3bktrjcg-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_46aSKpSvkBMJpr58jT8WfJWbrCX6`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned HTTP 200 with style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Vercel runtime log stream showed expected signed-out account request start/401 completion entries and no `api_request_failed` or error-level entry during the final scan.

## 2026-07-21 Mobile UX Regression Fix

Objective: fix the reported mobile layout/scroll regression after the UX/UI overhaul.

Problem:

- On phone-width inspection, too many surfaces competed for the viewport: mission dashboard, map controls, bottom nav, and the command deck.
- The mobile command deck used a nested flex scroll area inside a Radix sheet. The nested container could overflow or feel trapped on mobile instead of behaving like one page-like scroll surface.

Root cause:

- The fixed-position mobile sheet had a child scroll container. Even with `overflow-y-auto`, nested flex scrolling on mobile is fragile unless every parent/child height and touch behavior is exact.
- The app also defaulted the command deck to open, so mobile users could land directly in a dense panel instead of a clean map-first opening.

Fix:

- Changed the default `sidebarOpen` state to `false` so Halo opens to map/dashboard/bottom nav instead of an open deck.
- Hid the mission dashboard and floating map controls while the deck is open.
- Hid phone floating map controls below the small-screen breakpoint to reduce clutter.
- Converted the phone command deck into a full-screen `100dvh` sheet.
- Moved mobile scrolling to the sheet itself with `overflow-y-auto`, `overscroll-contain`, `touch-action: pan-y`, and iOS momentum scrolling.
- Kept desktop behavior as a fixed command deck with internal sidebar scrolling.
- Kept the mobile panel nav and header sticky enough to remain usable while the deck scrolls.

Verification:

- `pnpm test`: passed, 26 files / 106 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed.
- Local production browser smoke at 408 × 593:
  - initial phone state showed map/dashboard/bottom nav with no sheet auto-open;
  - Emergency panel opened full-screen;
  - sheet reported `overflow: auto`, `touch-action: pan-y`, `scrollHeight 851`, `clientHeight 592`;
  - programmatic sheet scroll changed `scrollTop` to 220;
  - no Next.js error overlay appeared.
- Screenshot artifact: `/tmp/halo-mobile-final.png`

Production deployment:

- Committed and pushed the mobile regression fix:
  - Commit: `0c809ea` (`Fix mobile mission deck scrolling`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m37v7806u-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6C5Z2TstyAc3NK21ioKQrLV2LVxw`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, 5 sources, and the active OpenAIP sprite URL.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Vercel runtime log stream showed expected structured account and NOTAM API entries and no error-level entry during the scan.
- Production mobile browser smoke at 408 × 593 against `https://halo-flight-planning.vercel.app`:
  - initial state opened map-first with no sheet/dialog auto-open;
  - Deck button was available;
  - opened deck reported full viewport bounds `408 × 593`;
  - deck reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2216`, `clientHeight 592`;
  - programmatic deck scroll changed `scrollTop` to 220;
  - mobile bottom navigation was hidden while the deck was open.
- Production screenshot artifact: `/tmp/halo-prod-mobile-deck.png`

## 2026-07-21 Unified Planner + Mission Library

Objective: remove the “two decks” feeling from the redesigned shell and add a clear place for multiple mission drafts.

Problem:

- The left mission dashboard and right command deck were structurally different, but visually they competed.
- The app only exposed one active planner state, so it felt like Halo opened to a single mission rather than a mission workspace.
- User-facing “Deck” language made the planning panel sound like a second cockpit surface instead of the one primary planning surface.

Product decision:

- Halo should have one active mission on the map at a time.
- Halo should also have a Mission Library for saved drafts.
- The Planner is the only detailed planning surface.
- Map tools remain separate because they directly manipulate the map, not mission content.

Changes:

- Replaced user-facing “Deck” language with “Planner”.
- Removed the duplicate desktop floating “Open mission deck” control.
- Replaced the large closed-state mission dashboard with a compact Mission Status card.
- Moved detailed mission status, route/fuel/airspace/W&B/admin/data metrics, fuel margin, Save active, and Missions controls into a Planner summary header.
- Renamed the map control concept in code from `MapControlDeck` to `MapToolsRail`.
- Added Mission Library domain types:
  - `HaloMissionStatus`;
  - `HaloMissionPlannerState`;
  - `HaloMissionRecord`.
- Added mission helper logic in `lib/planning/missions.ts` for display names, route labels, saved mission records, upsert/sort, archive, clone, and status mapping.
- Added Zustand Mission Library state and actions:
  - `activeMissionId`;
  - `missionLibrary`;
  - `saveActiveMission`;
  - `createBlankMission`;
  - `duplicateActiveMission`;
  - `loadMission`;
  - `archiveMission`.
- Mission switching auto-saves the current active mission before loading another saved draft.
- Added Mission Library dialog for saving, creating, duplicating, loading, and archiving mission drafts.
- Extended account snapshot JSON to include `activeMissionId` and `missionLibrary`; no database schema change was required.
- Updated README and UX overhaul docs with the unified Planner/Mission Library model.

Verification:

- `pnpm vitest run tests/planning/missions.test.ts`: passed, 6 tests.
- `pnpm vitest run tests/planning/missions.test.ts tests/account/plannerSnapshot.test.ts`: passed, 10 tests.
- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production browser smoke with `agent-browser`:
  - phone 408 × 593 opened to compact Mission Status card, no dialog auto-open;
  - phone top Planner button was present in DOM but hidden with `display: none`, leaving bottom navigation as the phone Planner entry point;
  - Mission Library dialog opened from the Missions button and showed Save active, Duplicate, New mission, saved drafts, Load, and Archive controls;
  - saving the active mission created one saved draft row;
  - mobile Planner sheet opened full-screen and reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2715`, `clientHeight 592`, and successful scroll;
  - desktop 1366 × 768 had no duplicate “Open mission deck” control, only one visible Planner button, and one visible Planner panel after opening;
  - rebuilt phone smoke confirmed old “mission deck” copy was gone and “Planner collects the pilot actions” was present.
- Screenshot artifacts:
  - `/tmp/halo-unified-planner-mobile.png`
  - `/tmp/halo-unified-planner-desktop.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the unified Planner/Mission Library slice:
  - Commit: `92ba0c5` (`Unify planner and add mission library`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-9h5i0w2fj-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_5RhpYUBg7MLcSM44g43BZPPRt536`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, 5 sources, and the active OpenAIP sprite URL.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production phone browser smoke at 408 × 593:
  - old “mission deck” copy was absent;
  - “Planner collects the pilot actions” copy was present;
  - phone top Planner button was hidden with `display: none`;
  - Missions button was visible;
  - Mission Library opened and showed Save active and New mission;
  - Planner sheet opened full-screen, reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2761`, `clientHeight 592`, and successful scroll.
- Production desktop browser smoke at 1366 × 768:
  - duplicate “Open mission deck” control was absent;
  - one visible Planner button was present;
  - opening Planner produced one visible Planner panel;
  - Save active and Missions controls were present in the Planner summary header;
  - closed Mission Status card was hidden while Planner was open.
- Production screenshot artifacts:
  - `/tmp/halo-prod-unified-mobile.png`
  - `/tmp/halo-prod-unified-desktop.png`
- Vercel runtime log stream showed no new error entries during the final scan window.

## 2026-07-21 Planner Hierarchy Follow-up

Objective: address the desktop feedback that the left Active Mission card duplicated the right Planner summary and that Route/Wx/W&B/Brief/Admin/Emerg were not immediately accessible inside the Planner.

Root cause:

- The unified Planner work correctly consolidated mission detail into the right Planner, but the closed-state Active Mission card still rendered at desktop widths.
- The Planner summary header rendered above the panel navigation and consumed too much vertical space, so the actual planning panel options could sit below the visible right panel area.

Fix:

- Desktop and larger layouts no longer render the closed-state Active Mission card. The top mission bar and route status bar remain as the closed desktop context.
- The compact Mission Status card remains available below the desktop breakpoint, where there is no right-side Planner.
- Moved Route/Wx/W&B/Brief/Admin/Emerg navigation above the Planner summary header.
- Compressed the Planner summary header:
  - smaller padding;
  - one-line mission detail;
  - four compact metric chips instead of six;
  - shorter fuel margin section;
  - Save active and Missions actions retained.

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production browser smoke with `agent-browser`:
  - desktop 1366 × 768 closed state had no left Active Mission card;
  - desktop top bar retained one visible Planner button;
  - opening desktop Planner produced one visible panel;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately at `top 227` / `bottom 283`;
  - the closed-state Active Mission heading was hidden while Planner was open;
  - phone 408 × 593 retained the compact Active Mission card and bottom navigation;
  - phone Planner sheet opened full-screen, with Route/Wx/W&B/Brief/Admin/Emerg buttons all visible immediately at `top 131` / `bottom 187`;
  - phone Planner sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2481`, `clientHeight 592`, and successful scroll.
- Screenshot artifact: `/tmp/halo-planner-hierarchy-mobile.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the Planner hierarchy fix:
  - Commit: `753d5d7` (`Fix planner hierarchy on desktop`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-a2xzvscfh-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AU5ESFxhyhYZ3r35b3wJMUaG4CN5`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production desktop browser smoke at 1366 × 768:
  - closed state had no left Active Mission card;
  - one visible Planner button remained in the top bar;
  - no “Open mission deck” copy/control was present;
  - opening Planner produced one visible panel;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately at `top 273` / `bottom 329`;
  - closed Active Mission heading remained hidden while Planner was open.
- Production phone browser smoke at 408 × 593:
  - compact Active Mission card and bottom navigation remained available;
  - top Planner button remained hidden with `display: none`;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately inside the opened sheet at `top 177` / `bottom 233`;
  - phone Planner sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2527`, `clientHeight 592`, and successful scroll.
- Production screenshot artifacts:
  - `/tmp/halo-prod-planner-hierarchy-desktop.png`
  - `/tmp/halo-prod-planner-hierarchy-mobile.png`
- Vercel runtime logs showed expected NOTAM API start/complete entries and no error-level entry during the final scan window.

## 2026-07-21 Planner Tab + Scroll Follow-up

Objective: address feedback that Planner tabs were visible but felt non-functional and the Planner tab content could not scroll reliably.

Root cause:

- The desktop Planner content scroll area was too small because account sync, panel navigation, and the Planner summary all sat outside the scrollable body.
- Browser inspection showed the active W&B content scroll container was only about 148 px high in the problematic layout.
- The summary itself did not participate in the scroll area, so scrolling over the summary could not move the active tab content.

Fix:

- Moved the Planner summary header into the Planner body scroll area.
- Kept Route/Wx/W&B/Brief/Admin/Emerg navigation fixed above the scroll body so tabs are reachable immediately.
- Made the desktop Planner summary compact; phone/tablet keep the fuller in-sheet summary.
- Added a scroll reset when `sidebarPanel` or selected map feature changes so newly selected tabs start at the top.
- Added a CSS `lg:hidden` guard to the closed-state Mission Status card to prevent desktop flicker while the media query initializes.

Verification so far:

- `pnpm typecheck`: passed.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production desktop browser smoke:
  - opening Planner showed Route/Wx/W&B/Brief/Admin/Emerg buttons;
  - clicking W&B made W&B active;
  - W&B content was present;
  - main Planner body scroll region measured `clientHeight 455` instead of the prior ~148 px;
  - programmatic scroll changed `scrollTop` to 420;
  - clicking Brief made Brief active and briefing content appeared.
- Local production phone browser smoke:
  - W&B tab was visible and active after click;
  - W&B content was present;
  - sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2156`, `clientHeight 592`, and successful scroll.
- Screenshot artifacts:
  - `/tmp/halo-planner-tab-scroll-desktop.png`
  - `/tmp/halo-planner-tab-scroll-mobile.png`
- Final verification:
  - `pnpm test`: passed, 27 files / 112 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/E2E command will be run.

Production deployment:

- Committed and pushed the Planner tab/scroll fix:
  - Commit: `787d62e` (`Fix planner tab scrolling`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-kehg2rxq2-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_EvTAe59jKcdQJCUKcoRbsXTwixhW`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production desktop browser smoke at 1366 × 768:
  - opening Planner showed Route/Wx/W&B/Brief/Admin/Emerg buttons;
  - clicking W&B made W&B active and showed W&B content;
  - the main Planner scroll body reported `scrollHeight 1813`, `clientHeight 409`, and successful scroll to `scrollTop 420`;
  - clicking Brief made Brief active and showed briefing content.
- Production phone browser smoke at 408 × 593:
  - sample mission opened inside the Planner sheet;
  - clicking W&B made W&B active and showed W&B/POH content;
  - phone Planner sheet reported `overflow-y: auto`, `scrollHeight 2202`, `clientHeight 592`, and successful scroll to `scrollTop 220`.
- Production screenshot artifacts:
  - `/tmp/halo-prod-tab-scroll-desktop.png`
  - `/tmp/halo-prod-tab-scroll-mobile2.png`
- Vercel runtime log stream attached to deployment `dpl_EvTAe59jKcdQJCUKcoRbsXTwixhW` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Map Overlay Follow-up

Objective: address feedback that the phone viewport still showed a redundant Active Mission card and that the overlay blocked too much of the aviation map.

Problem:

- At phone width, the closed Planner state rendered the top brand bar, a large Active Mission card, and the bottom Planner navigation at the same time.
- The Active Mission card duplicated the mission summary already available inside Planner and covered the primary map area, making the map feel unusable.

Root cause:

- `components/shell/HaloAppShell.tsx` rendered `MissionStatusCard` whenever `!plannerOpen && !isDesktop`.
- A previous desktop-specific cleanup intentionally kept the card for mobile, but that conflicted with the locked map-first mobile design.

Solution:

- Removed the closed-state `MissionStatusCard` render path and component from `HaloAppShell`.
- Removed the now-unused sample-route/primary-action overlay handlers and related imports.
- Kept mission status/actions inside the Planner sheet and Mission Library dialog.
- Kept the mobile bottom navigation as the entry point for Route, Wx, W&B, Brief, Admin, and Emergency.
- Updated the unified Planner design note: closed phone state must be map-first and must not render a mission card over the map.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Prevention:

- Closed mobile state should be reviewed as a map-availability surface first.
- Mission summaries may appear inside Planner/Missions, but not as a persistent phone overlay unless the user explicitly opens a planning surface.

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 408 × 593:
  - no `Active mission` copy present in the closed state;
  - map region present;
  - bottom Route/Wx/W&B/Brief/Admin/Emerg navigation present;
  - no large mission-card overlay present;
  - bottom navigation opened the Planner sheet;
  - Planner sheet retained all six planning tabs and reported `scrollHeight 3090`, `clientHeight 592`.
- Screenshot artifacts:
  - `/tmp/halo-mobile-card-fix.png`
  - `/tmp/halo-mobile-card-fix-planner.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile overlay fix:
  - Commit: `9666ac5` (`Remove mobile mission card overlay`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-mc0bjnrnn-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_wM2ttxsTYCtUQgm159BQktfV6co1`
- Production phone browser smoke at 408 × 593 on `https://halo-flight-planning.vercel.app/#8.86/-26.1387/28.1843`:
  - no `Active mission` copy present in the closed state;
  - no `Plan a new mission` closed-state heading present over the map;
  - no large mission/status text overlay detected;
  - bottom Route/Wx/W&B/Brief/Admin/Emerg navigation present;
  - bottom navigation opened the Planner sheet;
  - W&B tab activated and W&B/POH content appeared;
  - Planner sheet reported `scrollHeight 2202`, `clientHeight 592`, and successful scroll to `scrollTop 220`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA` when called with valid airport waypoint types;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Note: an initial NOTAM smoke call returned HTTP 400 because the ad-hoc request omitted required waypoint `type` values; route schema inspection confirmed this was an invalid smoke payload, not a production regression.
- Production screenshot artifacts:
  - `/tmp/halo-prod-mobile-card-fix.png`
  - `/tmp/halo-prod-mobile-card-fix-wb.png`
- Vercel runtime log stream attached to deployment `dpl_wM2ttxsTYCtUQgm159BQktfV6co1` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Planner Bottom Tabs Follow-up

Objective: address feedback that the Route/Wx/W&B/Brief/Admin/Emerg tab bar should stay at the bottom while the mobile Planner sheet is open, matching the closed map bottom navigation pattern.

Problem:

- The mobile Planner sheet reused the desktop-style section switcher, rendering the tabs near the top of the sheet below the logo/account area.
- When pilots scrolled through dense sections such as Flight Admin or W&B, the tab controls were not under the thumb and did not match the map-first mobile interaction model.

Root cause:

- `components/sidebar/Sidebar.tsx` rendered one shared `nav` with `sticky top-[65px]` for all Planner variants.
- `SheetContent` handled sheet scrolling directly, so there was no internal layout slot for a bottom-pinned sheet nav.

Solution:

- Extracted the Planner section switcher into `PlannerPanelNavigation`.
- Desktop variant keeps the existing top sticky section switcher.
- Sheet variant renders the switcher after the scrollable content as a bottom navigation bar.
- Changed the mobile SheetContent from direct vertical scrolling to `overflow-hidden`; `Sidebar` now owns the internal scroll region above the bottom nav.
- Kept content scroll reset on panel changes so each section opens at the top of the scrollable content.
- Updated the unified Planner design note to require bottom-pinned tabs inside the phone Planner sheet.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 579 × 593:
  - opening Planner from bottom navigation placed the sheet section nav at `top 510`, `bottom 593`;
  - scrollable content area ended at `bottom 510`, above the nav;
  - content scroll worked with `scrollTop 180`;
  - Route → W&B → Admin tab switches updated the active section while the nav stayed at `top 510`, `bottom 593`;
  - W&B and Admin panel content appeared after switching.
- Screenshot artifacts:
  - `/tmp/halo-bottom-tabs-local-route.png`
  - `/tmp/halo-bottom-tabs-local-async.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile bottom-tab fix:
  - Commit: `da86fcf` (`Pin mobile planner tabs to bottom`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-9oez8nr4g-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6CKmkfFKAAs6goAESCFMcd6NXY1B`
- Production phone browser smoke at 579 × 593 on `https://halo-flight-planning.vercel.app/#7.74/-26.103/28.284`:
  - opening Planner from bottom navigation placed the sheet section nav at `top 510`, `bottom 593`;
  - Route → W&B → Admin tab switches updated the active section while the nav stayed at `top 510`, `bottom 593`;
  - scrollable content stayed above the nav and reported `scrollTop 180`;
  - W&B and Admin panel content appeared after switching.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifact:
  - `/tmp/halo-bottom-tabs-prod.png`
- Vercel runtime logs showed expected NOTAM 200 and signed-out account 401 entries, with no runtime error-level entries during the observation window.

## 2026-07-22 Mobile Planner Summary Scope Follow-up

Objective: address feedback that the Planner mission summary appeared inside every mobile Planner tab, the closed map bottom nav showed a selected tab, and narrow widths clipped the four Route/Fuel/W&B/Admin summary cards.

Problem:

- The Planner summary appeared above Wx, W&B, Brief, Admin, and Emergency, even though it is route-planning context.
- Closed map view highlighted whichever Planner panel was last opened, making the map state look like a selected planning tab.
- At narrow phone widths, the four summary cards stayed in two columns and clipped route/fuel/W&B/admin text.

Root cause:

- `components/sidebar/Sidebar.tsx` rendered `plannerHeader` unconditionally for every non-feature Planner panel.
- `components/shell/HaloAppShell.tsx` passed `sidebarPanel` into `MobileNavigation` and applied active styling in closed map view.
- `PlannerSummaryHeader` used a fixed two-column metric grid and single-line metric values.

Solution:

- Render `plannerHeader` only when `sidebarPanel === 'route'`.
- Remove active/selected styling from the closed map bottom navigation; active state is reserved for the open Planner sheet.
- Change the mobile Planner summary metrics to one column below 430 px and two columns when width allows.
- Allow metric values to wrap to two lines and allow fuel margin text to wrap instead of truncating.
- Updated the unified Planner design note to document Route-only summary scope and narrow-phone metric behavior.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 579 × 593:
  - closed map bottom navigation rendered six tabs with `activeCount 0`;
  - Route panel showed exactly one Planner summary;
  - W&B, Brief, and Admin each showed zero Planner summary instances after switching.
- Local production narrow-phone browser smoke at 335 × 593:
  - Route panel showed exactly one Planner summary;
  - summary metric grid computed one column at `305px`;
  - Route/Fuel/W&B/Admin cards each measured `305px` wide;
  - W&B and Admin summary cards expanded to 68 px height for wrapped text;
  - bottom Planner nav remained pinned at `top 510`, `bottom 593`.
- Screenshot artifacts:
  - `/tmp/halo-mobile-map-no-active-local.png`
  - `/tmp/halo-mobile-summary-route-only-local.png`
  - `/tmp/halo-mobile-narrow-route-summary-local.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile Planner summary-scope fix:
  - Commit: `7f3cf90` (`Scope planner summary to route tab`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-ojx9wti72-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_8mQBtTTBGzYKNJCTYdcVqWjvT5Fz`
- Production phone browser smoke at 579 × 593 on `https://halo-flight-planning.vercel.app/#7.6/-26.132/27.967`:
  - closed map bottom navigation rendered six tabs with `mapActiveCount 0`;
  - Route panel showed one Planner summary;
  - W&B, Brief, and Admin each showed zero Planner summary instances;
  - W&B and Admin panel content appeared after switching.
- Production narrow-phone browser smoke at 335 × 593 on `https://halo-flight-planning.vercel.app/#7.99/-26.071/28.148`:
  - Route panel showed one Planner summary;
  - summary metric grid computed one column at `305px`;
  - Route/Fuel/W&B/Admin cards each measured `305px` wide;
  - W&B and Admin summary cards measured 68 px high for wrapped text;
  - bottom Planner nav remained pinned at `top 510`, `bottom 593`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifacts:
  - `/tmp/halo-summary-scope-prod.png`
  - `/tmp/halo-narrow-summary-prod.png`
- Vercel runtime log stream attached to deployment `dpl_8mQBtTTBGzYKNJCTYdcVqWjvT5Fz` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Wx Tab Alignment Follow-up

Objective: address feedback that the Wx tab looked lower than the other Planner tabs when selected.

Problem:

- The bottom Planner tabs had the same measured outer height, but the Wx active state could visually read as lower/uneven because the button internals were not hard-locked and the active bottom-sheet state used a vertical drop shadow.

Root cause:

- `PlannerPanelNavigation` and the closed map `MobileNavigation` used `min-h-12` plus direct icon/text children.
- Active Planner tabs added a `shadow-md` below the selected button, which created a visual lower-edge difference in the bottom sheet even though measured geometry stayed stable.

Solution:

- Changed mobile tab buttons from `min-h-12` to fixed `h-12`.
- Added fixed icon and label slots inside each tab button.
- Added `leading-none` and `overflow-hidden` to remove text/icon baseline variance.
- Removed the active-state drop shadow for bottom-sheet Planner tabs while keeping the black active fill.
- Kept desktop top Planner tab shadow behavior unchanged.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Production pre-fix measurement at 579 × 593 and 335 × 593 showed all buttons had stable outer geometry, confirming this was a visual/internal alignment issue rather than nav movement.
- Local production phone smoke at 335 × 593 after the fix:
  - Route, Wx, and W&B active states all measured button `top 526`, `bottom 574`, `height 48`;
  - every tab measured icon slot `top 534` and label slot `top 554`;
  - active Wx used the same fixed slots as inactive tabs.
- Local production phone smoke at 579 × 593 after the fix:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`.
- Screenshot artifacts:
  - `/tmp/halo-wx-tab-jitter-prod.png`
  - `/tmp/halo-wx-tab-jitter-335-prod.png`
  - `/tmp/halo-wx-tab-normalized-local-335.png`
  - `/tmp/halo-wx-tab-normalized-local-579.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile tab alignment fix:
  - Commit: `0d0258b` (`Normalize mobile planner tab alignment`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-h6ggt1d7e-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FFLUozYGr62vXvNpDNDfd9BkRVkb`
- Production phone browser smoke at 335 × 593:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`;
  - active Wx had no bottom active shadow.
- Production phone browser smoke at 579 × 593:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`;
  - active Wx had no bottom active shadow.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifacts:
  - `/tmp/halo-wx-tab-normalized-prod-335.png`
  - `/tmp/halo-wx-tab-normalized-prod-579.png`
- Vercel runtime log stream attached to deployment `dpl_FFLUozYGr62vXvNpDNDfd9BkRVkb` and showed no runtime error entries during the observation window.

## 2026-07-22 Route / Brief Scanability and Mobile Tab Geometry Follow-up

Objective: address pilot-facing UX feedback that the Route and Brief panels felt like information overload, that destructive route actions were mixed into the main route flow, and that the Wx tab still appeared to sit lower than the other bottom tabs.

Problem:

- Route and Brief presented too many controls and review outputs at the same visual hierarchy.
- The Route panel placed `Clear route` immediately after the navigation log, which made a destructive action feel like part of normal route review.
- The Brief panel exposed raw briefing text directly inside the main tab, making the tab hard to scan on phone screens.
- The mobile nav buttons already measured similarly, but their internal layout still relied on flex centering and icon/text line boxes that could visually read unevenly.

Root cause:

- The panels lacked explicit workflow grouping. Build/edit controls, operational review, training content, and export actions were stacked together.
- Destructive route management had no separated “actions” zone.
- Raw briefing content was visually dominant instead of secondary.
- The tab buttons did not use fixed internal grid rows for icon and label slots.

Solution:

- Added reusable `PanelGroupHeader` sections for lightweight cockpit-style categorization.
- Reorganized Route into:
  - `Build / Route builder`;
  - `Review / Pilot scan`;
  - `Sequence / Waypoints and map`;
  - a separate `Route actions` block for `Clear route`.
- Combined manual coordinate entry into the Add Waypoint block so waypoint creation is grouped in one place.
- Reorganized Brief into:
  - `Decision / Pilot digest`;
  - `Setup / Dispatch details`;
  - `Reviews / Operational checks`;
  - `Training / Checkride navlog`;
  - `Export / Briefing package`.
- Moved raw briefing text behind a collapsed `Show raw briefing text` disclosure while keeping Print, Text, Backup Pack, and Copy actions immediately reachable.
- Converted bottom planner tab buttons in both map view and planner-sheet view to fixed CSS grid rows for icon and label slots.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone smoke at 579 × 593:
  - Route panel exposed section headings `Route builder`, `Pilot scan`, and `Waypoints and map`;
  - Brief panel exposed section headings `Pilot digest`, `Dispatch details`, `Operational checks`, `Checkride navlog`, and `Briefing package`;
  - raw briefing text was collapsed behind `Show raw briefing text`;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- Local production phone smoke at 335 × 593:
  - Route summary cards stacked cleanly without horizontal clipping;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the UX scanability fix:
  - Commit: `8432866` (`Improve mobile planner scanability`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m1ree55gg-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_4Fr7L6NM7DV63eua7bY7hY6767YR`
- Production phone browser smoke at 335 × 593:
  - map view loaded with bottom nav and no selected planner tab state;
  - Route panel headings were `Halo planner`, `Plan a new mission`, `Route builder`, `Pilot scan`, and `Waypoints and map`;
  - Brief panel headings were `Halo planner`, `Pilot digest`, `Dispatch details`, `Operational checks`, `Checkride navlog`, and `Briefing package`;
  - Briefing package raw text disclosure was closed by default;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Vercel runtime log stream attached to deployment `dpl_4Fr7L6NM7DV63eua7bY7hY6767YR` and showed structured account API logs with the expected signed-out 401 warning and no runtime error entries during the observation window.

## 2026-07-22 OpenAIP-like Ground Basemap Detail

Objective: make Halo's ground/context map match the useful detail level visible in OpenAIP's own map while preserving Halo's OpenAIP aviation overlay.

Problem:

- The aviation overlay was present, but the underlying ground map was too blank compared with OpenAIP.
- Roads, terrain/landcover, water, settlement labels, and major place context were not visible enough for pilots to orient themselves.

Root cause:

- Halo replaced OpenAIP's original Mapbox outdoors-style base map with a single MapTiler `basic-v2` raster layer.
- The converted OpenAIP style kept the original `land` background layer. That layer rendered above Halo's raster basemap and covered ground details.
- A follow-up probe confirmed MapTiler `outdoor-v2` tiles returned real detailed image content for the Johannesburg/Pretoria tile, while the visible map stayed muted until the OpenAIP background layer was removed.

Solution:

- Added `lib/openaip/basemap.ts` to centralize basemap selection.
- Changed the default MapTiler basemap from sparse `basic-v2` to OpenAIP-like `outdoor-v2`.
- Added optional env override `NEXT_PUBLIC_MAPTILER_BASE_STYLE` for later tuning without code changes.
- Updated OpenAIP style conversion to remove source-less `background` layers because Halo now owns the ground basemap.
- Preserved OpenAIP vector aviation layers, authentic sprites, click behavior, and attribution.
- Documented the new basemap env option in `README.md` and `.env.local.example`.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused tests:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 8 tests.
  - Verified default basemap is `outdoor-v2`.
  - Verified unsafe style overrides fall back to `outdoor-v2`.
  - Verified OpenAIP `land` background layers are stripped.
- Full checks:
  - `pnpm test`: passed, 28 files / 116 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` returned `maptiler-base` using `outdoor-v2`;
  - `maptiler-base` remained the first layer;
  - no converted `background` layer remained;
  - converted style had 95 layers and 5 sources.
- Local production tile smoke:
  - center MapTiler `outdoor-v2` tile for the OpenAIP comparison area returned HTTP 200, `image/png`, and detailed road/place/water/terrain imagery.
- Local production browser smoke:
  - Johannesburg/Pretoria map view rendered ground context under the aviation overlay, including roads, place labels, water, terrain/landcover, and settlement names.
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the basemap fix:
  - Commit: `a3f65ee` (`Restore OpenAIP-like ground basemap detail`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-lprjso2hw-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_HE6Yp5aTockyF3Rj4TnLteskR9ZR`
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned `maptiler-base` using `outdoor-v2`;
  - `/api/openaip/style` had no converted `background` layer;
  - `/api/openaip/style` returned 95 layers and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production browser smoke:
  - Johannesburg/Pretoria comparison view loaded on the production alias;
  - map rendered MapTiler attribution;
  - outdoor basemap details were visible under OpenAIP aviation layers, including roads, place labels, water, landcover/terrain, and settlements.
- Production screenshot artifact:
  - `/tmp/halo-outdoor-basemap-prod-z9.png`
- Vercel runtime log stream attached to deployment `dpl_HE6Yp5aTockyF3Rj4TnLteskR9ZR` and showed:
  - `/api/openaip/style` structured request logs completing with HTTP 200;
  - `/api/account/snapshot` structured request logs completing with the expected signed-out HTTP 401 warning;
  - no runtime error entries during the observed requests.
- Note: the `vercel logs` command ended with Vercel's query-duration warning after the observation window; the observed request logs themselves were clean.

## 2026-07-22 Minimal OpenAIP-like Ground Labels

Objective: correct the ground basemap after user feedback that `outdoor-v2` added too much city/town information. Keep Halo closer to OpenAIP's minimal ground context and only reveal ground town/city detail at close zoom.

Research / evidence:

- OpenAIP's public `openaip-map-resources` project provides the aviation map style/resources and is designed to complement a Mapbox basemap rather than replace it with a dense city map.
- The live OpenAIP style metadata identifies an outdoors-style origin but keeps map-label/POI density intentionally constrained.
- Candidate MapTiler raster probes over the Johannesburg/Pretoria comparison area showed:
  - `outdoor-v2`: too much settlement/terrain/city context at medium zoom;
  - `dataviz-light`: quieter, but still had broad city labels in rendered map tiles;
  - `backdrop`: quieter, but still had faint labels in some medium-zoom tiles;
  - `basic-v2`: best close-zoom match for minimal road/place/water context.

Problem:

- The previous `outdoor-v2` default solved missing ground detail but over-corrected the map into a city/town map.
- Raster basemap labels are baked into the tile image, so Halo cannot selectively hide only towns/cities with MapLibre paint/layout filters.
- The user's target behavior was ground city/town context appearing only around the close `5 km` scale, not at broad/medium route-planning zooms.

Root cause:

- A single raster basemap cannot provide OpenAIP-like label density controls across zooms.
- Even low-noise MapTiler raster styles can still contain baked city/town labels at medium zoom.

Solution:

- Kept the real previous fix that strips OpenAIP source-less `background` layers so Halo's own basemap is not covered.
- Changed the default close-zoom MapTiler style back to minimal `basic-v2`.
- Removed the low-detail raster basemap layer entirely for broad/medium zooms.
- Added a neutral `halo-ground-background` layer from zoom 0 to 11.
- Added `maptiler-base` raster `basic-v2` only from zoom 11 to 22, aligning city/town ground detail with close planning scale.
- Preserved OpenAIP aviation vectors/sprites/click behavior above the base.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 9 tests.
  - `pnpm typecheck`: passed.
  - `pnpm build`: passed.
- Full checks:
  - `pnpm test`: passed, 28 files / 117 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` first layer was `halo-ground-background`, type `background`, zoom 0-11;
  - second layer was `maptiler-base`, type `raster`, style `basic-v2`, zoom 11-22;
  - no MapTiler low-detail raster source remained;
  - OpenAIP aviation layers remained above the base.
- Local production browser smoke:
  - z10 / 5 nm scale showed no ground city/town labels; aviation labels remained visible;
  - z11 / close scale showed `basic-v2` ground roads/place/water context under the aviation overlay.
- Screenshot artifacts:
  - `/tmp/halo-neutral-basemap-local-z10.png`
  - `/tmp/halo-basic-detail-local-z11.png`
- Production deployment:
  - Commit: `3658ac4`
  - Deployment URL: https://halo-flight-planning-eak6f771s-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_7BYk12tGvGRwPnMLMZnyhnGoTygd`
- Production API smoke:
  - `/api/openaip/style` first layer is `halo-ground-background`, type `background`, zoom 0-11;
  - `/api/openaip/style` second layer is `maptiler-base`, type `raster`, style `basic-v2`, zoom 11-22;
  - no `maptiler-base-low-detail` source is present;
  - OpenAIP aviation layers remain above the base.
- Production browser smoke:
  - z10 comparison view showed no broad city/town basemap clutter while aviation labels remained visible;
  - z11 comparison view showed close-zoom `basic-v2` roads/place/water context under OpenAIP aviation overlays.
- Production screenshot artifacts:
  - `/tmp/halo-neutral-basemap-prod-z10.png`
  - `/tmp/halo-basic-detail-prod-z11.png`
- Vercel runtime log scan attached to deployment `dpl_7BYk12tGvGRwPnMLMZnyhnGoTygd` showed:
  - `/api/openaip/style` structured request logs completing with HTTP 200;
  - `/api/account/snapshot` structured request logs completing with the expected signed-out HTTP 401 warning;
  - no runtime error entries during the observed requests.
- No Playwright/E2E command was run.

## 2026-07-22 OpenAIP Ground Rendering Deep Dive + Vector Basemap Correction

Objective: correct the previous ground-map fix after user feedback that a blank/neutral ground layer until zoom 11 does not match how OpenAIP actually behaves. User requested no Halo visual inspection after the fix; manual visual acceptance remains user-owned.

Research / evidence:

- OpenAIP's public map page is a Svelte app that initializes `mapbox-gl` with `style: PUBLIC_MAPBOX_STYLE_DEFAULT_URI`.
- OpenAIP's public constants identify the default style endpoint as `https://api.tiles.openaip.net/api/styles/openaip-default-style.json`.
- The fetched OpenAIP default style is named `openaip-mono`, style spec version 8, with 176 layers.
- OpenAIP does not render ground detail as one raster tile layer. Its style uses:
  - `composite`: `mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v8`;
  - `mapbox-dem`;
  - `openaip-data`;
  - GeoJSON helper sources for selected/highlighted features.
- The OpenAIP ground map is approximately 81 vector layers from the `composite` source, including `landcover`, `landuse`, `water`, `waterway`, `hillshade`, `contour`, `road`, `admin`, `natural_label`, `place_label`, and `poi_label`.
- City/town/place labels are vector symbol layers, not raster text. OpenAIP gates settlement visibility with filters such as `filterrank` and zoom/rank expressions.

Problem:

- Halo's previous correction removed detailed ground raster at broad/medium zoom and replaced it with a neutral background. That reduced clutter, but it did not match OpenAIP's actual rendering model.
- Halo also cannot directly use OpenAIP's original `mapbox://` composite source in MapLibre without a compatible Mapbox source/token path.

Root cause:

- Halo was treating the ground map as a single raster basemap.
- OpenAIP's map is a layered vector composition where ground features and labels can be individually filtered/tuned beneath aviation layers.

Solution:

- Changed the default Halo ground provider back to `outdoor-v2`, but as a MapTiler vector style, not a raster tile layer.
- The OpenAIP style route now fetches the MapTiler vector style JSON server-side and merges its vector sources/layers underneath OpenAIP aviation layers.
- The converter still removes OpenAIP's Mapbox-only `composite` and `mapbox-dem` sources/layers because Halo runs MapLibre.
- Ground layers are prefixed with `halo-ground-*` to avoid collisions.
- Ground symbol layers keep text but remove unrelated MapTiler/Mapbox `icon-image` references so Halo's OpenAIP sprite sheet is not polluted with basemap POI icons.
- Duplicate ground aerodrome labels are removed because OpenAIP aviation layers already provide aerodrome labels/icons.
- Label density is tuned closer to OpenAIP:
  - city labels start at zoom 8 and stop at zoom 15;
  - town labels start at zoom 9 and stop at zoom 15;
  - village labels start at zoom 10 and stop at zoom 15;
  - local place/suburb labels start at zoom 11;
  - road labels start at zoom 10;
  - POI/outdoor POI labels start no earlier than zoom 14.
- If the vector style cannot be fetched, Halo falls back to a full-zoom basic raster layer rather than a blank map.
- Quoted MapTiler env values are normalized before provider URLs are built.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 11 tests.
  - `pnpm typecheck`: passed.
- Full checks:
  - `pnpm test`: passed, 28 files / 119 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `934c556`
  - Deployment URL: https://halo-flight-planning-lgkqypu7l-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_2uR3mNiCjhoz3brC37AKgwH5SJxm`
- Production API smoke:
  - `/api/openaip/style` returned `metadata.haloBaseMap.source = maptiler-vector`;
  - `/api/openaip/style` returned `metadata.haloBaseMap.style = outdoor-v2`;
  - `/api/openaip/style` returned `metadata.haloBaseMap.mode = vector-style`;
  - `/api/openaip/style` returned 113 `halo-ground-*` vector ground layers;
  - no `halo-raster-base` source was present;
  - `halo-ground-City labels` was tuned to zoom 8-15;
  - `halo-ground-Town labels` was tuned to zoom 9-15.
- Vercel runtime log scan attached to deployment `dpl_2uR3mNiCjhoz3brC37AKgwH5SJxm` showed `/api/openaip/style` completing with HTTP 200 and no runtime error entries during the observed request.
- No Playwright/E2E command was run.
- No Halo browser/visual inspection was performed after the fix, per user request.

## 2026-07-22 Vector Basemap Incident Fix

Objective: fix the production map degradation introduced by the vector-basemap deployment and keep production usable while correcting the root cause.

Problem:

- Production showed Halo's degraded grid/fallback state instead of the aviation map.
- The browser-visible MapLibre error was: `layers[106].filter[1]: Expected 2 arguments, but found 18 instead.`
- Layer `106` was a MapTiler vector ground label layer merged below OpenAIP aviation layers.

Immediate mitigation:

- Promoted the last known working Vercel deployment before continuing local fixes, so the production alias was not left on the broken vector-basemap deployment.
- Promoted deployment: `dpl_7acKpCQPo31kJtc5v29Uxxdd4AtF`.

Root cause:

- MapTiler's vector style uses legacy Mapbox filter syntax such as `["!in", "class", ...values]`.
- Halo's first converter path changed `!in` into `["!", ["in", ...args]]`, but MapLibre's expression-form `in` accepts exactly two arguments after the operator.
- This produced invalid generated style JSON, so MapLibre rejected the style and Halo fell back to the degraded planning grid.
- The `/api/openaip/style` response was also browser/cacheable for up to one hour, which could let an already-broken generated style linger after a deploy.

Solution:

- Converted legacy `in`, `!in`, comparison, and `!has` filters into MapLibre expression filters.
- Converted `$type` and `$id` legacy property selectors to MapLibre-compatible expressions.
- Normalized single-value and array-style legacy `in` filters.
- Changed `/api/openaip/style` responses to `Cache-Control: no-store` because the route generates a runtime-converted style from current server configuration.
- Added unit coverage for the exact failure shape from the MapTiler ground style.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/tilePath.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 12 tests.
- Full approved checks:
  - `pnpm test`: passed, 28 files / 120 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` returned `Cache-Control: no-store`;
  - layer `106` was converted to `["!", ["in", ["get", "class"], ["literal", [...]]]]`;
  - no legacy suspicious generated filters remained in the local style JSON.
- Local production browser diagnostic smoke:
  - Opened a cache-busted URL in production mode and checked text output only;
  - the previous `Map degraded` / `Expected 2 arguments` text was absent;
  - MapLibre attribution text was present.
- No Playwright/E2E command was run.
