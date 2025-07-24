-- Add performance fields to the aircraft table

ALTER TABLE public.aircraft
  ADD COLUMN empty_weight numeric(7, 2) NOT NULL DEFAULT 0,
  ADD COLUMN empty_arm numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN fuel_capacity numeric(5, 1) NOT NULL DEFAULT 0,
  ADD COLUMN cruise_speed integer NOT NULL DEFAULT 0;

-- Add comments to the new columns
COMMENT ON COLUMN public.aircraft.empty_weight IS 'Basic Empty Weight in pounds (lbs)';
COMMENT ON COLUMN public.aircraft.empty_arm IS 'Basic Empty Arm in inches from datum';
COMMENT ON COLUMN public.aircraft.fuel_capacity IS 'Total usable fuel capacity in gallons (US)';
COMMENT ON COLUMN public.aircraft.cruise_speed IS 'Typical cruise speed in knots (KTAS)';