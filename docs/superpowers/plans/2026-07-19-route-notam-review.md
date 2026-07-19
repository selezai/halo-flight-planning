# Route NOTAM Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Add live-provider NOTAM integration with route filtering and explicit source attribution, without faking operational NOTAM data when credentials are absent.

**Architecture:** Add a credential-gated server route for FAA NOTAM lookups. The client derives route airport/navaid identifiers, syncs a route NOTAM review into Zustand, and surfaces status/results in the briefing flow and exported briefing text.

**Tech Stack:** Next.js 14 App Router, TypeScript, FAA NOTAM API provider adapter, Zustand, Vitest, Playwright.

---

## Tasks

### Task 1: Research and Provider Boundary

- [x] Verify FAA NOTAM API access model.
- [x] Confirm AviationWeather.gov public Data API does not provide NOTAM products.
- [x] Document provider decision and unavailable-state rule.

### Task 2: Server-Side NOTAM API

- [x] Add NOTAM planning types.
- [x] Add route airport/navaid location filtering.
- [x] Add flexible FAA NOTAM payload normalization.
- [x] Add category/severity classification and sorting.
- [x] Add `POST /api/notams/route` with server-side credentials and validation.
- [x] Return explicit unavailable/partial states instead of treating provider failure as no NOTAMs.

### Task 3: Client and Briefing Integration

- [x] Add route NOTAM review state to the map store.
- [x] Add `RouteNotamReviewSync`.
- [x] Mount NOTAM sync on the dashboard.
- [x] Add route NOTAM review UI to the briefing panel.
- [x] Include NOTAM review status/results/source in the exported briefing text.
- [x] Feed NOTAM review into risk assessment.

### Task 4: Verification and Release

- [x] Add unit coverage for route-location filtering, normalization, severity/category sorting, and briefing unavailable behavior.
- [x] Add e2e API coverage for the no-credential unavailable state.
- [x] Run full verification.
- [ ] Push PR branch.

## Decisions

- FAA NOTAM API requires credentials; Halo uses `FAA_NOTAM_CLIENT_ID` and `FAA_NOTAM_CLIENT_SECRET` server-side and never exposes them to the browser.
- In this release, route filtering means airport/navaid identifiers from the active route. Full geospatial corridor matching is a future upgrade because NOTAM payload geometry availability depends on provider schema/access.
- Missing credentials or provider authentication failure is a caution/unavailable state, not a clean NOTAM result.
- The official manual source remains linked as `https://notams.aim.faa.gov/notamSearch/`.

## Verification Evidence

- `pnpm test tests/planning/notams.test.ts tests/planning/navigation.test.ts`: 9 targeted tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm test`: 38 Vitest tests passed.
- `pnpm build`: production build passed and included `/api/notams/route`.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`, including the no-credential NOTAM unavailable API/UI path.
