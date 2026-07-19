# Halo Flight Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Turn Halo from a map scaffold into a working browser-first flight planning app with route, weather, aircraft, briefing, and research-backed workflow improvements.

**Architecture:** Keep live aviation data behind Next.js API routes and keep user planning data local until Supabase credentials and schema can be verified. Use typed pure modules for calculations so flight-safety logic is testable outside the UI.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, MapLibre GL JS, Zustand, Lucide React, Vitest.

---

## File Structure

- `types/planning.ts`: shared route, aircraft, weather, briefing, and research types.
- `lib/planning/navigation.ts`: great-circle distance, bearing, route, duration, course, and fuel math.
- `lib/planning/weather.ts`: METAR normalization and flight-category logic.
- `lib/planning/aircraft.ts`: aircraft presets, profile clamps, and personal minimum defaults.
- `lib/planning/sampleData.ts`: starter airports/navaids for instant local route planning.
- `lib/planning/briefing.ts`: briefing text generation and risk assessment.
- `lib/research/competitorPainPoints.ts`: product research mapped to Halo responses.
- `stores/mapStore.ts`: persisted map, route, aircraft, and personal minimum state.
- `components/map/Map.tsx`: proxied MapLibre map, feature inspection, and Halo route overlays.
- `components/sidebar/Sidebar.tsx`: route, weather, aircraft, briefing, feature, and research panels.
- `components/planning/RouteStatusBar.tsx`: always-visible planning summary.
- `app/api/weather/metar/[icao]/route.ts`: validated METAR proxy.
- `app/api/weather/taf/[icao]/route.ts`: validated TAF proxy.
- `app/api/openaip/*`: credential-safe OpenAIP proxy hardening.
- `tests/planning/navigation.test.ts`: unit tests for math and weather category boundaries.

## Tasks

### Task 1: Establish Planning Domain Logic

- [x] Add shared TypeScript planning types.
- [x] Add great-circle distance, true bearing, magnetic-course estimate, ETE, reserve, contingency, and fuel calculations.
- [x] Add starter aircraft profiles and personal minimum defaults.
- [x] Add starter South African and global airport/navaid data for offline-capable route creation.
- [x] Add METAR decoding and VFR/MVFR/IFR/LIFR category logic.
- [x] Add unit tests for navigation and weather calculations.

### Task 2: Make the App Usable Without External Aviation Credentials

- [x] Replace `SimpleMap` with the server-proxied MapLibre map.
- [x] Add route line and waypoint overlays.
- [x] Add OpenAIP style fallback to an OpenStreetMap/MapTiler base map when OpenAIP is unavailable.
- [x] Remove hardcoded MapTiler fallback keys and client OpenAIP key usage.
- [x] Validate OpenAIP proxy IDs, tile paths, and sprite paths.

### Task 3: Build Pilot-Facing Planning Workflows

- [x] Add route search, manual coordinate waypoints, map-click waypoint creation, waypoint reordering, editing, removal, and route clearing.
- [x] Add aircraft performance selection and editable cruise/fuel/reserve values.
- [x] Add personal minimum controls.
- [x] Add route weather panel with METAR/TAF refresh and 15-minute auto-refresh.
- [x] Add briefing panel with risk review, print, text export, and clipboard copy.
- [x] Add status bar with route, ETE, fuel, and selected aircraft.

### Task 4: Research-Backed Product Improvements

- [x] Research ForeFlight, Garmin Pilot, FltPlan Go, SkyDemon, FAA NOTAM Search, AviationWeather.gov, and FAA personal-minimum guidance.
- [x] Document competitor pain points and Halo responses in `docs/research/competitor-pain-points.md`.
- [x] Surface the mapped product decisions in the app's Research panel.

### Task 5: Verification and Deployment

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Run a production server and inspect the UI in a browser.
- [ ] Deploy production build to Vercel.
- [ ] Push GitHub branch or document the blocker if repo alignment prevents safe push.
