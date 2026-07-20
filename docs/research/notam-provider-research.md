# NOTAM Provider Research

Research date: 2026-07-19

## Decision

Halo is South Africa-first for launch. The default NOTAM provider is `south-africa-manual`, which prepares route airport/navaid locations and directs pilots to official ATNS File2Fly / SACAA AIMU briefing channels.

The live data path is implemented as an authorized JSON adapter behind `NOTAM_PROVIDER=south-africa-live`. It must only be enabled after SACAA/ATNS or an authorized provider supplies a legitimate API endpoint and key. Halo must not scrape File2Fly, automate a logged-in browser session, parse the public daily SACAA summary as operational data, or fake NOTAMs.

FAA remains available behind `NOTAM_PROVIDER=faa` for later international rollout.

## Sources Checked

- SACAA NOTAM Summaries page: `https://www.caa.co.za/industry-information/aeronautical-information-notam-summaries/`
  - The page says PIB access is via the briefing office.
  - It states the public NOTAM summary is only valid at creation time and should not be used for flight preparation.
  - It points users to AIMU / File2Fly for latest NOTAMs.
  - It lists route, aerodrome, and zone briefing types.
  - It states pilots remain responsible for consulting the latest NOTAM before flight.
- ATNS File2Fly login page: `https://file2fly.atns.co.za/aes/login.jsp`
  - File2Fly offers online pre-flight preparation, flight plans, NOTAM briefing, MET, and e-AIP.
  - Registration is free.
- ATNS File2Fly self-briefing manual: `https://file2fly.atns.co.za/AesRepository/pdf/selfbriefingManual_e.pdf`
  - Route, zone, and aerodrome briefings are generated inside the authenticated web application.
  - PIB results are available as browser HTML or PDF.
- FAA API catalog / FAA NOTAM Search remain relevant only for future FAA rollout.

No public SACAA/ATNS machine-readable NOTAM API was found during this research. The official public flow is File2Fly/briefing office, not an unauthenticated data feed.

## Implementation

- `NOTAM_PROVIDER=south-africa-manual`
  - Default and production-safe.
  - Returns `source=south-africa-official`, `status=manual-required`.
  - Lists the prepared route airport/navaid locations.
  - Links `SOUTH_AFRICA_NOTAM_SOURCE_URL`, defaulting to ATNS File2Fly.
- `NOTAM_PROVIDER=south-africa-live`
  - Calls `SOUTH_AFRICA_NOTAM_API_URL` with a server-side key from `SOUTH_AFRICA_NOTAM_API_KEY`.
  - Sends a POST JSON body with `briefingType=route`, route locations, waypoints, and source `halo`.
  - Supports configurable auth header/scheme through `SOUTH_AFRICA_NOTAM_API_AUTH_HEADER` and `SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME`.
  - Rejects missing config, invalid header names, non-HTTPS remote URLs, and URLs containing credentials.
  - Normalizes flexible authorized-provider JSON payloads into Halo `RouteNotam` records.
- `NOTAM_PROVIDER=faa`
  - Keeps the existing FAA external NOTAM API path using server-side `FAA_NOTAM_CLIENT_ID` and `FAA_NOTAM_CLIENT_SECRET`.

## Operational Rule

Never treat provider failure, missing credentials, public-summary unavailability, or empty Halo results as proof that there are no NOTAMs. Halo must show unavailable, partial, or manual-required states and continue to direct the pilot to the official briefing path.
