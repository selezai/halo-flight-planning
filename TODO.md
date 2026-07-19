# Halo Flight Planning - Development TODO

## Completed in 2026-07-19 Release

- [x] Next.js App Router scaffold verified.
- [x] OpenAIP proxy routes hardened with validation and fallback map behavior.
- [x] Removed temporary `SimpleMap` client OpenAIP key path.
- [x] Tailwind/PostCSS build fixed.
- [x] Route planning with search, manual coordinates, map-click user waypoints, waypoint editing, reordering, removal, and map overlays.
- [x] Distance, bearing, ETE, fuel, reserve, contingency, and fuel status calculations.
- [x] Aircraft presets and editable local active-aircraft profile.
- [x] Personal minimums.
- [x] METAR and TAF server routes using AviationWeather.gov.
- [x] Weather category display and personal-minimum warnings.
- [x] Flight briefing with risk review, weather, fuel, NOTAM checklist, print, copy, and text export.
- [x] Competitor pain-point research documented and surfaced in-app.
- [x] Unit tests, typecheck, lint, production build, and browser verification.
- [x] Authentic OpenAIP sprite assets generated from OpenAIP public map resources.
- [x] OpenAIP symbol layers restored for aviation icons and labels.
- [x] Click-to-detail parsing expanded for airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- [x] OpenAIP-style clicked-feature stack inspection for overlapping aviation icons and airspaces.
- [x] Route-aware rendered OpenAIP airspace review with cruise-altitude conflict classification in route, briefing, status bar, and export text.
- [x] Backend OpenAIP Core route-corridor airspace review with bounded bbox queries, 5 nm corridor filtering, and rendered-map fallback.
- [x] Global OpenAIP Core airport/navaid route search with starter fallback and deduplication.
- [x] Playwright integration tests exist, but are not part of the current launch implementation verification gate.
- [x] CI pipeline for `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
- [x] South Africa official manual NOTAM launch provider with route airport/navaid preparation and ATNS/SACAA source links.
- [x] FAA NOTAM provider integration retained behind `NOTAM_PROVIDER=faa`.
- [x] Hybrid W&B setup with POH/AFM configuration, loading stations, CG envelope checks, and briefing/risk/export surfacing.
- [x] Supabase auth/account sync code with magic link, Google OAuth, owner-scoped API persistence, and local/cloud merge controls.
- [x] Vercel Analytics, Speed Insights, structured API logging, and app/global error boundaries.

## Remaining Before Operational Launch

- [x] Configure production OpenAIP and MapTiler environment variables in Vercel.
- [ ] Configure production Supabase public env vars plus server-only service-role key, apply/verify account-sync migration, and smoke-test RLS/API sync before enabling sync for users.
- [ ] Configure production FAA NOTAM API credentials only when international FAA rollout is enabled with `NOTAM_PROVIDER=faa`.
- [ ] Add real aircraft-specific W&B envelopes per aircraft before exposing W&B as operational output for that aircraft.
- [ ] Scan Vercel post-deploy runtime logs for errors and structured `api_request` entries.
- [ ] Replace OpenAIP CC BY-NC-SA sprites or obtain OpenAIP permission before commercializing the app.
