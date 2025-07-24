import React, { useState, useEffect, useCallback } from 'react';

const FuelPlanner = ({ aircraft, onUpdate }) => {
  const [eteHours, setEteHours] = useState(1.5);

  const calculateAndUpdate = useCallback(() => {
    const fuelBurn = aircraft?.fuel_burn || 0;
    const fuelCapacity = aircraft?.fuel_capacity || 0;

    const tripFuel = eteHours * fuelBurn;
    const reserveFuel = 0.75 * fuelBurn; // 45 minutes reserve
    const totalFuelRequired = tripFuel + reserveFuel;
    const isSufficient = totalFuelRequired <= fuelCapacity;

    onUpdate({
      trip_fuel: tripFuel.toFixed(1),
      reserve_fuel: reserveFuel.toFixed(1),
      total_fuel_required: totalFuelRequired.toFixed(1),
      is_sufficient: isSufficient,
    });
  }, [aircraft, eteHours, onUpdate]);

  // This useEffect will run only when the aircraft changes to trigger a recalculation.
  useEffect(() => {
    calculateAndUpdate();
  }, [aircraft]); // Note: We've removed calculateAndUpdate from dependencies to break the loop.

  // This useEffect runs only once on mount to send the initial state to the parent.
  useEffect(() => {
    calculateAndUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once.

  const handleBlur = () => {
    calculateAndUpdate();
  };

  // Local calculation for immediate UI feedback
  const fuelBurn = aircraft?.fuel_burn || 0;
  const tripFuel = eteHours * fuelBurn;
  const totalFuelRequired = tripFuel + (0.75 * fuelBurn);

  return (
    <div className="md:col-span-2 bg-secondary/30 p-4 rounded-lg mt-4">
      <h3 className="text-lg font-semibold mb-4">Fuel Planning</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground">Est. Time En-route (hours)</label>
          <input 
            type="number" 
            step="0.1"
            value={eteHours} 
            onChange={e => setEteHours(Number(e.target.value))} 
            onBlur={handleBlur}
            className="w-full bg-input p-2 rounded-md" 
          />
        </div>
        <div className="flex flex-col justify-center bg-background/50 p-2 rounded-md">
          <p className="text-sm">Trip Fuel: <span className="font-mono">{tripFuel.toFixed(1)} gal</span></p>
          <p className="text-sm">Total Required (w/ reserves): <span className="font-mono">{totalFuelRequired.toFixed(1)} gal</span></p>
          <p className={`text-sm font-bold ${totalFuelRequired > (aircraft?.fuel_capacity || 0) ? 'text-destructive' : 'text-green-400'}`}>
            {totalFuelRequired > (aircraft?.fuel_capacity || 0) 
              ? `Exceeds capacity of ${aircraft?.fuel_capacity || 0} gal!`
              : 'Fuel sufficient'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuelPlanner;
