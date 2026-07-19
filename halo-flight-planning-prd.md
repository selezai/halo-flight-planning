# Halo Flight Planning - Product Requirements Document

**Version:** 2.0  
**Author:** Selez  
**Date:** November 2025  
**Status:** Draft

---

## ⚠️ CRITICAL: OpenAIP Visual Fidelity Requirements

**This section documents the hard-won lessons from the previous implementation. DO NOT use MapTiler's hosted OpenAIP style if you want 1:1 visual parity with openaip.net.**

### The Core Challenge

OpenAIP's map uses custom sprites (icons) that are NOT publicly available via their API. The sprites are:
- Generated from SVG source files using `@mapbox/spritezero-cli`
- Hosted on Mapbox's infrastructure with authentication
- Not included in MapTiler's "OpenAIP style" (MapTiler uses different/simplified icons)

### The Solution That Worked

**Build the sprites yourself from OpenAIP's open-source repository:**

```bash
# 1. Clone OpenAIP's mapstyles repository
git clone https://github.com/openAIP/mapstyles.git
cd mapstyles

# 2. Install dependencies (includes @mapbox/spritezero-cli)
npm install

# 3. Build the sprites and style
npm run build:style:default

# 4. Output files location:
# dist/maps/styles/default/sprite.json
# dist/maps/styles/default/sprite.png
# dist/maps/styles/default/sprite@2x.json
# dist/maps/styles/default/sprite@2x.png
# dist/maps/styles/default/style.json
```

### Sprite Integration

Once you have the sprite files, host them locally and reference in your style:

```javascript
// Your MapLibre style should point to your hosted sprites
const style = {
  version: 8,
  sprite: 'https://your-domain.com/sprites/openaip', // No file extension
  // ... rest of style
};
```

### Sidebar Click Functionality (1:1 with OpenAIP)

OpenAIP uses a **two-step data retrieval** process:

1. **Immediate display from vector tiles**: When user clicks, query `map.queryRenderedFeatures()` for basic data embedded in tiles
2. **Enrich with REST API**: Fetch complete details from OpenAIP's REST API using the feature's `source_id`

**Key insight**: Vector tiles embed data in the `name_label_full` property that needs parsing:
```
"LFSB 256 m MSL\nBALE-MULHOUSE\n125.255 MHz 1000 m"
```

Parse this to extract: ICAO, elevation, name, frequencies, runway length.

### REST API Enrichment

```javascript
// After click, fetch full details
const response = await fetch(
  `https://api.core.openaip.net/api/airports/${sourceId}?apiKey=${OPENAIP_KEY}`
);
const fullDetails = await response.json();
// Now display: runways, all frequencies, services, fuel, hours, etc.
```

### Revised Strategy Recommendation

Given your requirement for 1:1 visual parity:

| Approach | Visual Fidelity | Complexity | Recommendation |
|----------|-----------------|------------|----------------|
| MapTiler hosted OpenAIP | ~70% | Low | ❌ Not for your use case |
| Build sprites + proxy tiles | 100% | High | ✅ Required for 1:1 match |
| Custom recreation | Variable | Very High | ❌ Not worth the effort |

**Go with Option 2**: Build your own sprites, proxy OpenAIP tiles, fetch their style JSON and transform for MapLibre.

---

## 1. Executive Summary

Halo is a web-based flight planning application for pilots operating in controlled and uncontrolled airspace. The app provides interactive aviation charts, route planning, weather integration, and flight documentation tools. Built for VFR and IFR pilots ranging from students to commercial operators.

### Vision
A clean, professional flight planning tool that feels as polished as ForeFlight but runs in the browser and serves pilots who don't need (or want) a subscription-heavy ecosystem.

### Key Differentiators
- **Browser-first** - No app download required, works on any device
- **OpenAIP data** - Free, crowd-sourced aviation data covering global airspace
- **Pilot-focused UX** - Built by a pilot (2000+ UAV hours) who understands the workflow
- **Modern stack** - Fast, responsive, offline-capable

---

## 2. Target Users

### Primary Personas

**Student Pilot (Sarah)**
- Learning to fly, needs to understand airspace
- Creates flight plans for cross-country training
- Wants clear visualization of controlled/uncontrolled airspace
- Price-sensitive, looking for free/affordable tools

**Private Pilot (Mike)**
- Weekend warrior, flies for fun
- Plans trips to unfamiliar airports
- Needs weather briefings and NOTAM awareness
- Values simplicity over feature overload

**Commercial Operator (Lisa)**
- Charter/aerial work pilot
- Needs professional flight documentation
- Requires accurate fuel planning
- Values reliability and data accuracy

### User Needs Matrix

| Need | Student | Private | Commercial |
|------|---------|---------|------------|
| Airspace visualization | Critical | Critical | Critical |
| Route planning | Critical | Critical | Critical |
| Weather overlay | Important | Critical | Critical |
| NOTAMs | Important | Important | Critical |
| Fuel planning | Learning | Important | Critical |
| Weight & balance | Learning | Useful | Critical |
| Flight logging | Useful | Useful | Important |
| Offline access | Useful | Important | Critical |

---

## 3. Technical Architecture

### 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS   │
│  MapLibre GL JS + Zustand (state)                      │
│  OpenAIP-style Sidebar Component                        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Next.js API Routes (Proxy)                 │
│  /api/openaip/style    → Transform + serve style JSON  │
│  /api/openaip/tiles/*  → Proxy vector tiles            │
│  /api/openaip/sprites/* → Serve locally-built sprites  │
│  /api/openaip/airports/* → Proxy REST API              │
│  /api/openaip/navaids/*  → Proxy REST API              │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                External Services                        │
│  ┌─────────────────┐ ┌─────────────────┐               │
│  │  OpenAIP API    │ │    MapTiler     │               │
│  │  (tiles, REST)  │ │  (base map,     │               │
│  │                 │ │   glyphs)       │               │
│  └─────────────────┘ └─────────────────┘               │
│  ┌─────────────────┐ ┌─────────────────┐               │
│  │   Supabase      │ │  Weather APIs   │               │
│  │  (auth, db)     │ │  (METAR/TAF)    │               │
│  └─────────────────┘ └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

**Data Flow for Map:**
1. Client loads map with style from `/api/openaip/style`
2. API route fetches OpenAIP style, transforms for MapLibre, rewrites URLs
3. Map requests tiles through `/api/openaip/tiles/{z}/{x}/{y}`
4. API route proxies to OpenAIP with auth header
5. Sprites served from `/api/openaip/sprites/*` (locally built)
6. User clicks feature → basic data from vector tile shown immediately
7. REST API called for full details → sidebar enriched

### 3.2 Key Technical Decisions

#### Maps: Custom OpenAIP Integration (NOT MapTiler Hosted)
**Decision:** Build and host OpenAIP sprites locally, proxy tiles through backend, transform style for MapLibre.

**Rationale:**
- 1:1 visual fidelity with openaip.net requires their actual sprites
- MapTiler's "OpenAIP style" uses different/simplified icons
- OpenAIP's sprites are open source but must be built from SVG sources
- Full control over styling and feature display

**Implementation:**
```javascript
// 1. Build sprites from github.com/openAIP/mapstyles
// 2. Host sprite files on your server
// 3. Proxy tile requests through Next.js API routes
// 4. Transform OpenAIP style JSON for MapLibre compatibility

const map = new maplibregl.Map({
  container: 'map',
  style: '/api/openaip/style', // Your transformed style
  center: [28.0, -26.0],
  zoom: 7
});
```

#### Proxy Server Required
**Decision:** Use Next.js API routes to proxy OpenAIP tile and style requests.

**Rationale:**
- OpenAIP API requires authentication headers (not query params)
- CORS restrictions prevent direct browser requests
- Allows style transformation before serving to client
- Can cache responses for performance

**Endpoints needed:**
```
/api/openaip/style          → Fetch + transform style JSON
/api/openaip/tiles/{z}/{x}/{y} → Proxy vector tiles
/api/openaip/sprites/*      → Serve locally-built sprites
/api/openaip/airports/*     → Proxy REST API for full details
/api/openaip/navaids/*      → Proxy REST API for full details
/api/openaip/airspaces/*    → Proxy REST API for full details
```

#### State Management: Zustand
**Decision:** Use Zustand over Redux/Context.

**Rationale:**
- Minimal boilerplate
- Perfect for map + UI state synchronization
- Easy to persist to localStorage
- TypeScript-friendly

**Store Structure:**
```typescript
interface FlightPlanStore {
  // Route
  waypoints: Waypoint[];
  activeWaypointIndex: number | null;
  
  // Map state
  mapCenter: [number, number];
  mapZoom: number;
  visibleLayers: string[];
  
  // UI state
  sidebarOpen: boolean;
  activePanel: 'route' | 'weather' | 'aircraft' | 'briefing';
  
  // Aircraft
  selectedAircraft: Aircraft | null;
  
  // Actions
  addWaypoint: (waypoint: Waypoint) => void;
  removeWaypoint: (index: number) => void;
  reorderWaypoints: (from: number, to: number) => void;
  // ...
}
```

#### Database: Supabase
**Decision:** Use Supabase for auth, database, and real-time features.

**Rationale:**
- PostgreSQL with great free tier
- Built-in auth (email, OAuth)
- Row-level security for multi-tenant data
- Real-time subscriptions (for future collaboration)
- Generous free tier (500MB database, 50k MAU)

#### Deployment: Vercel
**Decision:** Deploy on Vercel with edge functions.

**Rationale:**
- Native Next.js support
- Global edge network
- Automatic CI/CD from GitHub
- Free tier sufficient for launch

---

## 4. Feature Specifications

### 4.1 MVP Features (v1.0)

#### F1: Interactive Aviation Map
**Priority:** P0 (Critical)

**Description:**
Full-screen interactive map displaying OpenAIP aviation data including airspace, airports, navaids, and obstacles.

**Requirements:**
- [ ] MapLibre GL with MapTiler OpenAIP style
- [ ] Smooth pan/zoom with aviation-appropriate zoom levels
- [ ] Layer toggle controls (airspace, airports, navaids, obstacles)
- [ ] Click-to-inspect any aviation feature
- [ ] Feature popup with relevant details
- [ ] Current location button (with permission)
- [ ] Map style toggle (VFR/IFR/Satellite)

**Acceptance Criteria:**
- Map loads in < 2 seconds on 4G connection
- All OpenAIP layers render correctly
- Clicking airport shows: name, ICAO, runways, frequencies, elevation
- Clicking airspace shows: class, vertical limits, controlling authority

---

#### F2: Route Planning
**Priority:** P0 (Critical)

**Description:**
Create, edit, and visualize flight routes on the map with distance, bearing, and time calculations.

**Requirements:**
- [ ] Click-to-add waypoints on map
- [ ] Drag waypoints to reposition
- [ ] Waypoint list in sidebar (reorderable)
- [ ] Search for airports/navaids by ICAO/name
- [ ] Route line rendered on map (great circle or rhumb line option)
- [ ] Per-leg calculations: distance (nm), magnetic bearing, estimated time
- [ ] Total route summary: distance, estimated time, fuel required

**Waypoint Types:**
- Airport (from OpenAIP)
- Navaid (VOR, NDB, from OpenAIP)
- User waypoint (lat/lon)
- Visual reporting point

**Calculations:**
```typescript
interface RouteLeg {
  from: Waypoint;
  to: Waypoint;
  distanceNm: number;
  trueBearing: number;
  magneticBearing: number; // Adjusted for local variation
  estimatedTimeMinutes: number; // Based on aircraft performance
  fuelRequired: number; // Based on aircraft consumption
}
```

**Acceptance Criteria:**
- Route with 10 waypoints renders in < 100ms
- Distance calculations accurate to 0.1nm
- Bearing calculations accurate to 1°
- Routes persist in browser (localStorage) and to account (Supabase)

---

#### F3: Weather Integration
**Priority:** P0 (Critical)

**Description:**
Display current and forecast weather for route airports and general area.

**Requirements:**
- [ ] METAR display for airports (decoded, human-readable)
- [ ] TAF display for airports (decoded)
- [ ] Weather icons on map for airports with METAR
- [ ] Color-coded flight conditions (VFR/MVFR/IFR/LIFR)
- [ ] Wind barbs overlay (optional layer)
- [ ] Weather along route summary
- [ ] Auto-refresh every 15 minutes

**Data Sources:**
- Aviation Weather Center (aviationweather.gov) - Primary
- OpenAIP weather endpoints - Secondary
- CheckWX API - Backup

**Weather Display:**
```
FAJS (Johannesburg)
━━━━━━━━━━━━━━━━━━━━━
METAR: 261200Z 36008KT 9999 FEW040 22/12 Q1024
Decoded: 
  Wind: 360° at 8kt
  Visibility: 10km+
  Clouds: Few at 4000ft
  Temp/Dew: 22°C / 12°C
  Altimeter: 1024 hPa
  Conditions: VFR ✓
```

**Acceptance Criteria:**
- Weather loads within 3 seconds
- METAR/TAF decoding matches official interpretation
- Flight category colors match FAA/ICAO standards

---

#### F4: Aircraft Performance Profiles
**Priority:** P1 (High)

**Description:**
Store aircraft performance data for accurate flight planning calculations.

**Requirements:**
- [ ] Create/edit aircraft profiles
- [ ] Pre-loaded common aircraft (C172, PA28, C182, etc.)
- [ ] Performance fields: cruise speed, fuel consumption, fuel capacity
- [ ] Select active aircraft for route calculations
- [ ] Support for multiple aircraft per user

**Aircraft Profile Schema:**
```typescript
interface Aircraft {
  id: string;
  userId: string;
  
  // Identity
  registration: string; // e.g., "ZS-ABC"
  type: string; // e.g., "C172S"
  name?: string; // e.g., "My Skyhawk"
  
  // Performance
  cruiseSpeedKts: number;
  fuelConsumptionGph: number;
  fuelCapacityGal: number;
  usableFuelGal: number;
  
  // Optional detailed performance
  climbRateFpm?: number;
  climbFuelGph?: number;
  descentRateFpm?: number;
  
  // Weight & Balance (future)
  emptyWeightLbs?: number;
  maxGrossWeightLbs?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- User can create aircraft in < 30 seconds
- Calculations update immediately when aircraft changed
- At least 10 pre-loaded aircraft types

---

#### F5: Airport Information
**Priority:** P1 (High)

**Description:**
Detailed airport information pages with all relevant pilot data.

**Requirements:**
- [ ] Airport search (ICAO, name, city)
- [ ] Airport detail page/modal with:
  - General info (name, ICAO, elevation, coordinates)
  - Runways (dimensions, surface, lighting)
  - Frequencies (tower, ground, ATIS, approach)
  - Fuel availability
  - Services (customs, handling, etc.)
  - Current weather (METAR/TAF)
  - NOTAMs affecting airport
- [ ] "Add to route" button from airport page
- [ ] Favorite airports list

**Data Source:** OpenAIP REST API

**Acceptance Criteria:**
- Airport search returns results in < 500ms
- All OpenAIP airport data displayed correctly
- Runway diagrams rendered (basic)

---

#### F6: NOTAMs
**Priority:** P1 (High)

**Description:**
Display relevant NOTAMs for route and airports.

**Requirements:**
- [ ] Fetch NOTAMs for route airports
- [ ] Fetch NOTAMs for FIRs along route
- [ ] Categorize by type (airport, airspace, navigation, obstacle)
- [ ] Highlight critical NOTAMs
- [ ] Filter by category
- [ ] Show on map where applicable (TFRs, closed airspace)

**Data Sources:**
- ICAO API (if available)
- FAA NOTAM API (for US)
- Local CAA sources

**Acceptance Criteria:**
- NOTAMs load within 5 seconds
- Critical NOTAMs visually distinguished
- NOTAM effective dates clearly shown

---

#### F7: Flight Briefing
**Priority:** P1 (High)

**Description:**
Generate comprehensive flight briefing document.

**Requirements:**
- [ ] One-click briefing generation
- [ ] Includes: route summary, weather, NOTAMs, fuel calculations
- [ ] Print-friendly format
- [ ] PDF export
- [ ] Email briefing option

**Briefing Sections:**
1. Flight Summary (route, times, fuel)
2. Weather Synopsis
3. Departure Airport Weather
4. En Route Weather
5. Destination Airport Weather
6. Alternate Airport Weather
7. NOTAMs
8. Fuel Log
9. Weight & Balance (if data provided)

**Acceptance Criteria:**
- Briefing generates in < 5 seconds
- PDF is properly formatted for printing
- All critical information included

---

#### F8: User Authentication
**Priority:** P1 (High)

**Description:**
User accounts for saving data and preferences.

**Requirements:**
- [ ] Email/password registration
- [ ] Google OAuth
- [ ] Password reset flow
- [ ] User preferences storage
- [ ] Data sync across devices

**User Data Stored:**
- Saved routes
- Aircraft profiles
- Favorite airports
- Preferences (units, default location, etc.)
- Flight logs (future)

**Acceptance Criteria:**
- Registration < 60 seconds
- Login < 3 seconds
- Data syncs within 5 seconds

---

### 4.2 Post-MVP Features (v1.x)

#### F9: Weight & Balance Calculator
**Priority:** P2 (Medium)

Calculate aircraft weight and balance with visual CG envelope.

#### F10: Fuel Planning
**Priority:** P2 (Medium)

Detailed fuel planning with reserves, alternates, and contingency.

#### F11: Flight Logging
**Priority:** P2 (Medium)

Log completed flights with automatic route recall.

#### F12: Offline Mode
**Priority:** P2 (Medium)

Download map tiles and data for offline use (PWA).

#### F13: Collaborative Planning
**Priority:** P3 (Low)

Share routes with other users, real-time collaboration.

#### F14: SkyVector-style Charts
**Priority:** P3 (Low)

Overlay official VFR/IFR charts where available.

---

## 5. Data Models

### 5.1 Database Schema (Supabase/PostgreSQL)

```sql
-- Users (managed by Supabase Auth)
-- profiles table for additional user data
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  default_location POINT,
  preferred_units TEXT DEFAULT 'imperial', -- 'imperial' | 'metric'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aircraft
CREATE TABLE aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  registration TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  cruise_speed_kts NUMERIC NOT NULL,
  fuel_consumption_gph NUMERIC NOT NULL,
  fuel_capacity_gal NUMERIC NOT NULL,
  usable_fuel_gal NUMERIC NOT NULL,
  climb_rate_fpm NUMERIC,
  empty_weight_lbs NUMERIC,
  max_gross_weight_lbs NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  aircraft_id UUID REFERENCES aircraft(id),
  waypoints JSONB NOT NULL, -- Array of waypoint objects
  total_distance_nm NUMERIC,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite Airports
CREATE TABLE favorite_airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  icao_code TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, icao_code)
);

-- Flight Logs (future)
CREATE TABLE flight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  aircraft_id UUID REFERENCES aircraft(id),
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  actual_fuel_used NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own aircraft" ON aircraft
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own routes" ON routes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own favorites" ON favorite_airports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own flight logs" ON flight_logs
  FOR ALL USING (auth.uid() = user_id);
```

### 5.2 TypeScript Types

```typescript
// Waypoint types
type WaypointType = 'airport' | 'navaid' | 'user' | 'vrp';

interface Waypoint {
  id: string;
  type: WaypointType;
  name: string;
  icao?: string; // For airports/navaids
  coordinates: [number, number]; // [lng, lat]
  elevation?: number; // feet MSL
  notes?: string;
}

// Route with calculations
interface Route {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aircraftId?: string;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  totalDistanceNm: number;
  estimatedTimeMinutes: number;
  fuelRequiredGal?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteLeg {
  from: Waypoint;
  to: Waypoint;
  distanceNm: number;
  trueBearing: number;
  magneticBearing: number;
  estimatedTimeMinutes: number;
  fuelRequired?: number;
}

// Weather
interface Metar {
  icao: string;
  raw: string;
  observationTime: Date;
  wind: {
    direction: number;
    speed: number;
    gust?: number;
    variable?: boolean;
  };
  visibility: {
    value: number;
    unit: 'SM' | 'M';
  };
  clouds: Array<{
    coverage: 'SKC' | 'FEW' | 'SCT' | 'BKN' | 'OVC';
    altitude: number; // feet AGL
  }>;
  temperature: number; // Celsius
  dewpoint: number; // Celsius
  altimeter: number; // hPa or inHg
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
}

// OpenAIP Airport (from API)
interface OpenAipAirport {
  _id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  altIdentifier?: string;
  type: number; // 0=closed, 1=airfield, 2=intl, etc.
  country: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  elevation: {
    value: number;
    unit: number; // 1=meters, 6=feet
  };
  runways?: Array<{
    designator: string;
    trueHeading: number;
    length: { value: number; unit: number };
    width: { value: number; unit: number };
    surface: { type: number };
  }>;
  frequencies?: Array<{
    type: number;
    value: string;
    name?: string;
  }>;
}
```

---

## 6. API Endpoints

### 6.1 External APIs

#### MapTiler
- **Style:** `https://api.maptiler.com/maps/openAIP/style.json?key={key}`
- **Geocoding:** `https://api.maptiler.com/geocoding/{query}.json?key={key}`

#### OpenAIP REST API
- **Base URL:** `https://api.core.openaip.net/api/`
- **Airports:** `GET /airports?apiKey={key}&searchBy=icaoCode&search={icao}`
- **Airspaces:** `GET /airspaces?apiKey={key}&...`
- **Navaids:** `GET /navaids?apiKey={key}&...`

#### Weather
- **Aviation Weather Center:** `https://aviationweather.gov/api/data/metar?ids={icao}`
- **CheckWX (backup):** `https://api.checkwx.com/metar/{icao}`

### 6.2 Internal API Routes (Next.js)

```
POST   /api/routes              - Create new route
GET    /api/routes              - List user's routes
GET    /api/routes/[id]         - Get specific route
PUT    /api/routes/[id]         - Update route
DELETE /api/routes/[id]         - Delete route

POST   /api/aircraft            - Create aircraft
GET    /api/aircraft            - List user's aircraft
PUT    /api/aircraft/[id]       - Update aircraft
DELETE /api/aircraft/[id]       - Delete aircraft

GET    /api/weather/metar/[icao]   - Get METAR (proxied + cached)
GET    /api/weather/taf/[icao]     - Get TAF (proxied + cached)

GET    /api/airports/search        - Search airports
GET    /api/airports/[icao]        - Get airport details

GET    /api/briefing/[routeId]     - Generate flight briefing
POST   /api/briefing/pdf           - Generate PDF briefing
```

---

## 7. UI/UX Design

### 7.1 Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Logo    Search [____________]    [Weather] [Profile] [≡]     │
├────────────────────────────────────────────────────────────────┤
│        │                                                       │
│        │                                                       │
│  S     │                                                       │
│  I     │                                                       │
│  D     │                    MAP                                │
│  E     │                                                       │
│  B     │                                                       │
│  A     │                                           [Layers]    │
│  R     │                                           [Location]  │
│        │                                           [Zoom +]    │
│        │                                           [Zoom -]    │
├────────┴───────────────────────────────────────────────────────┤
│  Route: FAJS → FACT  |  156nm  |  1h 12m  |  12.3gal          │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Sidebar Panels

1. **Route Panel** (default)
   - Waypoint list
   - Add waypoint button
   - Route summary
   - Calculate button

2. **Weather Panel**
   - Route weather summary
   - Individual station weather
   - Refresh button

3. **Aircraft Panel**
   - Aircraft selector
   - Quick edit performance
   - Manage aircraft link

4. **Briefing Panel**
   - Generate briefing
   - Preview
   - Print/Export buttons

### 7.3 OpenAIP-Style Sidebar (Click to Inspect)

The sidebar must replicate OpenAIP's exact information display when clicking map features.

**Airport Sidebar Fields (in order):**
```
[ICAO] [NAME]
Country: [flag emoji] [ISO code]
Type: [Airfield Civil | International | Military | etc.]
ICAO code: [code]
IATA code: [code or NIL]
Traffic Types: [VFR | IFR | VFR/IFR]

Location
  DMS: [lat]°[min]'[sec]"[N/S] [lon]°[min]'[sec]"[E/W]
  Decimals: [lat], [lon]

Elevation: [value] m MSL

Ownership / Legal Restrictions
  PPR: [Yes/No]
  Private: [Yes/No]

Frequencies
  [type]: [value] MHz (for each frequency)

Runways
  [designator]: [length] x [width] m [surface] (for each runway)

Special Activities
  Skydiving: [Yes/No]

Fuel Types
  AVGAS: [Yes/No]
  JET A1: [Yes/No]
  (etc.)

Handling Facilities
  (list of Yes/No fields)

Passenger Facilities
  (list of Yes/No fields)

Glider Towing
  (list of launch methods)

Hours Of Operation: [hours or NIL]
Remarks: [text or NIL]

[Show View Page] button → links to openaip.net/airportView/[id]
```

**Navaid Sidebar Fields:**
```
[IDENT] [NAME]
Country: [flag emoji] [ISO code]
Type: [VOR | NDB | DME | TACAN | etc.]
Range: [value or NIL]
Magnetic Declination: [value]
Aligned True North: [Yes/No]

Location
  DMS: [coordinates]
  Decimals: [coordinates]

Elevation: [value] m MSL

Frequency / Channel
  Frequency: [value] MHz
  Channel: [value or NIL]

Hours Of Operation: [hours or 24H]
Remarks: [text or NIL]
```

**Airspace Sidebar Fields:**
```
[NAME]
Country: [flag emoji] [ISO code]
Type: [CTR | TMA | FIR | etc.]
Class: [A-G]

Vertical Limits
  Upper: [FL/altitude]
  Lower: [FL/altitude/GND/SFC]

Activity
  [description]

Hours Of Operation: [hours]
Remarks: [text or NIL]
```

### 7.4 Design Principles

- **Aviation-first colors:** Blues, grays, with caution yellow/red for warnings
- **High contrast:** Readable in bright cockpit conditions
- **Minimal chrome:** Map is primary focus
- **Touch-friendly:** Large tap targets for tablet use
- **Consistent with OpenAIP:** Match their UI patterns where sensible

### 7.4 Responsive Breakpoints

- **Desktop:** Full sidebar + map
- **Tablet:** Collapsible sidebar, larger touch targets
- **Mobile:** Bottom sheet for panels, full-screen map

---

## 8. Project Structure

```
halo-flight-planning/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Main map view
│   │   ├── aircraft/page.tsx
│   │   ├── routes/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── openaip/
│   │   │   ├── style/route.ts        # Fetch + transform OpenAIP style
│   │   │   ├── tiles/[...path]/route.ts  # Proxy vector tiles
│   │   │   ├── sprites/[...path]/route.ts # Serve local sprites
│   │   │   ├── airports/[id]/route.ts    # Proxy REST API
│   │   │   ├── navaids/[id]/route.ts     # Proxy REST API
│   │   │   └── airspaces/[id]/route.ts   # Proxy REST API
│   │   ├── routes/route.ts
│   │   ├── aircraft/route.ts
│   │   ├── weather/
│   │   │   └── metar/[icao]/route.ts
│   │   └── briefing/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── map/
│   │   ├── Map.tsx
│   │   ├── MapControls.tsx
│   │   ├── LayerToggle.tsx
│   │   └── RouteLayer.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── FeatureInspector.tsx      # OpenAIP-style feature display
│   │   ├── AirportDetails.tsx        # Airport sidebar panel
│   │   ├── NavaidDetails.tsx         # Navaid sidebar panel
│   │   ├── AirspaceDetails.tsx       # Airspace sidebar panel
│   │   ├── RoutePanel.tsx
│   │   ├── WeatherPanel.tsx
│   │   ├── AircraftPanel.tsx
│   │   └── BriefingPanel.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ... (shadcn/ui components)
│   └── weather/
│       ├── MetarDisplay.tsx
│       ├── TafDisplay.tsx
│       └── WeatherIcon.tsx
├── lib/
│   ├── openaip/
│   │   ├── styleConverter.ts         # Mapbox → MapLibre conversion
│   │   ├── clickHandler.ts           # Feature click + sidebar
│   │   ├── featureParser.ts          # Parse vector tile properties
│   │   └── types.ts                  # OpenAIP TypeScript types
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── calculations/
│   │   ├── distance.ts
│   │   ├── bearing.ts
│   │   ├── fuel.ts
│   │   └── magnetic.ts
│   ├── weather/
│   │   ├── metar-parser.ts
│   │   ├── taf-parser.ts
│   │   └── flight-category.ts
│   └── utils/
│       ├── format.ts
│       └── constants.ts
├── stores/
│   ├── flightPlanStore.ts
│   ├── mapStore.ts
│   └── userStore.ts
├── types/
│   ├── aircraft.ts
│   ├── route.ts
│   ├── weather.ts
│   └── openaip.ts
├── public/
│   ├── sprites/
│   │   ├── openaip.json          # Built from mapstyles repo
│   │   ├── openaip.png           # Built from mapstyles repo
│   │   ├── openaip@2x.json       # Retina version
│   │   └── openaip@2x.png        # Retina version
│   └── icons/
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 9. Environment Variables

```env
# MapTiler
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key

# OpenAIP
OPENAIP_API_KEY=your_openaip_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Weather APIs
CHECKWX_API_KEY=your_checkwx_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Development Phases

### Phase 0: OpenAIP Sprite Setup (Day 1-2)
- [ ] Clone github.com/openAIP/mapstyles
- [ ] Install dependencies (`npm install`)
- [ ] Build sprites (`npm run build:style:default`)
- [ ] Copy sprite files to `public/sprites/`
- [ ] Verify sprite.json contains all aviation icons
- [ ] Test sprite loading in isolation

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Next.js, TypeScript, Tailwind)
- [ ] Supabase setup (auth, database schema)
- [ ] OpenAIP proxy API routes (style, tiles, REST)
- [ ] Style converter (Mapbox → MapLibre)
- [ ] Basic map with OpenAIP style + sprites
- [ ] Verify 1:1 visual match with openaip.net
- [ ] Layer toggle controls
- [ ] Feature click → sidebar display

### Phase 2: Route Planning (Week 3-4)
- [ ] Waypoint management (add, remove, reorder)
- [ ] Route visualization on map
- [ ] Distance/bearing calculations
- [ ] Route persistence (local + Supabase)
- [ ] Airport/navaid search

### Phase 3: Weather & Aircraft (Week 5-6)
- [ ] METAR/TAF fetching and parsing
- [ ] Weather display components
- [ ] Weather overlay on map
- [ ] Aircraft profile CRUD
- [ ] Route calculations with aircraft performance

### Phase 4: Polish & Launch (Week 7-8)
- [ ] Flight briefing generation
- [ ] PDF export
- [ ] NOTAMs integration
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Documentation
- [ ] Beta testing
- [ ] Production deployment

---

## 11. Success Metrics

### Launch Goals (Month 1)
- 100 registered users
- 500 routes created
- < 3 second page load time
- 99% uptime

### Growth Goals (Month 3)
- 500 registered users
- 2,500 routes created
- 4+ star rating (if on app stores)
- Feature parity with basic ForeFlight web

### Quality Metrics
- Lighthouse score > 90
- Core Web Vitals: Green
- Error rate < 0.1%
- API response time < 200ms (p95)

---

## 12. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| MapTiler rate limits | High | Medium | Implement caching, monitor usage |
| OpenAIP data accuracy | Medium | Low | Cross-reference with official sources |
| Weather API downtime | Medium | Medium | Multiple fallback providers |
| Supabase free tier limits | Medium | Low | Monitor usage, plan upgrade path |
| Aviation regulation compliance | High | Low | Disclaimer: "Not for real navigation" |

---

## 13. Legal Considerations

### Disclaimers Required
- "For flight planning assistance only"
- "Always verify with official sources"
- "Not a replacement for official weather briefings"
- "Pilot in command is responsible for flight safety"

### Data Attribution
- OpenAIP data attribution required
- MapTiler attribution (automatic in SDK)
- Weather data source attribution

---

## 14. Future Considerations

### Mobile App (v2.0)
- React Native with MapLibre Native
- Shared business logic with web
- Offline map tiles
- GPS integration

### Premium Features (v2.x)
- Enhanced weather radar
- 3D terrain visualization
- Flight tracking
- Logbook integration
- Multi-aircraft fleet management

### Integrations (v3.x)
- Import/export to ForeFlight, Garmin Pilot
- ADS-B traffic (via external receiver)
- Flight school management
- Insurance/compliance documentation

---

## Appendix A: OpenAIP API Reference

### Authentication
All requests require `apiKey` query parameter.

### Airports Endpoint
```
GET https://api.core.openaip.net/api/airports
Query params:
  - apiKey (required)
  - searchBy: 'icaoCode' | 'name' | 'city'
  - search: string
  - country: ISO country code
  - type: airport type filter
  - limit: max results
  - page: pagination
```

### Response Example
```json
{
  "totalCount": 1,
  "totalPages": 1,
  "limit": 100,
  "page": 1,
  "items": [{
    "_id": "507f1f77bcf86cd799439011",
    "name": "OR Tambo International",
    "icaoCode": "FAOR",
    "type": 2,
    "country": "ZA",
    "geometry": {
      "type": "Point",
      "coordinates": [28.246, -26.139]
    },
    "elevation": { "value": 1694, "unit": 1 },
    "runways": [...],
    "frequencies": [...]
  }]
}
```

---

## Appendix B: Aviation Calculations

### Great Circle Distance
```typescript
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### True to Magnetic Bearing
```typescript
function trueToMagnetic(trueBearing: number, variation: number): number {
  // Variation is positive for East, negative for West
  let magnetic = trueBearing - variation;
  if (magnetic < 0) magnetic += 360;
  if (magnetic >= 360) magnetic -= 360;
  return magnetic;
}
```

### Time/Fuel Calculations
```typescript
function calculateLegTime(distanceNm: number, groundSpeedKts: number): number {
  return (distanceNm / groundSpeedKts) * 60; // minutes
}

function calculateFuelRequired(timeMinutes: number, consumptionGph: number): number {
  return (timeMinutes / 60) * consumptionGph;
}
```

---

## Appendix C: MapLibre Style Conversion

OpenAIP's style is written for Mapbox GL JS. MapLibre has subtle differences that require transformation.

### Required Transformations

#### 1. Sprite URL Rewriting
```javascript
// Before (OpenAIP style)
"sprite": "mapbox://sprites/webmaster-openaip/ckn740ghl0xv717p1jc6wi59p"

// After (your hosted sprites)
"sprite": "https://your-domain.com/sprites/openaip"
```

#### 2. Source URL Rewriting
```javascript
// Before
"tiles": ["https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.pbf"]

// After (through your proxy)
"tiles": ["/api/openaip/tiles/{z}/{x}/{y}"]
```

#### 3. Legacy "stops" to Expressions
```javascript
// Before (legacy Mapbox syntax)
"circle-radius": {
  "stops": [[5, 2], [10, 4], [15, 8]]
}

// After (MapLibre expression)
"circle-radius": [
  "interpolate", ["linear"], ["zoom"],
  5, 2,
  10, 4,
  15, 8
]
```

#### 4. Filter Expression Fixes
```javascript
// Before (can cause errors)
["in", "$type", "Point"]

// After (proper expression)
["==", ["geometry-type"], "Point"]
```

#### 5. Text Offset Fixes
```javascript
// Before (single value - invalid)
"text-offset": [0]

// After (valid [x, y] array)
"text-offset": [0, 0]
```

### Style Converter Function

```typescript
// lib/openaip/styleConverter.ts
export function convertOpenAipStyle(style: any, proxyBase: string): any {
  const converted = JSON.parse(JSON.stringify(style));
  
  // 1. Replace sprite URL
  converted.sprite = `${proxyBase}/sprites/openaip`;
  
  // 2. Replace glyphs URL (use MapTiler or your own)
  converted.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`;
  
  // 3. Rewrite source URLs
  for (const [sourceName, source] of Object.entries(converted.sources)) {
    if (source.tiles) {
      source.tiles = source.tiles.map((url: string) => 
        url.replace('https://api.tiles.openaip.net/api/data/openaip', `${proxyBase}/tiles`)
      );
    }
  }
  
  // 4. Fix layers
  converted.layers = converted.layers.map((layer: any) => {
    // Fix text-offset
    if (layer.layout?.['text-offset']?.length === 1) {
      layer.layout['text-offset'] = [layer.layout['text-offset'][0], 0];
    }
    
    // Convert stops to expressions
    if (layer.paint) {
      layer.paint = convertStopsToExpressions(layer.paint);
    }
    if (layer.layout) {
      layer.layout = convertStopsToExpressions(layer.layout);
    }
    
    // Fix problematic filters
    if (layer.filter) {
      layer.filter = fixFilterExpression(layer.filter);
    }
    
    return layer;
  });
  
  return converted;
}

function convertStopsToExpressions(props: any): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === 'object' && 'stops' in value) {
      // Convert stops to interpolate expression
      const stops = value.stops;
      const expression = ['interpolate', ['linear'], ['zoom']];
      for (const [zoom, val] of stops) {
        expression.push(zoom, val);
      }
      result[key] = expression;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function fixFilterExpression(filter: any[]): any[] {
  if (!Array.isArray(filter)) return filter;
  
  const [operator, ...args] = filter;
  
  // Fix ["in", "$type", "Point"] → ["==", ["geometry-type"], "Point"]
  if (operator === 'in' && args[0] === '$type') {
    return ['==', ['geometry-type'], args[1]];
  }
  
  // Recursively fix nested filters
  if (['all', 'any', 'none'].includes(operator)) {
    return [operator, ...args.map(fixFilterExpression)];
  }
  
  return filter;
}
```

### Click Handler for Sidebar

```typescript
// lib/openaip/clickHandler.ts
export function setupOpenAipClickHandlers(
  map: maplibregl.Map,
  onFeatureClick: (feature: OpenAipFeature) => void
) {
  // Layers that should be clickable
  const clickableLayers = [
    'airport_intl', 'airport_with_code', 'airport_other',
    'airport_gliding', 'airport_parachute', 'airport_heli',
    'navaid_vor', 'navaid_ndb', 'navaid_other',
    'airspace_ctr_fill', 'airspace_tma_cta_offset',
    'reporting_point', 'obstacle'
  ];
  
  // Filter to only layers that exist
  const existingLayers = clickableLayers.filter(id => map.getLayer(id));
  
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: existingLayers
    });
    
    if (features.length > 0) {
      const feature = features[0];
      const parsed = parseVectorTileFeature(feature);
      onFeatureClick(parsed);
      
      // Optionally fetch full details from REST API
      if (parsed.sourceId && parsed.type) {
        fetchFullDetails(parsed.sourceId, parsed.type)
          .then(fullDetails => {
            onFeatureClick({ ...parsed, ...fullDetails, enriched: true });
          });
      }
    }
  });
  
  // Cursor change on hover
  existingLayers.forEach(layer => {
    map.on('mouseenter', layer, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layer, () => {
      map.getCanvas().style.cursor = '';
    });
  });
}

function parseVectorTileFeature(feature: maplibregl.MapGeoJSONFeature): OpenAipFeature {
  const props = feature.properties;
  const sourceLayer = feature.sourceLayer;
  
  // Parse name_label_full for embedded data
  // Format: "ICAO elevation\nNAME\nfrequency runway"
  const fullLabel = props.name_label_full || '';
  const lines = fullLabel.split('\n');
  
  // Extract based on feature type
  if (sourceLayer === 'airports') {
    return parseAirportFromTile(props, lines, feature.geometry);
  } else if (sourceLayer === 'navaids') {
    return parseNavaidFromTile(props, lines, feature.geometry);
  } else if (sourceLayer === 'airspaces') {
    return parseAirspaceFromTile(props, feature.geometry);
  }
  
  return { type: 'unknown', raw: props };
}

async function fetchFullDetails(sourceId: string, type: string): Promise<any> {
  const endpoint = type === 'airport' ? 'airports' 
    : type === 'navaid' ? 'navaids'
    : type === 'airspace' ? 'airspaces'
    : null;
    
  if (!endpoint) return {};
  
  const response = await fetch(`/api/openaip/${endpoint}/${sourceId}`);
  if (!response.ok) return {};
  
  return response.json();
}
```

---

*Document Version: 2.0*  
*Last Updated: November 2025*
