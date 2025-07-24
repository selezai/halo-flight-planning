-- Add fuel burn field to the aircraft table

ALTER TABLE public.aircraft
  ADD COLUMN fuel_burn numeric(4, 1) NOT NULL DEFAULT 10.0;

COMMENT ON COLUMN public.aircraft.fuel_burn IS 'Average fuel consumption in gallons per hour (GPH)';
