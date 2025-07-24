import React, { useState } from 'react';

const AircraftForm = ({ onSave, onCancel, aircraft = {} }) => {
  const [registration, setRegistration] = useState(aircraft.registration || '');
  const [type, setType] = useState(aircraft.aircraft_type || '');
  const [emptyWeight, setEmptyWeight] = useState(aircraft.empty_weight || '');
  const [emptyArm, setEmptyArm] = useState(aircraft.empty_arm || '');
  const [fuelCapacity, setFuelCapacity] = useState(aircraft.fuel_capacity || '');
  const [cruiseSpeed, setCruiseSpeed] = useState(aircraft.cruise_speed || '');
  const [fuelBurn, setFuelBurn] = useState(aircraft.fuel_burn || '');
  // Add other fields from the 'aircraft' table schema here

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      registration, 
      aircraft_type: type,
      empty_weight: emptyWeight,
      empty_arm: emptyArm,
      fuel_capacity: fuelCapacity,
      cruise_speed: cruiseSpeed,
      fuel_burn: fuelBurn
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-card p-8 rounded-lg shadow-lg-dark w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">{aircraft.id ? 'Edit' : 'Add'} Aircraft</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
            <div>
              <label htmlFor="registration" className="block text-sm font-medium text-muted-foreground mb-1">Registration</label>
              <input id="registration" type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">Aircraft Type</label>
              <input id="type" type="text" value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="emptyWeight" className="block text-sm font-medium text-muted-foreground mb-1">Empty Weight (lbs)</label>
              <input id="emptyWeight" type="number" step="0.1" value={emptyWeight} onChange={(e) => setEmptyWeight(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="emptyArm" className="block text-sm font-medium text-muted-foreground mb-1">Empty Arm (in)</label>
              <input id="emptyArm" type="number" step="0.01" value={emptyArm} onChange={(e) => setEmptyArm(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="fuelCapacity" className="block text-sm font-medium text-muted-foreground mb-1">Fuel Capacity (gal)</label>
              <input id="fuelCapacity" type="number" step="0.1" value={fuelCapacity} onChange={(e) => setFuelCapacity(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="cruiseSpeed" className="block text-sm font-medium text-muted-foreground mb-1">Cruise Speed (kts)</label>
              <input id="cruiseSpeed" type="number" value={cruiseSpeed} onChange={(e) => setCruiseSpeed(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="fuelBurn" className="block text-sm font-medium text-muted-foreground mb-1">Fuel Burn (gph)</label>
              <input id="fuelBurn" type="number" step="0.1" value={fuelBurn} onChange={(e) => setFuelBurn(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" required />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button 
              type="button" 
              onClick={onCancel} 
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              Save Aircraft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AircraftForm;
