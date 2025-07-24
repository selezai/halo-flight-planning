# Halo - Technical Specifications

## App Naming Convention
- **Internal Name**: Halo
- **App Store Display**: Halo Flight Planning
- **Package Identifier**: com.halo.flightplanning

## 1. System Architecture

### 1.1 Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PWA (Web)     │  iOS Native     │    Android Native           │
│   React 18+     │  React Native   │    React Native             │
│   Service Worker│  iOS 14+        │    Android 8+               │
└────────┬────────┴────────┬────────┴────────┬──────────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                    ┌──────┴──────┐
                    │   API Gateway │
                    │   Supabase   │
                    └──────┬──────┘
                           │
        ┌──────────────────┴──────────────────────┐
        │              Backend Services            │
        ├─────────────┬───────────┬───────────────┤
        │  Database   │  Storage  │  Real-time    │
        │  PostgreSQL │  S3/CDN   │  WebSockets   │
        └─────────────┴───────────┴───────────────┘
                           │
        ┌──────────────────┴──────────────────────┐
        │           External Services              │
        ├────────┬────────┬────────┬──────────────┤
        │Weather │Aviation│Traffic │AI/ML         │
        │APIs    │Data    │Data    │Gemini API    │
        └────────┴────────┴────────┴──────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework**: React 18.2+ (Web), React Native 0.72+ (Mobile)
- **State Management**: Redux Toolkit + RTK Query
- **UI Components**: 
  - Web: Shadcn UI (modern, clean design system)
  - Mobile: React Native Elements + custom Shadcn-inspired components
- **Maps**: MapLibre GL JS (Web), React Native Maps (Mobile)
- **Map Component Architecture**: The primary map interface (`HaloMap.jsx`) is structured using a modular, hook-based architecture to separate concerns and improve maintainability.
  - `useMapInitialization`: Handles the lifecycle of the MapLibre GL instance, including creation and cleanup.
  - `useOpenAipData`: Manages fetching and loading all aviation data layers from the OpenAIP API.
  - `useMapInteractions`: Encapsulates user interaction logic, such as feature selection and popups.
  - `MapProvider`: A React Context provider that makes the map instance available to child components without prop drilling.
- **Styling**: 
  - Web: Tailwind CSS (required for Shadcn UI)
  - Mobile: StyleSheet + styled-components
- **Icons**: Lucide React (no emojis in UI)
- **Build Tools**: Vite (Web), Metro (Mobile)
- **Testing**: Jest + React Testing Library + Cypress (E2E)

#### Backend (Supabase)
- **Database**: PostgreSQL 15+
- **Authentication**: Supabase Auth (JWT-based)
- **Real-time**: Supabase Realtime (PostgreSQL replication)
- **Storage**: Supabase Storage (S3-compatible)
- **Edge Functions**: Deno-based serverless functions
- **API**: PostgREST (Auto-generated REST API)

#### Infrastructure
- **Hosting**: 
  - Web: Vercel/Netlify (CDN edge deployment)
  - API: Supabase Cloud (with option for self-hosting)
- **CDN**: Cloudflare for static assets
- **Monitoring**: Sentry for error tracking
- **Analytics**: PostHog (privacy-focused)

## 2. Database Schema

### 2.1 Core Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    license_number TEXT,
    subscription_tier TEXT DEFAULT 'basic',
    subscription_status TEXT DEFAULT 'trial',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Aircraft profiles
CREATE TABLE aircraft (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    registration TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    model TEXT,
    -- Performance data
    cruise_speed_kts INTEGER,
    fuel_capacity_gal DECIMAL(5,2),
    fuel_burn_gph DECIMAL(4,2),
    empty_weight_lbs DECIMAL(7,2),
    max_takeoff_weight_lbs DECIMAL(7,2),
    -- Equipment
    equipment_codes TEXT[],
    avionics JSONB,
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, registration)
);

-- Flight plans
CREATE TABLE flight_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    aircraft_id UUID REFERENCES aircraft(id),
    -- Route data
    departure_icao TEXT NOT NULL,
    destination_icao TEXT NOT NULL,
    alternate_icao TEXT,
    route_string TEXT,
    waypoints JSONB NOT NULL,
    -- Planning data
    departure_time TIMESTAMP,
    cruise_altitude INTEGER,
    true_airspeed INTEGER,
    -- Calculations
    distance_nm DECIMAL(6,1),
    estimated_time_enroute INTERVAL,
    fuel_required_gal DECIMAL(5,2),
    -- Weather
    weather_briefing JSONB,
    -- Status
    status TEXT DEFAULT 'draft',
    filed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Flight logs
CREATE TABLE flight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    flight_plan_id UUID REFERENCES flight_plans(id),
    aircraft_id UUID REFERENCES aircraft(id),
    -- Track data
    track_data JSONB, -- Array of position updates
    -- Times
    off_block_time TIMESTAMP,
    takeoff_time TIMESTAMP,
    landing_time TIMESTAMP,
    on_block_time TIMESTAMP,
    -- Statistics
    total_time INTERVAL,
    distance_flown_nm DECIMAL(6,1),
    fuel_used_gal DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    units JSONB DEFAULT '{"distance": "nm", "altitude": "ft", "speed": "kts", "fuel": "gal", "weight": "lbs"}',
    map_settings JSONB DEFAULT '{"theme": "light", "show_terrain": true, "show_weather": true}',
    notifications JSONB DEFAULT '{"weather_alerts": true, "airspace_warnings": true}',
    default_aircraft_id UUID REFERENCES aircraft(id),
    home_airport TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Offline data sync
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    data JSONB NOT NULL,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Indexes
```sql
-- Performance indexes
CREATE INDEX idx_aircraft_user_id ON aircraft(user_id);
CREATE INDEX idx_flight_plans_user_id ON flight_plans(user_id);
CREATE INDEX idx_flight_plans_departure ON flight_plans(departure_icao);
CREATE INDEX idx_flight_plans_destination ON flight_plans(destination_icao);
CREATE INDEX idx_flight_logs_user_id ON flight_logs(user_id);
CREATE INDEX idx_sync_queue_user_synced ON sync_queue(user_id, synced);
```

### 2.3 Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own aircraft" ON aircraft
    FOR ALL USING (auth.uid() = user_id);

-- Add similar policies for other tables
```

## 3. API Specifications

### 3.1 REST API Endpoints

#### Authentication
```yaml
POST /auth/signup
  body: { email, password, full_name }
  response: { user, session }

POST /auth/signin
  body: { email, password }
  response: { user, session }

POST /auth/signout
  headers: { Authorization: Bearer <token> }
  response: { success }

POST /auth/refresh
  body: { refresh_token }
  response: { session }
```

#### Flight Planning
```yaml
GET /api/flight-plans
  headers: { Authorization: Bearer <token> }
  query: { limit?, offset?, status? }
  response: { data: FlightPlan[], count }

POST /api/flight-plans
  headers: { Authorization: Bearer <token> }
  body: { departure_icao, destination_icao, waypoints, ... }
  response: { data: FlightPlan }

PUT /api/flight-plans/:id
  headers: { Authorization: Bearer <token> }
  body: { ...updates }
  response: { data: FlightPlan }

POST /api/flight-plans/:id/calculate
  headers: { Authorization: Bearer <token> }
  response: { 
    distance_nm, 
    estimated_time_enroute,
    fuel_required_gal,
    weather_summary 
  }

POST /api/flight-plans/:id/file
  headers: { Authorization: Bearer <token> }
  response: { filing_reference, status }
```

#### Weather
```yaml
GET /api/weather/metar/:icao
  response: { raw, decoded, observed_at }

GET /api/weather/taf/:icao
  response: { raw, decoded, valid_from, valid_to }

POST /api/weather/route
  body: { waypoints[], departure_time }
  response: { 
    weather_points: WeatherPoint[],
    summary: { vfr_percentage, warnings }
  }
```

#### AI Assistant (Premium)
```yaml
POST /api/ai/query
  headers: { Authorization: Bearer <token> }
  body: { 
    query: string,
    context?: { 
      flight_plan_id?, 
      current_position?,
      aircraft_id?
    }
  }
  response: { 
    response: string,
    suggestions?: Suggestion[],
    actions?: Action[]
  }

POST /api/ai/optimize-route
  headers: { Authorization: Bearer <token> }
  body: { 
    departure_icao,
    destination_icao,
    constraints: {
      avoid_weather?: boolean,
      minimize_fuel?: boolean,
      vfr_only?: boolean
    }
  }
  response: {
    routes: Route[],
    reasoning: string
  }
```

### 3.2 WebSocket Events

```typescript
// Real-time flight tracking
interface TrackingUpdate {
  event: 'position_update';
  data: {
    lat: number;
    lon: number;
    altitude: number;
    groundSpeed: number;
    heading: number;
    timestamp: string;
  };
}

// Weather updates
interface WeatherUpdate {
  event: 'weather_update';
  data: {
    airports: string[];
    update_type: 'metar' | 'taf' | 'sigmet';
    data: any;
  };
}

// Traffic updates
interface TrafficUpdate {
  event: 'traffic_update';
  data: {
    aircraft: {
      id: string;
      lat: number;
      lon: number;
      altitude: number;
      type?: string;
      callsign?: string;
    }[];
  };
}
```

## 4. Data Integration

### 4.1 External Data Sources

#### Aviation Data
```yaml
SACAA AIS:
  endpoint: https://api.sacaa.gov.za/ais/v1/
  auth: API_KEY
  data:
    - airports
    - navaids
    - airspace
    - notams

OpenAIP:
  endpoint: https://api.openaip.net/api/v1/
  auth: Bearer token
  data:
    - airports
    - airspace
    - navaids
    - frequencies

ICAO API:
  endpoint: https://api.icao.int/v1/
  auth: OAuth2
  data:
    - aircraft_types
    - airline_codes
    - airport_codes
```

#### Weather Data
```yaml
NOAA Aviation Weather:
  endpoint: https://aviationweather.gov/api/data/
  auth: none
  data:
    - metar
    - taf
    - airmet
    - sigmet

OpenWeatherMap:
  endpoint: https://api.openweathermap.org/data/3.0/
  auth: API_KEY
  data:
    - radar
    - satellite
    - forecast

Local Met Services:
  endpoint: https://api.weathersa.co.za/
  auth: API_KEY
  data:
    - local_observations
    - warnings
```

#### Traffic Data
```yaml
ADS-B Exchange:
  endpoint: https://adsbexchange.com/api/
  auth: API_KEY
  data:
    - live_traffic
    - historical_tracks

OpenSky Network:
  endpoint: https://opensky-network.org/api/
  auth: Basic Auth
  data:
    - state_vectors
    - tracks
```

### 4.2 Data Synchronization

```typescript
interface SyncStrategy {
  // Offline-first approach
  offline: {
    storage: 'IndexedDB';
    maxSize: '500MB';
    retention: '30days';
  };
  
  // Sync triggers
  triggers: [
    'network_available',
    'app_foreground',
    'manual_refresh',
    'data_change'
  ];
  
  // Conflict resolution
  conflictResolution: 'last_write_wins' | 'server_wins' | 'client_wins';
  
  // Data priorities
  priorities: {
    critical: ['current_flight_plan', 'aircraft_profiles'],
    high: ['weather_current', 'notams'],
    medium: ['charts', 'plates'],
    low: ['historical_logs']
  };
}
```

## 5. Security Specifications

### 5.1 Authentication & Authorization

```typescript
interface AuthConfig {
  // JWT Configuration
  jwt: {
    algorithm: 'RS256';
    expiresIn: '1h';
    refreshExpiresIn: '30d';
  };
  
  // Multi-factor authentication
  mfa: {
    enabled: boolean;
    methods: ['totp', 'sms'];
  };
  
  // Session management
  session: {
    storage: 'secure_http_only_cookie';
    sameSite: 'strict';
    secure: true;
  };
  
  // Rate limiting
  rateLimiting: {
    signin: '5 requests per 15 minutes';
    api: '100 requests per minute';
    ai: '20 requests per minute';
  };
}
```

### 5.2 Data Encryption

```yaml
At Rest:
  database: AES-256 encryption
  files: S3 server-side encryption
  backups: Encrypted snapshots

In Transit:
  api: TLS 1.3+
  websocket: WSS (TLS)
  external_apis: HTTPS only

Client-side:
  sensitive_data: CryptoJS AES encryption
  storage: Encrypted IndexedDB
  credentials: Keychain (iOS) / Keystore (Android)
```

### 5.3 Compliance

```yaml
POPIA (Protection of Personal Information Act):
  - Data minimization
  - Purpose limitation
  - Consent management
  - Data subject rights
  - Cross-border transfers

SACAA Requirements:
  - Data accuracy standards
  - Audit trails
  - Change management
  - Incident reporting
```

## 6. Performance Requirements

### 6.1 Response Times
```yaml
API Endpoints:
  - Authentication: < 200ms
  - Flight plan calculation: < 500ms
  - Weather fetch: < 300ms
  - AI queries: < 2s
  - Chart loading: < 1s

Client Performance:
  - Initial load: < 3s (3G network)
  - Time to interactive: < 5s
  - Frame rate: 60fps (map panning)
  - Offline mode switch: < 100ms
```

### 6.2 Scalability
```yaml
Concurrent Users:
  - Phase 1: 1,000 concurrent
  - Phase 2: 10,000 concurrent
  - Phase 3: 50,000 concurrent

Database:
  - Read replicas for scaling
  - Connection pooling
  - Query optimization < 100ms
  - Automatic backups

Storage:
  - CDN for static assets
  - Regional edge caching
  - Bandwidth: 10TB/month initial
```

### 6.3 Reliability
```yaml
Uptime: 99.9% (excluding planned maintenance)
RTO (Recovery Time Objective): < 1 hour
RPO (Recovery Point Objective): < 15 minutes
Redundancy: Multi-region deployment
Failover: Automatic with < 30s downtime
```

## 7. Mobile-Specific Requirements

### 7.1 iOS Requirements
```yaml
Minimum Version: iOS 14.0
Devices: iPhone 6s+, iPad Air 2+
Capabilities:
  - GPS/Location Services
  - Background location updates
  - Push notifications
  - Bluetooth LE
  - Background fetch
Frameworks:
  - Core Location
  - Core Bluetooth
  - MapKit fallback
  - HealthKit (pilot fatigue)
```

### 7.2 Android Requirements
```yaml
Minimum Version: Android 8.0 (API 26)
Target Version: Android 14 (API 34)
Permissions:
  - ACCESS_FINE_LOCATION
  - ACCESS_BACKGROUND_LOCATION
  - BLUETOOTH_CONNECT
  - FOREGROUND_SERVICE
  - INTERNET
  - WRITE_EXTERNAL_STORAGE
Features:
  - Google Play Services
  - Firebase Cloud Messaging
  - Work profiles support
```

### 7.3 PWA Requirements
```yaml
Service Worker:
  - Offline functionality
  - Background sync
  - Push notifications
  - Cache strategies

Web Capabilities:
  - Geolocation API
  - IndexedDB (500MB+)
  - Web Bluetooth
  - WebGL for maps
  - File System Access API

Manifest:
  - Installable
  - Fullscreen capable
  - App shortcuts
  - Share target
```

## 8. AI Integration Specifications

### 8.1 Gemini API Integration
```typescript
interface GeminiConfig {
  model: 'gemini-1.5-pro';
  apiKey: process.env.GEMINI_API_KEY;
  
  settings: {
    temperature: 0.7;
    maxTokens: 2048;
    topP: 0.9;
    topK: 40;
  };
  
  systemPrompt: `You are an expert flight planning assistant for 
    South African aviation. You have deep knowledge of SACAA 
    regulations, African weather patterns, and VFR/IFR procedures.`;
  
  contexts: {
    routePlanning: 'Optimize for safety, weather, and fuel efficiency';
    weatherAnalysis: 'Provide pilot-friendly weather interpretations';
    riskAssessment: 'Evaluate all factors affecting flight safety';
  };
}
```

### 8.2 AI Features Implementation
```typescript
interface AIFeatures {
  // Natural Language Processing
  nlp: {
    intents: [
      'route_planning',
      'weather_query',
      'alternate_selection',
      'fuel_calculation',
      'risk_assessment'
    ];
    
    entityExtraction: [
      'airports',
      'waypoints',
      'altitudes',
      'times',
      'weather_conditions'
    ];
  };
  
  // Predictive Models
  predictions: {
    weatherTrends: 'time_series_forecast';
    fuelConsumption: 'regression_model';
    delayProbability: 'classification_model';
  };
  
  // Context Management
  contextWindow: {
    maxMessages: 10;
    includeFlightPlan: true;
    includeWeather: true;
    includeAircraft: true;
  };
}
```

## 9. Hardware Integration

### 9.1 External Device Support
```yaml
GPS Receivers:
  - Protocol: NMEA 0183
  - Connection: Bluetooth LE / WiFi
  - Update rate: 1-10Hz
  - Supported: Bad Elf, Dual, Garmin GLO

ADS-B Receivers:
  - SkyEcho 2: GDL90 protocol
  - PilotAware: P3I protocol
  - Stratux: GDL90 protocol
  - Sentry: WiFi + ForeFlight protocol

Autopilot:
  - Protocol: NMEA 0183
  - Connection: Bluetooth / RS232
  - Data: Course, waypoints, altitude

Engine Monitors:
  - Protocol: Various (EIS, JPI, etc.)
  - Data: CHT, EGT, fuel flow, RPM
  - Display: Real-time gauges
```

### 9.2 Connection Management
```typescript
interface DeviceConnection {
  // Discovery
  discovery: {
    bluetooth: 'LE scanning';
    wifi: 'mDNS/Bonjour';
    timeout: 30; // seconds
  };
  
  // Connection
  connection: {
    autoReconnect: true;
    maxRetries: 3;
    keepAlive: true;
    batteryMonitoring: true;
  };
  
  // Data handling
  dataStream: {
    parser: 'NMEA' | 'GDL90' | 'Custom';
    validation: true;
    errorCorrection: true;
    buffering: '10 seconds';
  };
}
```

## 10. Testing Specifications

### 10.1 Test Coverage Requirements
```yaml
Unit Tests: > 80% coverage
Integration Tests: All API endpoints
E2E Tests: Critical user journeys
Performance Tests: Load testing for 10k users
Security Tests: OWASP Top 10 compliance
```

### 10.2 Test Scenarios
```typescript
interface TestScenarios {
  flightPlanning: [
    'Create VFR flight plan',
    'Create IFR flight plan with alternates',
    'Calculate fuel with reserves',
    'File flight plan',
    'Modify active flight plan'
  ];
  
  offline: [
    'Switch to offline mode',
    'Create flight plan offline',
    'Sync when connection restored',
    'Handle sync conflicts'
  ];
  
  ai: [
    'Natural language route query',
    'Weather-based optimization',
    'Risk assessment calculation',
    'Alternate suggestion'
  ];
  
  performance: [
    'Load 1000 waypoints',
    'Pan map with 50 aircraft',
    'Calculate 500nm route',
    'Download 100MB charts'
  ];
}
```

## 11. Deployment Specifications

### 11.1 CI/CD Pipeline
```yaml
Source Control: GitHub
CI/CD: GitHub Actions

Pipeline:
  - Lint and format check
  - Unit tests
  - Integration tests
  - Build for all platforms
  - Security scanning
  - Deploy to staging
  - E2E tests on staging
  - Deploy to production
  - Smoke tests
  - Monitor deployment

Environments:
  - Development: Auto-deploy on commit
  - Staging: Auto-deploy on PR merge
  - Production: Manual approval required
```

### 11.2 Release Strategy
```yaml
Web (PWA):
  - Blue-green deployment
  - Instant rollback capability
  - A/B testing framework

Mobile:
  - Phased rollout (10%, 50%, 100%)
  - Crash monitoring before full release
  - Force update capability for critical fixes

Version Control:
  - Semantic versioning (MAJOR.MINOR.PATCH)
  - Breaking changes in MAJOR only
  - Deprecation warnings for 2 versions
```

## 12. Monitoring and Analytics

### 12.1 Application Monitoring
```yaml
Error Tracking: Sentry
  - Real-time alerts
  - Stack traces
  - User context
  - Release tracking

Performance: Web Vitals
  - Core Web Vitals (LCP, FID, CLS)
  - Custom metrics (map load time, API latency)
  - Real User Monitoring (RUM)

Logging: Structured logs
  - Application logs (Supabase)
  - Access logs (CDN)
  - Error logs (Sentry)
  - Audit logs (Security)
```

### 12.2 Analytics
```yaml
User Analytics: PostHog
  - Privacy-first approach
  - No PII collection
  - Event tracking
  - Funnel analysis
  - Retention metrics

Feature Usage:
  - Flight plans created
  - AI queries
  - Weather checks
  - Route distance distribution
  - Popular airports

Business Metrics:
  - Conversion rate (trial to paid)
  - Churn rate
  - Feature adoption
  - DAU/MAU ratio
  - Revenue per user
```

## 13. Maintenance Requirements

### 13.1 Data Updates
```yaml
Aviation Data:
  - AIRAC cycle: Every 28 days
  - NOTAMs: Real-time
  - Weather: Every 5 minutes
  - Charts: Monthly or as published

System Updates:
  - Security patches: Within 48 hours
  - Dependencies: Monthly review
  - OS updates: Quarterly
  - API versions: 6-month deprecation
```

### 13.2 Backup and Recovery
```yaml
Backup Schedule:
  - Database: Daily full, hourly incremental
  - User uploads: Real-time to S3
  - Configuration: Version controlled

Recovery Procedures:
  - Automated restore testing: Weekly
  - Point-in-time recovery: 30 days
  - Disaster recovery site: Different region
  - Recovery drills: Quarterly
```

## 14. Internationalization

### 14.1 Language Support
```yaml
Phase 1: English (ZA, UK, US)
Phase 2: Afrikaans, Portuguese
Phase 3: French, Swahili

Implementation:
  - react-i18next for web/mobile
  - Separate translation files
  - RTL support ready
  - Number/date formatting
  - Currency conversion
```

### 14.2 Regional Adaptations
```yaml
Units:
  - Metric/Imperial toggle
  - Aviation-specific (ft, nm, kts)
  - Fuel (liters, gallons, pounds)
  - Weight (kg, lbs)

Regulations:
  - SACAA (South Africa)
  - EASA (future)
  - FAA (future)
  - Regional variations

Time Zones:
  - Automatic detection
  - UTC option
  - Local/Zulu toggle
```

## 16. UI Component Library (Shadcn UI)

### 16.1 Component Architecture
```typescript
// Shadcn UI Setup
interface UIConfig {
  theme: {
    cssVariables: true;
    darkMode: 'class'; // Toggle support
    colors: {
      primary: 'blue'; // Aviation blue
      secondary: 'slate';
      accent: 'sky';
      destructive: 'red';
      muted: 'gray';
    };
  };
  
  components: {
    // Core components from Shadcn
    Button: { variants: ['default', 'secondary', 'outline', 'ghost'] };
    Card: { clean: true, bordered: true };
    Dialog: { modal: true, dismissible: true };
    Input: { sizes: ['sm', 'default', 'lg'] };
    Select: { searchable: true };
    Tabs: { animated: true };
    Toast: { position: 'bottom-right' };
    // Aviation-specific custom components
    MapContainer: { based: 'Card' };
    FlightCard: { based: 'Card' };
    WeatherPanel: { based: 'Card' };
  };
  
  icons: {
    library: 'lucide-react';
    size: 24;
    strokeWidth: 2;
  };
}
```

### 16.2 Design System
```yaml
Typography:
  - Font: Inter (primary), system-ui (fallback)
  - Headings: font-semibold tracking-tight
  - Body: font-normal leading-relaxed
  - No emoji usage in UI

Spacing:
  - Base unit: 4px
  - Component padding: 16px (4 units)
  - Section spacing: 32px (8 units)

Colors:
  - Background: white/gray-50 (light), gray-900 (dark)
  - Primary: blue-600 (actions)
  - Success: green-600 (VFR conditions)
  - Warning: yellow-600 (MVFR conditions)
  - Danger: red-600 (IFR conditions)

Shadows:
  - sm: 0 1px 2px rgba(0, 0, 0, 0.05)
  - default: 0 4px 6px rgba(0, 0, 0, 0.1)
  - lg: 0 10px 15px rgba(0, 0, 0, 0.1)
```

### 16.3 Responsive Design
```css
/* Breakpoints aligned with Tailwind/Shadcn */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```