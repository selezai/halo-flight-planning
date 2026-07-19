# Aviation Map Source Decision

## Decision

Halo should keep OpenAIP as the primary aviation map source for the browser app.

## Why

- OpenAIP provides global aeronautical data and public vector/raster tile APIs suitable for MapLibre-style rendering.
- FAA VFR raster charts are authoritative and free, but they are US-only raster products. They are a good future overlay for US pilots, not a global replacement.
- openflightmaps is open, VFR-focused, and pilot-oriented, but the project is regional and its app-integration path is less direct for a global browser product.

## Implementation Notes

- OpenAIP API keys stay server-side. The browser loads Halo proxy URLs only.
- The style endpoint rewrites OpenAIP vector source tiles to `/api/openaip/tiles/{z}/{x}/{y}.pbf`.
- The tile proxy strips any legacy source prefix before calling OpenAIP.
- Airspace boundary layers are preserved because they are core manned-flight planning information.
- If OpenAIP is unavailable, Halo may degrade, but it must explicitly say the aviation map is degraded rather than silently becoming a ground map.
- OpenAIP is a data and map-source provider, not Halo's flight-planning engine. It provides global vector tiles and Core API records for aviation objects; Halo provides route planning, click inspection, layer controls, airspace warnings, briefing, and export behavior.
- Current OpenAIP Core API detail paths verified for airports, airspaces, navaids, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Authentic sprites now come from `openAIP/openaip-map-resources` and are generated with `spreet`. The archived `openAIP/mapstyles` Node build is not reliable on current Node because it depends on obsolete Mapnik tooling.
- OpenAIP's current public map resources are CC BY-NC-SA 4.0; commercial distribution requires replacement assets or explicit OpenAIP permission.

## Future Enhancements

- Add an optional FAA VFR sectional raster overlay for US planning.
- Add a map-source status panel showing OpenAIP style/tile health and data recency.
- Add route-aware airspace intersection warnings using the normalized OpenAIP airspace limits.
