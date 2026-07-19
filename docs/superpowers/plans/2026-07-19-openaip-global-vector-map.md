# OpenAIP Global Vector Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Make Halo's browser map behave like a real manned-flight aviation map by rendering global OpenAIP vector data with authentic sprites and useful click-to-detail inspection.

**Architecture:** Keep OpenAIP credentials server-side in Next.js App Router route handlers. The browser receives a MapLibre-compatible style, proxied vector tiles, locally hosted OpenAIP sprites, and normalized feature records that can be enriched through OpenAIP Core API detail proxies.

**Tech Stack:** Next.js 14 App Router, TypeScript, MapLibre GL JS, OpenAIP Tiles API, OpenAIP Core API, local sprite assets, Vitest.

---

## File Structure

- `scripts/build-sprites.sh`: non-interactive OpenAIP sprite generation and validation.
- `public/sprites/*`: generated OpenAIP sprite JSON/PNG assets used by MapLibre.
- `lib/openaip/styleConverter.ts`: Mapbox-to-MapLibre style conversion, safe symbol-layer retention, clickable-layer ordering.
- `lib/openaip/featureParser.ts`: normalized parser for OpenAIP tile properties.
- `lib/openaip/detailProxy.ts`: shared Core API detail proxy helper.
- `app/api/openaip/*/[id]/route.ts`: server-side detail routes for airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- `types/openaip.ts`: parsed feature types and fields shown in the sidebar.
- `components/map/Map.tsx`: click prioritization, enrichment endpoint selection, missing-sprite diagnostics.
- `components/sidebar/Sidebar.tsx`: richer aviation feature detail display.
- `lib/openaip/featureSelection.ts`: OpenAIP-style clicked-feature stack sorting and deduplication.
- `tests/openaip/featureParser.test.ts`: parser regression tests for actual OpenAIP snake_case tile properties.
- `tests/openaip/featureSelection.test.ts`: clicked-feature stack ordering and deduplication tests.
- `tests/openaip/tilePath.test.ts`: style converter regression tests for symbol retention and clickable layers.
- `README.md`, `IMPLEMENTATION_NOTES.md`, `docs/research/aviation-map-sources.md`, `../PROJECT_SESSION_LOG.md`: documentation and decision log updates.

## Tasks

### Task 1: Build Authentic OpenAIP Sprites

- [x] **Step 1: Make sprite generation non-interactive**

  Modify `scripts/build-sprites.sh` so CI/agent runs do not pause on prompts:

  ```bash
  ./scripts/build-sprites.sh --force --keep-temp
  ```

- [x] **Step 2: Generate sprite assets**

  Run:

  ```bash
  ./scripts/build-sprites.sh --force
  ```

  Expected: non-empty `openaip.json`, `openaip.png`, `openaip@2x.json`, and `openaip@2x.png`.

- [x] **Step 3: Validate sprite assets**

  Run:

  ```bash
  node -e "const fs=require('fs'); for (const f of ['openaip.json','openaip.png','openaip@2x.json','openaip@2x.png']) { const p='public/sprites/'+f; const s=fs.statSync(p).size; if (s<=3) throw new Error(p+' is empty'); console.log(f, s); } console.log('icons', Object.keys(JSON.parse(fs.readFileSync('public/sprites/openaip.json','utf8'))).length)"
  ```

  Expected: PNG files are non-zero and JSON contains many icon entries.

### Task 2: Restore OpenAIP Symbol Layers Safely

- [x] **Step 1: Add converter test**

  Add a Vitest assertion that symbol layers from OpenAIP aviation sources remain present after conversion.

- [x] **Step 2: Change layer filtering**

  Replace the blanket symbol-layer removal:

  ```ts
  if (layer.type === 'symbol') {
    return true;
  }
  ```

  with source/compatibility filtering that removes Mapbox-only terrain/composite layers but keeps OpenAIP symbol layers.

- [x] **Step 3: Improve clickable layer ordering**

  Return point layers before polygon/border layers so airport and navaid clicks win when stacked over airspace.

### Task 3: Normalize OpenAIP Feature Parsing

- [x] **Step 1: Add parser tests from observed OpenAIP tile properties**

  Cover fields such as:

  ```ts
  {
    source_id: 'example',
    feature_type: 'airspace',
    icao_class: 'd',
    lower_limit_value: 0,
    lower_limit_unit: 'ft',
    lower_limit_reference_datum: 'gnd',
    upper_limit_value: 7500,
    upper_limit_unit: 'ft',
    upper_limit_reference_datum: 'msl'
  }
  ```

- [x] **Step 2: Expand parsed feature union**

  Extend `ParsedFeature['type']` to include:

  ```ts
  'airport' | 'navaid' | 'airspace' | 'reportingPoint' | 'obstacle' | 'hotspot' | 'hangGliding' | 'rcAirfield' | 'unknown'
  ```

- [x] **Step 3: Normalize snake_case and camelCase**

  Parse both tile-style fields such as `icao_code` and API-style fields such as `icaoCode`.

### Task 4: Add Detail API Proxies

- [x] **Step 1: Create shared proxy helper**

  Implement:

  ```ts
  export async function proxyOpenAipDetail(resource: OpenAipResource, id: string): Promise<NextResponse>
  ```

  The helper validates ID format, keeps the API key server-side, fetches OpenAIP Core API with `x-openaip-api-key`, and returns cacheable JSON.

- [x] **Step 2: Replace duplicated existing routes**

  Update airport, navaid, and airspace routes to call the shared helper.

- [x] **Step 3: Add missing routes**

  Add:

  ```text
  app/api/openaip/reporting-points/[id]/route.ts
  app/api/openaip/obstacles/[id]/route.ts
  app/api/openaip/hotspots/[id]/route.ts
  app/api/openaip/hang-glidings/[id]/route.ts
  app/api/openaip/rc-airfields/[id]/route.ts
  ```

### Task 5: Wire Click-to-Detail UI

- [x] **Step 1: Add enrichment endpoint mapping**

  Map parsed feature types to detail routes:

  ```ts
  const OPENAIP_DETAIL_ENDPOINTS = {
    airport: 'airports',
    navaid: 'navaids',
    airspace: 'airspaces',
    reportingPoint: 'reporting-points',
    obstacle: 'obstacles',
    hotspot: 'hotspots',
    hangGliding: 'hang-glidings',
    rcAirfield: 'rc-airfields',
  };
  ```

- [x] **Step 2: Rank clicked features**

  Sort rendered features so point aviation objects are selected before decorative airspace border offsets.

- [x] **Step 3: Show richer sidebar data**

  Add rows for activation flags, obstacle height/top elevation, runway surface/rotation, source layer, source ID, and enrichment state.

### Task 6: Verify and Deploy

- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Run production server with `pnpm start`.
- [x] Verify in browser with MapLibre rendering, aviation symbols visible, no framework overlay, and click-to-detail on at least airspace plus one point feature.
- [x] Deploy to Vercel production.
- [x] Verify production style, sprites, tile endpoint, and browser click behavior.
- [x] Mirror changes into the GitHub PR branch and push.

### Task 7: Add OpenAIP-style clicked-feature stack inspection

- [x] **Step 1: Add feature stack selection tests**

  Create `tests/openaip/featureSelection.test.ts` with cases that prove Halo keeps airports/navaids above airspace when stacked, dedupes repeated airspace fill/border records by source ID, and still selects an airspace when it is the only clicked object.

- [x] **Step 2: Add a pure feature selection helper**

  Create `lib/openaip/featureSelection.ts` to normalize MapLibre rendered features through `parseFeature`, sort them with aviation point features first and airspaces after, and return a deduped stack for the sidebar.

- [x] **Step 3: Persist the clicked feature stack in map state**

  Extend `stores/mapStore.ts` with `selectedFeatureCandidates`, update `setSelectedFeature(feature, candidates?)`, and clear the stack when the user clears selection or adds a route waypoint.

- [x] **Step 4: Wire map clicks to the stack**

  Update `components/map/Map.tsx` so click handling calls the helper, stores the whole stack, and enriches whichever selected feature is active through the existing OpenAIP Core detail proxy.

- [x] **Step 5: Show switchable clicked features in the sidebar**

  Update `components/sidebar/Sidebar.tsx` to render a "Clicked features" section when multiple aviation objects were hit, with buttons for airport, navaid, airspace, obstacle, and other OpenAIP feature records.

- [x] **Step 6: Verify without Playwright**

  Run:

  ```bash
  pnpm test -- tests/openaip/featureSelection.test.ts
  pnpm test
  pnpm typecheck
  pnpm lint
  pnpm build
  ```

  Expected: all commands pass. Manual browser inspection is owned by the user for this slice.
