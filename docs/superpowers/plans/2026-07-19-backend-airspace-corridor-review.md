# Backend Airspace Corridor Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Replace the viewport-only airspace check with a server-side OpenAIP Core API route-corridor review that works across the full planned route.

**Architecture:** Keep OpenAIP credentials server-side. The client submits route coordinates and cruise altitude to a read-only Next.js route handler. The handler validates input, splits long legs into bounded bbox queries, fetches OpenAIP Core airspaces, filters them by route/polygon intersection or corridor distance, classifies altitude conflicts, and returns the existing `RouteAirspaceReview` model.

**Tech Stack:** Next.js 14 App Router, TypeScript, MapLibre GL JS fallback review, OpenAIP Core API, Vitest.

---

## File Structure

- Create `app/api/openaip/airspace-review/route.ts`: read-only server route review endpoint.
- Create `lib/planning/airspaceCorridor.ts`: bbox, route splitting, polygon intersection, and corridor-distance helpers.
- Modify `lib/planning/airspaceReview.ts`: allow review source/corridor context in alert reasons.
- Modify `types/planning.ts`: add backend review source/status/count metadata.
- Modify `stores/mapStore.ts`: keep rendered and Core API reviews separately and expose the best active review.
- Create `components/planning/RouteAirspaceReviewSync.tsx`: client-side route review fetcher.
- Modify `app/(dashboard)/page.tsx`: mount the sync component once.
- Modify `components/map/Map.tsx`: write rendered review as fallback data.
- Modify `components/sidebar/Sidebar.tsx`: label Core API vs rendered review evidence.
- Add tests in `tests/planning/airspaceCorridor.test.ts` and extend `tests/planning/airspaceReview.test.ts`.
- Update docs and session log.

## Tasks

### Task 1: Pure Corridor Geometry

- [x] Add bbox padding and route segment splitting helpers.
- [x] Add polygon/route crossing detection.
- [x] Add corridor-distance detection for airspaces close to but not crossed by the centerline.
- [x] Add unit tests for crossing, inside-polygon, near-corridor, outside-corridor, and long-route splitting.

### Task 2: Server Route Handler

- [x] Add validated `POST /api/openaip/airspace-review`.
- [x] Use OpenAIP Core API `GET /airspaces` with bounded `bbox` queries.
- [x] Deduplicate airspaces by `_id`.
- [x] Return complete, partial, unavailable, and rate-limited review states without exposing the API key.

### Task 3: Client Integration

- [x] Keep browser-rendered review as a fallback.
- [x] Add Core API review sync for route/altitude changes.
- [x] Prefer Core API complete/partial/checking results over rendered fallback.
- [x] Show review source, query count, candidate count, and corridor width in UI.

### Task 4: Verification and Release

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Verify local/prod API route behavior.
- [x] Verify production browser route review and briefing output.
- [x] Deploy to Vercel and push the PR branch.

## Verification Evidence

- OpenAIP docs source: `https://docs.openaip.net/` loads Swagger specs from `https://api.core.openaip.net/api/system/specs/v1/schema.json`.
- Verified Core API supports `GET /airspaces` with `bbox`, `limit`, `fields`, `type`, `icaoClass`, and activation filters.
- `pnpm test`: 29 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/airspace-review`.
- Production deployment inspected as Ready:
  - Deployment URL: `https://halo-flight-planning-h7r99c6ns-pilotmerch-gmailcoms-projects.vercel.app`
  - Production alias: `https://halo-flight-planning.vercel.app`
  - Deployment ID: `dpl_FhHKr9zxqQFTeis7AdiCbHCEPxSR`
- Production API smoke test for FAOR→FALA at 6,500 ft returned `source=openaip-core`, `status=complete`, `queryCount=1`, `candidateCount=24`, `alerts=18`, and `critical=4`.
- Production browser showed the Core API review with 4 critical items, 1 query, 24 candidates, and a 5 nm corridor.
- Production briefing/export text included the Core API corridor review and critical risk item.
