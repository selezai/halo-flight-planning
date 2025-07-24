-- Forcefully drop all tables in order of dependency to ensure a clean slate.
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS flight_logs CASCADE;
DROP TABLE IF EXISTS flight_plans CASCADE;
DROP TABLE IF EXISTS aircraft CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_aircraft_user_id ON aircraft(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_plans_user_id ON flight_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_plans_departure ON flight_plans(departure_icao);
CREATE INDEX IF NOT EXISTS idx_flight_plans_destination ON flight_plans(destination_icao);
CREATE INDEX IF NOT EXISTS idx_flight_logs_user_id ON flight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_synced ON sync_queue(user_id, synced);


-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage their own aircraft" ON aircraft;
CREATE POLICY "Users can manage their own aircraft" ON aircraft
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flight plans" ON flight_plans;
CREATE POLICY "Users can manage their own flight plans" ON flight_plans
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own flight logs" ON flight_logs;
CREATE POLICY "Users can manage their own flight logs" ON flight_logs
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sync queue" ON sync_queue;
CREATE POLICY "Users can manage their own sync queue" ON sync_queue
    FOR ALL USING (auth.uid() = user_id);
