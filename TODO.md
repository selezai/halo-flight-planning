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
- [x] Route-aware rendered OpenAIP airspace review with cruise-altitude conflict classification in route, briefing, status bar, and export text.
- [x] Backend OpenAIP Core route-corridor airspace review with bounded bbox queries, 5 nm corridor filtering, and rendered-map fallback.
- [x] Global OpenAIP Core airport/navaid route search with starter fallback and deduplication.
- [x] Playwright integration tests against `next build && next start`.
- [x] CI pipeline for `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`.
- [x] FAA NOTAM provider integration with route airport/navaid filtering, source attribution, and explicit unavailable states.

## Remaining Before Operational Launch

- [x] Configure production OpenAIP and MapTiler environment variables in Vercel.
- [ ] Configure production FAA NOTAM API credentials after FAA API Portal access is granted.
- [ ] Add Supabase auth/account sync only after confirming live schema, migrations, RLS policies, and smoke tests.
- [ ] Add aircraft-specific weight-and-balance envelopes before exposing W&B as operational output.
- [ ] Add error monitoring and analytics after deployment.
- [ ] Replace OpenAIP CC BY-NC-SA sprites or obtain OpenAIP permission before commercializing the app.
