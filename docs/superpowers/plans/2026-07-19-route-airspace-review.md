# Route-Aware Airspace Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Make Halo interpret the OpenAIP aviation vector map as planning data by warning when a planned route crosses rendered airspace at the selected cruise altitude.

**Architecture:** Keep OpenAIP as the source for aviation vector data and sprites. Halo samples the browser-rendered OpenAIP airspace layers along the pilot's route, normalizes each airspace's vertical limits, compares them with cruise altitude, and stores a derived review result for the route panel, status bar, and briefing package.

**Important limitation:** This slice intentionally uses the browser's currently rendered vector tiles. It is useful and immediate, but it is not a certified full-route regulatory analysis. If a route is outside the current viewport, at an unsuitable zoom, or the airspace layer is hidden, the review can be incomplete and the UI must say so.

---

## File Structure

- `types/planning.ts`: route airspace alert and review status types.
- `types/openaip.ts`: numeric parsed airspace limit fields.
- `lib/openaip/featureParser.ts`: altitude limit parsing in feet for tile and Core API records.
- `lib/planning/airspaceReview.ts`: pure classification helpers for altitude conflicts and alert sorting.
- `stores/mapStore.ts`: derived route airspace review state.
- `components/map/Map.tsx`: route sampling against rendered OpenAIP airspace layers.
- `components/sidebar/Sidebar.tsx`: route and briefing UI for airspace review.
- `components/planning/RouteStatusBar.tsx`: always-visible airspace review summary.
- `lib/planning/briefing.ts`: include airspace risks and exported briefing text.
- `tests/openaip/featureParser.test.ts`: numeric airspace limit regression tests.
- `tests/planning/airspaceReview.test.ts`: conflict-classification regression tests.

## Tasks

### Task 1: Add Data Model

- [x] Add `RouteAirspaceAlert`, `RouteAirspaceReview`, and review status types.
- [x] Add `lowerLimitFt` and `upperLimitFt` to parsed OpenAIP airspace features.
- [x] Keep derived route airspace review state out of persisted local storage.

### Task 2: Normalize Airspace Vertical Limits

- [x] Convert OpenAIP Core API `STD` limits into flight levels in feet.
- [x] Convert vector-tile `ft`, `m`, `FL`, `GND`, and `MSL` combinations into comparable feet where possible.
- [x] Add regression tests for tile and Core API examples.

### Task 3: Sample Rendered OpenAIP Airspaces

- [x] Build a list of visible airspace layers from the active MapLibre style.
- [x] Sample route legs every ~32 px in screen space.
- [x] Query rendered OpenAIP airspace features at sample points.
- [x] Deduplicate features by OpenAIP source ID or stable label fallback.

### Task 4: Classify and Surface Alerts

- [x] Compare cruise altitude with parsed lower/upper feet.
- [x] Mark controlled/special-use altitude intersections as critical.
- [x] Mark other intersections or unknown vertical limits as caution.
- [x] Mark route crossings outside selected altitude as informational.
- [x] Display the review in the route panel, briefing panel, status bar, and exported briefing text.

### Task 5: Verify and Deploy

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Run a production server and verify the route-airspace review in a browser.
- [x] Deploy to Vercel production.
- [ ] Verify production behavior and push the PR branch.
