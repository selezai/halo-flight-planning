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

## 2026-07-19 Launch Readiness: Auth, W&B, South Africa NOTAM, Observability

Objective: implement the remaining launch-readiness batch without using Playwright/E2E as a completion gate.

Decisions:

- Halo launches South Africa-first, so the default NOTAM provider is official manual briefing mode, not FAA.
- SACAA/ATNS live NOTAM scraping is deferred until an authorized data path exists.
- FAA NOTAM integration remains available only behind `NOTAM_PROVIDER=faa`.
- W&B presets remain available for performance, but operational W&B requires user-entered aircraft-specific POH/AFM data.
- Supabase account sync code can ship, but production database mutation is blocked until the live schema and RLS policies are inspected, migration is applied, and authenticated RLS smoke tests pass.
- Authentic OpenAIP sprites remain active/default, but commercial/paid launch is blocked until written OpenAIP permission is obtained or replacement assets are used.
- Manual E2E/browser testing is owned outside this implementation batch; automated gate is unit tests, typecheck, lint, and build.

Changes:

- Added optional W&B configuration/loading to `AircraftProfile`.
- Added W&B calculation for ramp, takeoff, and landing with `unconfigured`, `incomplete`, `within-limits`, `caution`, and `out-of-limits` statuses.
- Added Aircraft tab W&B setup UI for POH/AFM empty weight/arm, aircraft limits, fuel config, loading stations, and CG envelope.
- Added W&B status to Briefing, risk review, and exported briefing text.
- Refactored NOTAM review to provider-neutral source/status types.
- Added South Africa official/manual NOTAM provider with ATNS File2Fly/SACAA source links and route-location preparation.
- Kept FAA provider path behind `NOTAM_PROVIDER=faa`.
- Added Supabase SSR/browser clients, auth callback route, magic link/Google sign-in UI, account sync panel, API-only snapshot persistence, and local/cloud merge controls.
- Added local Supabase migration for `saved_routes`, `aircraft_profiles`, and `user_preferences` with owner-scoped RLS policies using `TO authenticated` and `auth.uid() = user_id`.
- Added Vercel Analytics and Speed Insights.
- Added app/global error boundaries that log non-secret failure metadata.
- Added structured API request logging with route, method, status, duration, and Vercel request id.
- Removed Playwright from CI launch verification path.
- Strengthened OpenAIP sprite attribution and added commercial permission checklist.

Local verification so far:

- `pnpm test -- tests/planning/weightBalance.test.ts`: passed.
- `pnpm test -- tests/planning/notams.test.ts tests/planning/navigation.test.ts`: passed.
- `pnpm test -- tests/supabase/accountSnapshot.test.ts`: passed.
- `pnpm typecheck`: passed after the Supabase/auth/account snapshot slice.

Review-driven hardening:

- Upgraded Next.js from 14.2.0 to 15.5.18 after `pnpm audit --prod --audit-level high` identified launch-blocking Next advisories.
- Migrated dashboard client boundary and dynamic route params for Next 15 build compatibility.
- Removed global wildcard API CORS headers.
- Restricted Supabase middleware to app/auth/account paths.
- Fixed auth callback redirect handling to allow same-origin relative paths only.
- Changed Supabase persistence to require server-only `SUPABASE_SERVICE_ROLE_KEY`, revoke direct browser DML grants, and save through an atomic `save_account_snapshot` RPC in the migration.
- Restricted account snapshot route id to `primary`.
- Connected W&B loaded fuel after taxi to route fuel status/risk/briefing.
- Preserved station overloads through aircraft-profile sanitization and added regression coverage.
- Fixed NOTAM client location fallback to avoid user waypoint pseudo-idents.
- Fixed FAA-provider unavailable source URL.
- Updated stale Playwright specs for the new South Africa manual default even though Playwright is not part of this batch gate.

Final local verification:

- `pnpm audit --prod --audit-level high`: passed; remaining audit output is moderate-only.
- `pnpm test`: 11 files / 59 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors. Next 15 reports `next lint` deprecation for future migration.
- `pnpm build`: passed on Next.js 15.5.18.
