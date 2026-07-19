# NOTAM Provider Research

Research date: 2026-07-19

## Decision

Halo should integrate NOTAMs through a provider-neutral server-side adapter.

Launch default is South Africa official manual briefing mode. FAA NOTAM API remains available only when `NOTAM_PROVIDER=faa` is configured for international rollout.

## Sources Checked

- FAA API catalog entry: `https://api.faa.gov/notamapi/` redirects to the FAA API Portal and the catalog lists base URL `https://external-api.faa.gov/notamapi/v1`.
- FAA unauthenticated endpoint probe: `GET https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=KJFK` returned HTTP 401, confirming credentials are required.
- FAA NOTAM Search: `https://notams.aim.faa.gov/notamSearch/` remains the official manual source linked from Halo.
- AviationWeather.gov Data API: `https://aviationweather.gov/data/api/` provides METAR, TAF, PIREP/AIREP, SIGMET, G-AIRMET, airport info, station info, navaids/fixes/features/obstacles, and weather/advisory products, but not NOTAMs.
- ATNS File2Fly is the official South Africa preflight filing/briefing entry point: `https://file2fly.atns.co.za/aes/login.jsp`.
- SACAA publishes NOTAM summary references at `https://www.caa.co.za/industry-information/aeronautical-information-notam-summaries/`.

## Implementation Decision

- Default `NOTAM_PROVIDER` to `south-africa-manual`.
- In South Africa launch mode, prepare route airport/navaid identifiers and direct pilots to ATNS File2Fly/SACAA official briefing sources.
- Do not scrape, parse unofficially, or fake live SACAA/ATNS NOTAM data.
- Keep FAA NOTAM credentials server-side only.
- Use `FAA_NOTAM_CLIENT_ID` and `FAA_NOTAM_CLIENT_SECRET` for the legacy FAA external NOTAM API headers `client_id` and `client_secret` only when `NOTAM_PROVIDER=faa`.
- Query route airport/navaid identifiers from the active route. This is a route-location filter, not a full corridor geospatial NOTAM engine.
- Normalize provider payloads defensively because the public FAA portal requires login and the exact response schema cannot be verified without credentials.
- Never treat missing credentials, 401/403, or provider failure as "no NOTAMs." Halo returns an unavailable/partial state and links the official NOTAM Search page.
- ICAO Q-line/Q-code parsing is not implemented in the launch build. Do not claim live ICAO/SACAA NOTAM parsing or vertical filtering until Q-line fixtures and parser tests exist.

## Future Upgrade

When authorized SACAA/ATNS data access exists, add a South Africa live provider behind the same provider-neutral route review contract.

When FAA NMS API access is granted, add a second FAA provider implementation for the NMS OAuth/client-credentials flow and keep the existing route-level UI contract unchanged.
