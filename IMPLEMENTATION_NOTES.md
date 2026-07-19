# Halo Flight Planning - Implementation Notes

This document explains the technical implementation details for developers working on the project.

## 2026-07-19 Completion Pass

The app is now a working browser-first flight planner rather than only an OpenAIP map scaffold.

### Delivered

- Route planning with persisted local waypoints, airport/navaid starter search, manual coordinates, map-click user waypoints, route overlays, waypoint editing, reordering, and removal.
- Navigation math for distance, true course, estimated magnetic course, ETE, trip fuel, reserves, contingency fuel, remaining fuel, and fuel status.
- Aircraft profile presets and editable performance values.
- Personal minimums used for weather and briefing warnings.
- METAR and TAF server routes backed by AviationWeather.gov with ICAO input validation.
- Briefing output with navigation log, weather, risk review, NOTAM review item, print, copy, and text export.
- Competitor pain-point research in `docs/research/competitor-pain-points.md` and in the app Research panel.
- `postcss.config.js`, `.eslintrc.json`, `vitest.config.ts`, and `tests/planning/navigation.test.ts`.

### Safety and Security Decisions

- OpenAIP credentials remain server-side only. The old `SimpleMap` component was removed because it referenced a public OpenAIP key path.
- OpenAIP style, tile, sprite, and REST proxy routes now validate path/id inputs.
- Missing OpenAIP credentials or failed OpenAIP style fetches return a fallback planning map instead of breaking the app.
- Stale Supabase dependencies and env placeholders were removed from the implemented release because the current app has no database runtime path.
- Supabase writes were not implemented because database schema, RLS policies, and live project credentials must be verified before production mutations.
- NOTAM data is not represented as live operational data until a vetted provider or official API is configured.

### Release and Deployment

- Production alias: https://halo-flight-planning.vercel.app
- Final inspected deployment: https://halo-flight-planning-5pvu1gz5y-pilotmerch-gmailcoms-projects.vercel.app
- GitHub branch: `agent/complete-halo-flight-planner-20260719`
- Draft PR: https://github.com/selezai/halo-flight-planning/pull/1

### 2026-07-19 Aviation Map Fix

The deployed map was not acceptable for a manned-flight planning app because it showed the fallback/base map instead of aviation airspace data.

Root causes:

- Vercel production lacked `OPENAIP_API_KEY` and `NEXT_PUBLIC_MAPTILER_KEY`, forcing `/api/openaip/style` to return the fallback map.
- The OpenAIP style converter generated proxied tile URLs as `/api/openaip/tiles/openaip-data/{z}/{x}/{y}.pbf`, then the proxy forwarded `openaip-data/{z}/{x}/{y}.pbf` upstream. OpenAIP expects `/api/data/openaip/{z}/{x}/{y}.pbf`.
- The tile proxy forwarded the upstream `Content-Encoding` header after reading the response body through server-side fetch, which can make browsers double-decode the vector tile.
- Dashed airspace boundaries were filtered out during style conversion.
- MapLibre errors were swallowed, making this hard to see from the UI.

Fix:

- Production Vercel env vars are now configured.
- `normalizeOpenAipTilePath` accepts legacy prefixed and current coordinate-only tile paths but strips source prefixes before calling OpenAIP.
- Converted style sources now point to `/api/openaip/tiles/{z}/{x}/{y}.pbf`.
- Proxied vector tile responses no longer include stale `Content-Encoding`.
- Dashed airspace boundary layers are preserved and dasharray values are sanitized for MapLibre.
- MapLibre render errors now show a degraded-map UI and log the actual error.

### 2026-07-19 Global OpenAIP Vector Map and Sprites Slice

The aviation map now renders OpenAIP as a global vector aviation chart rather than a ground-focused base map with partial overlays.

Decisions:

- OpenAIP remains the primary global/free aviation source because its Tiles API provides Mapbox/MapLibre-compatible vector tiles and its Core API provides detail records by document ID.
- OpenAIP provides data and style assets; Halo provides product behavior such as click inspection, layer controls, route planning, warnings, and briefing workflows.
- Authentic current sprites are generated from `openAIP/openaip-map-resources` with `spreet`. The archived `openAIP/mapstyles` build path was not used because it depends on Node 8-era `mapnik` tooling that fails on current Node.
- OpenAIP's current public map resources are CC BY-NC-SA 4.0. Halo must obtain OpenAIP permission or replace the icon set before commercial use.

Delivered:

- Replaced empty sprite placeholders with validated OpenAIP sprite files containing 128 entries.
- Added `pnpm build:sprites` as the one-command non-interactive sprite generator.
- Restored OpenAIP aviation `symbol` layers while continuing to remove Mapbox/composite basemap symbols.
- Converted OpenAIP token strings such as `{type}-medium` and `{icao_code}` into MapLibre expressions.
- Added a compatibility mapping for the current style's `airfield-15` RC-airfield icon reference to the available `rc_airfield` sprite.
- Added click prioritization so airports, navaids, reporting points, obstacles, hang-gliding sites, hotspots, and RC airfields win over decorative airspace border layers when stacked.
- Expanded feature parsing for snake_case vector-tile fields and camelCase Core API records.
- Added Core API detail proxies for reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded sidebar details for activation flags, vertical limits, runway hints, navaid alignment, obstacle height/top elevation, RC power types, source layer, and source ID.

Verification:

- `pnpm build:sprites`: generated 128 OpenAIP sprite entries.
- `pnpm test`: 15 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included all added OpenAIP detail routes.
- Local production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Local production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Local production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Local browser: no framework overlay, no degraded-map error, aviation symbols/labels visible, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2k36aug5m-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FYEx7JLtPWeDPV5XM126dUCTbSid`
- Production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Production browser: no framework overlay, no degraded-map error, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.

### 2026-07-19 Route-Aware Airspace Review Slice

Halo now adds a planning layer on top of OpenAIP's browser vector map instead of treating OpenAIP as only a visual chart.

Decisions:

- OpenAIP supplies rendered aviation features and detail records. Halo is responsible for route-specific logic, altitude comparison, alert classification, briefing output, and UI language.
- This slice samples currently rendered MapLibre/OpenAIP airspace layers along the route. It is useful for immediate browser planning, but the UI documents that panning/zooming affects coverage.
- Derived route airspace review state is not persisted because it depends on the current rendered map state, visible airspace layer, route, and cruise altitude.
- Controlled or special-use airspace intersections at cruise altitude are critical. Unknown vertical limits or lower-risk intersections are caution. Crossed airspaces outside cruise altitude are informational.

Delivered:

- Added numeric `lowerLimitFt` and `upperLimitFt` parsing for OpenAIP tile and Core API airspace records.
- Added pure route airspace conflict classification helpers and tests.
- Added route sampling against visible OpenAIP airspace layers in the MapLibre map.
- Added route airspace review state to the map store.
- Surfaced airspace review in the route panel, briefing panel, status bar, and exported briefing text.
- Added explicit partial-review messages when airspaces are hidden, the map is loading, or the route is outside the current viewport.

Local verification:

- `pnpm test`: 21 tests passed.
- `pnpm typecheck`: passed after fixing a `Map` component name collision with the global `Map` constructor by using `globalThis.Map`.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Local browser against `next start`: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps (`CTR FALA`, `CTR FAOR`, `TMA FALA A`) plus informational airway/FIR crossings outside cruise altitude.
- Local briefing panel and exported text included the airspace review and a critical risk item.
- Browser console/page error checks were clean.

Production verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2zz9w1tks-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CXFcKk8gw94YcSQ9abmrPbSFVJn7`
- Production API: `/api/openaip/style` returned 96 layers, 49 airspace layers, and 22 aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 and a 50,990-byte vector tile.
- Production browser: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps and the same briefing/risk output as local.
- Sampled Vercel runtime log stream showed no errors after production smoke requests.
- GitHub PR branch pushed with commit `3ec0d42`: https://github.com/selezai/halo-flight-planning/pull/1

### 2026-07-19 Backend Airspace Corridor Review Slice

Halo now supplements the rendered map review with a server-side OpenAIP Core route-corridor review.

Decisions:

- Use OpenAIP Core API `GET /airspaces` with `bbox`, `limit`, and `fields` from the live Swagger schema.
- Keep OpenAIP credentials server-side in `POST /api/openaip/airspace-review`.
- Split long routes into bounded 120 nm query segments and cap requests at 24 segments because OpenAIP documents bbox queries as compute-intensive and rate-limited.
- Use a 5 nm corridor for this release. Direct polygon crossings and airspaces close to the route corridor are included.
- Prefer Core API complete/partial/checking results in the UI while retaining the rendered-vector review as fallback when Core review is unavailable.

Delivered:

- Added `lib/planning/airspaceCorridor.ts` for bbox generation, route splitting, polygon intersection, and route-to-polygon corridor distance.
- Added validated read-only `POST /api/openaip/airspace-review`.
- Fixed Core API airspace vertical unit parsing so `unit=1` is feet and `unit=6` is flight level for altitude limits.
- Added `components/planning/RouteAirspaceReviewSync.tsx` to refresh Core API review when route or cruise altitude changes.
- Expanded route airspace review state with source, corridor width, query count, candidate count, unavailable, checking, partial, and rate-limited states.
- Updated route panel/status bar/briefing flows to display Core API corridor results while keeping rendered-map fallback behavior.

Verification:

- `pnpm test`: 29 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/airspace-review`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-h7r99c6ns-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FhHKr9zxqQFTeis7AdiCbHCEPxSR`
- Production API: FAOR→FALA at 6,500 ft returned `source=openaip-core`, `status=complete`, `queryCount=1`, `candidateCount=24`, `alerts=18`, and `critical=4`.
- Production browser: route panel showed Core API review with 4 critical airspace items (`ATZ FAGC`, `CTR FALA`, `CTR FAOR`, `TMA FALA A`), 1 query, 24 candidates, and 5 nm corridor.
- Production briefing/export text included the Core API corridor review and critical risk item.

### Verification

- `pnpm test`: 5 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Browser verification against `next start`: content rendered, no framework error overlay, no captured console errors, route creation and briefing flow verified.
- Production Vercel smoke checks: deployment status Ready, OpenAIP style endpoint HTTP 200, FAOR METAR endpoint returned current JSON, and production browser verification confirmed FAOR→FACT route flow.
- Aviation map fix verification: `pnpm test` now passes 9 tests; local and production `/api/openaip/style` return 74 layers with 46 airspace layers; `/api/openaip/tiles/8/147/147.pbf` returns HTTP 200; local and production browser checks show visible aviation airspace/airway overlays and feature inspection for `AWY G853`.

## Architecture Overview

### Data Flow

```
User Browser
    ↓
MapLibre GL JS (client-side map rendering)
    ↓
/api/openaip/style (transforms OpenAIP style)
    ↓
/api/openaip/tiles/* (proxies vector tiles)
    ↓
OpenAIP API (external service)
```

### Why a Proxy Layer?

1. **Authentication**: OpenAIP requires API keys in headers (not query params)
2. **CORS**: Direct browser requests are blocked by CORS policies
3. **Transformation**: Mapbox GL style needs conversion for MapLibre compatibility
4. **Caching**: Reduce API calls and improve performance
5. **Security**: Keep API keys server-side only

## Key Technical Decisions

### 1. MapLibre GL vs Mapbox GL

**Choice**: MapLibre GL

**Reasons**:
- Open source, no vendor lock-in
- No usage limits or pricing tiers
- Compatible with Mapbox GL styles (with minor transformations)
- Active community and development

### 2. Sprite Building Strategy

**Problem**: OpenAIP's sprites are not publicly hosted

**Solution**: Build sprites locally from their open-source SVG repository

**Why not use MapTiler's OpenAIP style?**
- Only ~70% visual fidelity
- Different/simplified icons
- Doesn't match openaip.net exactly

### 3. State Management with Zustand

**Choice**: Zustand over Redux/Context

**Reasons**:
- Minimal boilerplate (no actions, reducers, providers)
- Perfect for map + UI state synchronization
- Built-in persistence middleware
- TypeScript-friendly
- Small bundle size (~1KB)

**Store Structure**:
```typescript
{
  // Map state
  center: [lng, lat],
  zoom: number,
  
  // UI state
  sidebarOpen: boolean,
  sidebarPanel: 'route' | 'weather' | 'aircraft' | 'briefing',
  selectedFeature: ParsedFeature | null,
  
  // Layer visibility
  visibleLayers: {
    airports: boolean,
    navaids: boolean,
    airspaces: boolean,
    ...
  }
}
```

### 4. Feature Parsing Strategy

**Two-step data retrieval**:

1. **Immediate**: Parse vector tile properties for basic info
2. **Enrichment**: Fetch full details from REST API asynchronously

**Why?**
- Fast initial response (no network delay)
- Complete data without embedding everything in tiles
- Matches OpenAIP's own implementation

**Example**:
```typescript
// Step 1: Parse tile data (instant)
const basic = parseFeature(tileFeature);
setSelectedFeature(basic);

// Step 2: Enrich with REST API (async)
const full = await fetch(`/api/openaip/airports/${id}`);
setSelectedFeature({ ...basic, ...full, enriched: true });
```

## Style Conversion

### Mapbox GL → MapLibre GL

OpenAIP provides a Mapbox GL style. MapLibre GL is mostly compatible but needs fixes:

#### 1. Legacy Stops Syntax

**Mapbox GL (old)**:
```json
{
  "circle-radius": {
    "stops": [[10, 2], [15, 8]]
  }
}
```

**MapLibre GL (new)**:
```json
{
  "circle-radius": [
    "interpolate", ["linear"], ["zoom"],
    10, 2,
    15, 8
  ]
}
```

#### 2. Geometry Type Filters

**Mapbox GL**:
```json
["in", "$type", "Point"]
```

**MapLibre GL**:
```json
["==", ["geometry-type"], "Point"]
```

#### 3. Sprite URLs

Must rewrite to point to locally-hosted sprites:

```javascript
style.sprite = 'http://localhost:3000/api/openaip/sprites/openaip';
```

#### 4. Tile URLs

Must rewrite to go through proxy:

```javascript
tiles: [
  'http://localhost:3000/api/openaip/tiles/{z}/{x}/{y}'
]
```

## API Routes

### Style Route (`/api/openaip/style`)

**Purpose**: Fetch and transform OpenAIP style for MapLibre

**Process**:
1. Fetch from `https://api.tiles.openaip.net/api/styles/openaip-default-style.json`
2. Add OpenAIP API key header
3. Transform style (see Style Conversion above)
4. Rewrite sprite and tile URLs
5. Cache for 1 hour
6. Return to client

**Caching**: Next.js `revalidate: 3600` (1 hour)

### Tiles Route (`/api/openaip/tiles/[...path]`)

**Purpose**: Proxy vector tile requests

**Process**:
1. Reconstruct tile path: `z/x/y.pbf`
2. Fetch from OpenAIP with API key
3. Return raw protobuf data
4. Cache for 24 hours

**Special handling**:
- 404s return 204 (empty tile) - normal for tiles outside coverage
- Do not forward stale upstream `Content-Encoding` after server-side fetch has decoded the response body.

### Sprites Route (`/api/openaip/sprites/[...path]`)

**Purpose**: Serve locally-built sprite files

**Process**:
1. Read from `public/sprites/`
2. Determine content type (.json or .png)
3. Return with long cache (1 week)

**Files served**:
- `openaip.json` - Standard resolution metadata
- `openaip.png` - Standard resolution image
- `openaip@2x.json` - Retina metadata
- `openaip@2x.png` - Retina image

### REST API Routes

**Airports**: `/api/openaip/airports/[id]`  
**Navaids**: `/api/openaip/navaids/[id]`  
**Airspaces**: `/api/openaip/airspaces/[id]`  
**Reporting points**: `/api/openaip/reporting-points/[id]`  
**Obstacles**: `/api/openaip/obstacles/[id]`  
**Hotspots**: `/api/openaip/hotspots/[id]`  
**Hang-gliding sites**: `/api/openaip/hang-glidings/[id]`  
**RC airfields**: `/api/openaip/rc-airfields/[id]`

**Purpose**: Proxy REST API requests for full feature details

**Process**:
1. Forward request to OpenAIP Core API
2. Add API key in the server-side `x-openaip-api-key` header
3. Cache for 1 hour
4. Return JSON

## Feature Parsing

### Airport Label Format

Vector tiles embed data in `name_label_full`:

```
"LFSB 256 m MSL\nBALE-MULHOUSE\n125.255 MHz 1000 m"
```

**Parsing logic**:
- Line 1: ICAO + elevation + unit
- Line 2: Airport name
- Line 3+: Frequencies, runway lengths

### Navaid Label Format

```
"GRASMERE 115.500 MHz GAV"
```

**Parsing logic**:
- Name: Everything before frequency
- Frequency: `\d{3}\.\d{3} MHz`
- Identifier: 2-3 letters at end

### Coordinate Formatting

**DMS (Degrees Minutes Seconds)**:
```
46°32'15.2"N 6°13'28.8"E
```

**Decimal**:
```
46.537556, 6.224667
```

## Performance Optimizations

### 1. Caching Strategy

- **Style**: 1 hour (rarely changes)
- **Tiles**: 24 hours (static data)
- **Sprites**: 1 week (never change after build)
- **REST API**: 1 hour (airport data changes infrequently)

### 2. Lazy Loading

Map component is dynamically imported to avoid SSR issues:

```typescript
const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false
});
```

### 3. State Persistence

Only essential state is persisted to localStorage:
- Map viewport (center, zoom)
- Layer visibility preferences

Not persisted:
- Selected feature (session-only)
- Sidebar state (session-only)

## Type Safety

### OpenAIP Types

Comprehensive TypeScript types for all OpenAIP data structures:

- `OpenAipAirport` - Full airport response
- `OpenAipNavaid` - Full navaid response
- `OpenAipAirspace` - Full airspace response
- `ParsedFeature` - Unified feature for sidebar display

### Enums

All OpenAIP numeric codes have TypeScript enums:

```typescript
enum AirportType {
  CLOSED = 0,
  AF_CIVIL = 1,
  INTL_APT = 7,
  // ...
}

const AirportTypeLabels: Record<AirportType, string> = {
  [AirportType.CLOSED]: 'Closed',
  [AirportType.AF_CIVIL]: 'Airfield Civil',
  // ...
};
```

## Testing Strategy

### Manual Testing Checklist

- [ ] Map loads without errors
- [ ] Aviation data visible at various zoom levels
- [ ] Click on airport shows correct data
- [ ] Click on navaid shows correct data
- [ ] Click on airspace shows correct data
- [ ] Sidebar displays all fields correctly
- [ ] Layer toggles work
- [ ] Viewport persists on reload
- [ ] No sprite warnings in console
- [ ] REST API enrichment works

### Browser Console Logs

The app logs useful debug info:

```
✅ Map loaded
✅ Style loaded
📍 Clickable layers: ['airport_label', 'navaid_label', ...]
🖱️ Clicked feature: {...}
📋 Parsed feature: {...}
📦 Full feature data: {...}
```

## Common Issues

### 1. Missing Sprites

**Symptom**: Console warnings about missing images

**Cause**: Sprites not built or not in correct location

**Fix**: Run `./scripts/build-sprites.sh`

### 2. No Aviation Data

**Symptom**: Map loads but no airports/navaids visible

**Causes**:
- Invalid OpenAIP API key
- API key doesn't have tile access
- Tile proxy not working

**Debug**:
- Check Network tab for tile requests
- Verify API key in `.env.local`
- Check server logs for errors

### 3. Style Load Failures

**Symptom**: Map doesn't load, style errors in console

**Causes**:
- Style conversion failed
- Invalid MapTiler key (for glyphs)
- Network issues

**Debug**:
- Check `/api/openaip/style` response
- Verify MapTiler key
- Check style validation errors

## Future Enhancements

### Planned Features (from PRD)

1. **Route Planning**
   - Add/remove waypoints
   - Distance/bearing calculations
   - Fuel planning

2. **Weather Integration**
   - METAR/TAF display
   - Weather overlays
   - Flight category indicators

3. **User Authentication**
   - Supabase integration
   - Save routes/aircraft
   - Multi-device sync

4. **Offline Support**
   - PWA implementation
   - Tile caching
   - Service worker

### Technical Debt

- [ ] Add unit tests (Jest + React Testing Library)
- [ ] Add E2E tests (Playwright)
- [ ] Implement error boundaries
- [ ] Add loading skeletons
- [ ] Optimize bundle size
- [ ] Add Sentry error tracking
- [ ] Implement rate limiting on API routes

## Development Workflow

### Local Development

```bash
pnpm dev          # Start dev server
pnpm lint         # Run ESLint
pnpm build        # Test production build
```

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Prefer functional components
- Use descriptive variable names

### Git Workflow

```bash
# Feature branch
git checkout -b feature/route-planning

# Commit with descriptive messages
git commit -m "feat: add waypoint management"

# Push and create PR
git push origin feature/route-planning
```

## Resources

- [OpenAIP API Docs](https://www.openaip.net/docs)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js-docs/)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Zustand Docs](https://docs.pmnd.rs/zustand/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## Contact

For questions or issues, refer to the main [README.md](./README.md) or [SETUP.md](./SETUP.md).
