import React, { useCallback } from 'react';
import MassAndBalance from './MassAndBalance';
import FuelPlanner from './FuelPlanner';

const FlightPlanLegForm = ({ leg, index, updateLeg, removeLeg, aircraft }) => {

  const handleInputChange = useCallback((e) => {
    updateLeg(index, { ...leg, [e.target.name]: e.target.value });
  }, [index, leg, updateLeg]);

  const handleMassAndBalanceUpdate = useCallback((data) => {
    updateLeg(index, { ...leg, massAndBalance: data });
  }, [index, leg, updateLeg]);

  const handleFuelUpdate = useCallback((data) => {
    updateLeg(index, { ...leg, fuelPlan: data });
  }, [index, leg, updateLeg]);

  return (
    <div className="bg-background/50 p-4 rounded-lg border border-border mb-4 relative">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-primary">Leg {index + 1}</h4>
        {index > 0 && (
          <button 
            type="button" 
            onClick={() => removeLeg(index)} 
            className="text-destructive hover:underline"
          >
            Remove Leg
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Departure (ICAO)</label>
          <input 
            type="text" 
            placeholder="e.g., KLAX"
            value={leg.departure_icao}
            onChange={(e) => updateLeg(index, { ...leg, departure_icao: e.target.value.toUpperCase() })}
            className="w-full bg-input p-2 rounded-md" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Arrival (ICAO)</label>
          <input 
            type="text" 
            placeholder="e.g., KSFO" 
            value={leg.arrival_icao}
            onChange={(e) => updateLeg(index, { ...leg, arrival_icao: e.target.value.toUpperCase() })}
            className="w-full bg-input p-2 rounded-md" 
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Route</label>
          <textarea 
            placeholder="e.g., DCT VUL V212 ALD IEE HEC DCT" 
            value={leg.route}
            onChange={(e) => updateLeg(index, { ...leg, route: e.target.value.toUpperCase() })}
            className="w-full bg-input p-2 rounded-md" 
            rows="2"
          ></textarea>
        </div>

        <MassAndBalance aircraft={aircraft} onUpdate={handleMassAndBalanceUpdate} />
        <FuelPlanner aircraft={aircraft} onUpdate={handleFuelUpdate} />
      </div>
    </div>
  );
};

export default FlightPlanLegForm;
