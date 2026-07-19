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

## Remaining Before Operational Launch

- [ ] Generate and commit/ship authentic OpenAIP sprite assets or configure a reliable asset deployment path.
- [x] Configure production OpenAIP and MapTiler environment variables in Vercel.
- [ ] Add live NOTAM provider integration with route filtering and source attribution.
- [ ] Add Supabase auth/account sync only after confirming live schema, migrations, RLS policies, and smoke tests.
- [ ] Add aircraft-specific weight-and-balance envelopes before exposing W&B as operational output.
- [ ] Add airport detail/search backed by OpenAIP REST search for global coverage beyond starter data.
- [ ] Add Playwright integration tests against `next build && next start`.
- [ ] Add CI pipeline for `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
- [ ] Add error monitoring and analytics after deployment.
