-- This migration transitions from a single-leg to a multi-leg flight plan structure.

-- 1. Add a name to the flight_plans table for easy identification
ALTER TABLE public.flight_plans
  ADD COLUMN name text;

COMMENT ON COLUMN public.flight_plans.name IS 'A user-friendly name for the flight plan (e.g., ''Coastal Trip'')';

-- 2. Create the new flight_plan_legs table to store individual legs
CREATE TABLE public.flight_plan_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_plan_id uuid NOT NULL REFERENCES public.flight_plans(id) ON DELETE CASCADE,
  leg_number smallint NOT NULL,
  departure_icao text NOT NULL,
  arrival_icao text NOT NULL,
  alternate_icao text,
  route text,
  -- Performance and fuel data will now be per-leg
  total_weight numeric(7, 2),
  center_of_gravity numeric(5, 2),
  trip_fuel numeric(5, 1),
  reserve_fuel numeric(5, 1),
  total_fuel_required numeric(5, 1),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT flight_plan_legs_leg_number_check CHECK (leg_number > 0)
);

-- 3. Enable RLS and create policies for the new table
ALTER TABLE public.flight_plan_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flight plan legs" ON public.flight_plan_legs
  FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.flight_plans WHERE id = flight_plan_id));


COMMENT ON TABLE public.flight_plan_legs IS 'Stores individual legs of a multi-leg flight plan.';
