# Halo Flight Planning Design Document

## Problem Statement

Halo had a strong OpenAIP map scaffold but was not yet a useful flight-planning app. The shipped route, weather, aircraft, and briefing panels were placeholders, the dashboard used a temporary map component that exposed an OpenAIP key through `NEXT_PUBLIC_OPENAIP_API_KEY`, and the app depended on live map credentials before a pilot could do any planning work.

## Solution Overview

Build the first production-quality release as a browser-first planning workspace:

- Keep OpenAIP map integration server-proxied and credential-safe.
- Make route planning, aircraft performance, fuel reserves, personal minimums, weather, and briefing generation work locally.
- Use AviationWeather.gov for public METAR/TAF data where available.
- Degrade gracefully when OpenAIP or MapTiler credentials are missing.
- Document deferred account-sync/Supabase work because live schema and project credentials must be verified before database mutations.

## Key Decisions

- Route and aircraft data are persisted in Zustand/localStorage for this release. This avoids unsafe frontend database mutations and keeps the app useful before Supabase auth is configured.
- The main map uses `/api/openaip/style` and `/api/openaip/tiles/*`; no aviation API key is sent to the browser.
- The weather integration is read-only and server-side proxied. Inputs are validated with strict ICAO regex checks.
- NOTAMs are not faked. Halo explicitly flags NOTAM review in the briefing and documents the validated live-feed integration as a launch prerequisite.
- User-visible improvements target competitor pain points: cost anxiety, clunky interfaces, crash-prone workflows, scattered weather/fuel checks, and weak briefing clarity.

## Implementation Notes

- Add typed planning models in `types/planning.ts`.
- Add pure math/weather/briefing modules in `lib/planning/*`.
- Replace placeholder sidebar panels with working route, weather, aircraft, briefing, and research views.
- Replace temporary `SimpleMap` with the proxied `Map` component and route overlays.
- Add a persistent route status bar over the map.
- Add focused unit tests for navigation math and weather categories.

## Open Questions

- Supabase auth/account sync needs the live Supabase project reference, schema confirmation, and RLS smoke tests before implementation.
- Production OpenAIP visual parity needs real sprite files generated from `openAIP/mapstyles`; current sprite files in this workspace are placeholders.
- Live NOTAM integration needs an authorized data provider or official API access before it can be represented as operational data.
