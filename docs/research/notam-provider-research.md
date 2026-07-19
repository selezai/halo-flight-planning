# NOTAM Provider Research

Research date: 2026-07-19

## Decision

Halo should integrate NOTAMs through a server-side provider adapter, with FAA NOTAM API as the first supported source when credentials are configured.

## Sources Checked

- FAA API catalog entry: `https://api.faa.gov/notamapi/` redirects to the FAA API Portal and the catalog lists base URL `https://external-api.faa.gov/notamapi/v1`.
- FAA unauthenticated endpoint probe: `GET https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=KJFK` returned HTTP 401, confirming credentials are required.
- FAA NOTAM Search: `https://notams.aim.faa.gov/notamSearch/` remains the official manual source linked from Halo.
- AviationWeather.gov Data API: `https://aviationweather.gov/data/api/` provides METAR, TAF, PIREP/AIREP, SIGMET, G-AIRMET, airport info, station info, navaids/fixes/features/obstacles, and weather/advisory products, but not NOTAMs.

## Implementation Decision

- Keep NOTAM credentials server-side only.
- Use `FAA_NOTAM_CLIENT_ID` and `FAA_NOTAM_CLIENT_SECRET` for the legacy FAA external NOTAM API headers `client_id` and `client_secret`.
- Query route airport/navaid identifiers from the active route. This is a route-location filter, not a full corridor geospatial NOTAM engine.
- Normalize provider payloads defensively because the public FAA portal requires login and the exact response schema cannot be verified without credentials.
- Never treat missing credentials, 401/403, or provider failure as "no NOTAMs." Halo returns an unavailable/partial state and links the official NOTAM Search page.

## Future Upgrade

When FAA NMS API access is granted, add a second provider implementation for the NMS OAuth/client-credentials flow and keep the existing route-level UI contract unchanged.
