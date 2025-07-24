import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FlightPlanLegForm from './FlightPlanLegForm';

const FlightPlanForm = ({ user, onSave, onCancel, existingPlan = {} }) => {
  const [userAircraft, setUserAircraft] = useState([]);
  const [loadingAircraft, setLoadingAircraft] = useState(true);

  // Form state
  const [aircraftId, setAircraftId] = useState(existingPlan.aircraft_id || '');
  const [name, setName] = useState(existingPlan.name || '');
  const [legs, setLegs] = useState(existingPlan.legs || [{
    departure_icao: '',
    arrival_icao: '',
    route: '',
    massAndBalance: { totalWeight: 0, centerOfGravity: 0 },
    fuelPlan: { trip_fuel: 0, reserve_fuel: 0, total_fuel_required: 0, is_sufficient: true }
  }]);
  const [isFormValid, setIsFormValid] = useState(false);

  const updateLeg = useCallback((index, updatedLeg) => {
    setLegs(currentLegs => {
      const newLegs = [...currentLegs];
      newLegs[index] = updatedLeg;
      return newLegs;
    });
  }, []);

  useEffect(() => {
    const validateForm = () => {
      const isNameValid = name.trim() !== '';
      const areLegsValid = legs.every(leg => 
        leg.departure_icao?.trim() !== '' && leg.arrival_icao?.trim() !== ''
      );
      setIsFormValid(isNameValid && areLegsValid);
    };
    validateForm();
  }, [name, legs]);

  useEffect(() => {
    if (existingPlan && existingPlan.id) {
      // We are editing an existing plan
      setName(existingPlan.name || '');
      setAircraftId(existingPlan.aircraft_id || '');

      // Reconstruct the legs from the DB schema
      const firstLeg = {
        departure_icao: existingPlan.departure_icao || '',
        arrival_icao: existingPlan.destination_icao || '',
        route: existingPlan.route_string || '',
        massAndBalance: { totalWeight: 0, centerOfGravity: 0 }, // TODO: Populate from DB
        fuelPlan: { trip_fuel: 0, reserve_fuel: 0, total_fuel_required: 0, is_sufficient: true } // TODO: Populate from DB
      };
      const otherLegs = existingPlan.flight_plan_legs.map(leg => ({
        ...leg,
        massAndBalance: { totalWeight: 0, centerOfGravity: 0 }, // TODO: Populate from DB
        fuelPlan: { trip_fuel: 0, reserve_fuel: 0, total_fuel_required: 0, is_sufficient: true } // TODO: Populate from DB
      }));

      setLegs([firstLeg, ...otherLegs]);
    } else {
      // We are creating a new plan, reset the state
      setName('');
      setLegs([{
        departure_icao: '',
        arrival_icao: '',
        route: '',
        massAndBalance: { totalWeight: 0, centerOfGravity: 0 },
        fuelPlan: { trip_fuel: 0, reserve_fuel: 0, total_fuel_required: 0, is_sufficient: true }
      }]);
      // Keep existing aircraftId or default to first one later
    }
  }, [existingPlan]);

  useEffect(() => {
    const fetchUserAircraft = async () => {
      try {
        setLoadingAircraft(true);
        const { data, error } = await supabase
          .from('aircraft')
          .select('*') // Select all fields to pass to sub-components
          .eq('user_id', user.id);
        if (error) throw error;
        setUserAircraft(data);
        if (data.length > 0 && !aircraftId) {
          setAircraftId(data[0].id); // Default to first aircraft
        }
      } catch (error) {
        console.error('Error fetching user aircraft:', error.message);
      } finally {
        setLoadingAircraft(false);
      }
    };
    fetchUserAircraft();
  }, [user.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      id: existingPlan?.id, // Pass the ID if it exists
      name,
      aircraft_id: aircraftId,
      legs 
    });
  };

  const addLeg = useCallback(() => {
    setLegs(currentLegs => [...currentLegs, {
      departure_icao: '',
      arrival_icao: '',
      route: '',
      massAndBalance: { totalWeight: 0, centerOfGravity: 0 },
      fuelPlan: { trip_fuel: 0, reserve_fuel: 0, total_fuel_required: 0, is_sufficient: true }
    }]);
  }, []);

  const removeLeg = useCallback((index) => {
    setLegs(prevLegs => prevLegs.filter((_, i) => i !== index));
  }, []);

  const selectedAircraft = userAircraft.find(ac => ac.id === aircraftId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-card p-6 rounded-xl shadow-lg-dark w-full max-w-4xl h-[95vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-center">{existingPlan?.id ? 'Edit' : 'Create'} Flight Plan</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 -mr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Plan Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" placeholder="e.g., Coastal Adventure" required />
            </div>
            <div>
              <label htmlFor="aircraft" className="block text-sm font-medium text-muted-foreground mb-1">Aircraft</label>
              <select id="aircraft" value={aircraftId} onChange={(e) => setAircraftId(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:ring-primary focus:border-primary" disabled={loadingAircraft} required>
                {loadingAircraft ? <option>Loading...</option> : userAircraft.map(ac => (
                  <option key={ac.id} value={ac.id}>{ac.registration} ({ac.aircraft_type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {selectedAircraft ? (
              legs.map((leg, index) => (
                <FlightPlanLegForm 
                  key={index}
                  index={index}
                  leg={leg}
                  updateLeg={updateLeg}
                  removeLeg={removeLeg}
                  aircraft={selectedAircraft}
                />
              ))
            ) : (
              <div className="text-center text-muted-foreground p-8">Loading Aircraft Details...</div>
            )}
          </div>

          <button type="button" onClick={addLeg} className="mt-6 text-primary font-semibold hover:underline">+ Add Another Leg</button>

          <div className="flex justify-end gap-4 mt-8">
              <button type="button" onClick={onCancel} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-md hover:bg-secondary/80 transition-colors font-semibold">
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!isFormValid}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors flex-grow disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                Save Flight Plan
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlightPlanForm;
