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
- [x] Playwright integration tests against `next build && next start`.
- [x] CI pipeline for `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`.
- [x] South Africa-first NOTAM provider adapter with manual official briefing mode, authorized live JSON feed path, FAA future rollout path, route airport/navaid filtering, source attribution, and explicit unavailable states.
- [x] Hybrid W&B with POH/AFM setup, loading inputs, ramp/takeoff/landing CG checks, and briefing/risk integration.
- [x] Pilot Digest that converts route, fuel, W&B, weather, airspace, and NOTAM states into prioritized stop/review/ready actions.
- [x] Data freshness badges for route, weather, airspace, NOTAM, and W&B states.
- [x] Training/checkride navlog with route-wind input, WCA/headings/groundspeed/ETE/fuel calculations, formula text, and briefing export.
- [x] Backup/print pack export with digest, navlog, training navlog, W&B, fuel, weather, airspace, NOTAM source links, stale-data warnings, filing worksheet, and emergency worksheet fields.
- [x] Airspace vertical profile with approximate along-route distance ranges, cruise-altitude context, and critical/caution/info bands.
- [x] South Africa-safe filing checklist and close-flight reminder with File2Fly handoff, planned/overdue/closed states, and optional browser notification.
- [x] Emergency/forced-landing planning with glide radius, route/starter/user candidates, user-marked sites, briefing/backup export, and map glide rings/site markers.
- [x] Rubber-band route editing with drag-to-insert, drag-to-reposition, and snap-to-nearby airport/navaid/reporting-point helper logic.

## Remaining Before Operational Launch

- [x] Configure production OpenAIP and MapTiler environment variables in Vercel.
- [ ] Configure production `SOUTH_AFRICA_NOTAM_API_URL` and `SOUTH_AFRICA_NOTAM_API_KEY` after SACAA/ATNS or an authorized provider grants live API access.
- [ ] Configure production FAA NOTAM API credentials only when international/FAA rollout starts.
- [ ] Add Supabase auth/account sync only after confirming live schema, migrations, RLS policies, and smoke tests.
- [x] Add aircraft-specific weight-and-balance envelope entry before exposing W&B status as operational output.
- [x] Add Vercel Analytics, Speed Insights, API structured logging, and app/global error boundaries.
- [ ] Replace OpenAIP CC BY-NC-SA sprites or obtain OpenAIP permission before commercializing the app.
