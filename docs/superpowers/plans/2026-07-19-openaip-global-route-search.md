# OpenAIP Global Route Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Replace the route panel's starter-only airport/navaid search with a global OpenAIP Core search while keeping instant starter results as fallback.

**Architecture:** Add a read-only server route that queries OpenAIP Core `GET /airports` and `GET /navaids` with validated search input and server-side credentials. The client keeps starter waypoint results immediately visible, debounces the OpenAIP request, deduplicates results, and lets pilots add returned airports/navaids directly to the route.

**Tech Stack:** Next.js 14 App Router, TypeScript, OpenAIP Core API, React hooks, Vitest.

---

## Tasks

### Task 1: Server Search Proxy

- [x] Add `app/api/openaip/search/route.ts`.
- [x] Validate `q`, `limit`, and optional `country`.
- [x] Query OpenAIP Core `/airports` and `/navaids` with narrow `fields`.
- [x] Normalize results into Halo `Waypoint` objects without exposing the API key.

### Task 2: Client Search Integration

- [x] Add debounced OpenAIP search state to the route panel.
- [x] Merge starter and OpenAIP results by type/ident first, then stable source/name/coordinate fallback.
- [x] Show loading, unavailable, warning, and empty states.
- [x] Preserve instant starter search for short/empty queries.

### Task 3: Verification and Release

- [x] Add parser/normalizer unit coverage.
- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Verify production API and browser search.
- [x] Deploy to Vercel production.
- [ ] Push PR branch.

## Research and Decisions

- OpenAIP Core API schema verification confirmed `GET /airports` and `GET /navaids` support `search`, `limit`, `page`, `fields`, and optional country filtering.
- OpenAIP provides global aeronautical records; Halo still owns the planning workflow. Returned airport/navaid records are normalized into Halo route waypoints instead of exposing raw API payloads in the UI.
- Search is read-only and runs through a server route so `OPENAIP_API_KEY` never reaches the browser.
- Starter waypoint results remain instant so the route panel is usable if OpenAIP is temporarily unavailable. OpenAIP results are merged and deduped to avoid duplicate rows such as starter `EGLL` plus OpenAIP `EGLL`.

## Delivered

- Added validated `GET /api/openaip/search`.
- Added OpenAIP airport/navaid result normalization into `Waypoint` objects.
- Added shared waypoint search-result deduplication.
- Updated the route panel with debounced OpenAIP Core search, loading/warning/error/empty states, and an `OpenAIP global` badge.
- Added unit tests for OpenAIP waypoint normalization and starter/OpenAIP deduplication.

## Verification Evidence

- `pnpm test`: 34 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/search`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-fc98v157j-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6wjLYoToNJdoK7vMGc7PabSDvhJk`
- Production API: `/api/openaip/search?q=EGLL&limit=6` returned one OpenAIP waypoint for `EGLL` London Heathrow.
- Production browser: route search for `EGLL` showed one deduped result row, displayed the OpenAIP Core global-search status, and produced no captured page or console errors.
