import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import FlightPlanForm from './FlightPlanForm';
import ICAOFlightPlanForm from './ICAOFlightPlanForm';

const FlightPlanManager = ({ user }) => {
  const [flightPlans, setFlightPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [filingPlan, setFilingPlan] = useState(null);

  const fetchFlightPlans = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flight_plans')
        .select(`
          *,
          aircraft:aircraft_id(registration, aircraft_type),
          flight_plan_legs(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlightPlans(data);
    } catch (error) {
      console.error('Error fetching flight plans:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFlightPlans();
  }, [fetchFlightPlans]);

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this flight plan?')) {
      return;
    }

    // RLS should ensure users can only delete their own plans.
    // Cascading delete should be set up in Supabase to also delete flight_plan_legs.
    const { error } = await supabase.from('flight_plans').delete().eq('id', planId);

    if (error) {
      console.error('Error deleting flight plan:', error.message);
    } else {
      // Refresh the list after deletion
      fetchFlightPlans();
    }
  };

  const handleSaveFlightPlan = async (planData) => {
    if (planData.id) {
      await handleUpdateFlightPlan(planData);
    } else {
      await handleCreateFlightPlan(planData);
    }
    // After saving, refresh the list and close the modal
    fetchFlightPlans();
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleFile = (plan) => {
    setFilingPlan(plan);
    setIsFilingModalOpen(true);
  };

  const handleConfirmFiling = async (planId) => {
    // This function will call the backend to file the plan.
    // For now, it just updates the status locally as a placeholder.
    console.log(`Filing flight plan ${planId}`);
    
    const { error } = await supabase
      .from('flight_plans')
      .update({ status: 'filed', filed_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) {
      console.error('Error updating flight plan status:', error);
    } else {
      fetchFlightPlans(); // Refresh the list to show the new status
    }

    setIsFilingModalOpen(false);
    setFilingPlan(null);
  };

  const handleCreateFlightPlan = async (planData) => {
    const [firstLeg, ...remainingLegs] = planData.legs;

    if (!firstLeg) {
      console.error("Cannot save a flight plan with no legs.");
      return; // TODO: Add user-facing error
    }

    // Step 1: Insert the main flight plan record
    const { data: plan, error: planError } = await supabase
      .from('flight_plans')
      .insert({
        user_id: user.id,
        aircraft_id: planData.aircraft_id,
        name: planData.name,
        departure_icao: firstLeg.departure_icao,
        destination_icao: firstLeg.arrival_icao,
        route_string: firstLeg.route,
        waypoints: [], // Default value for NOT NULL column
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating flight plan:', planError);
      return; // Stop execution if the main plan fails to save
    }

    // Step 2: Insert the legs into 'flight_plan_legs'
    const allLegsToSave = planData.legs.map((leg, index) => ({
      flight_plan_id: plan.id,
      leg_number: index + 1,
      departure_icao: leg.departure_icao,
      arrival_icao: leg.arrival_icao,
      route: leg.route,
      // TODO: Add mass/balance and fuel data here
    }));

    if (allLegsToSave.length > 0) {
      const { error: legsError } = await supabase.from('flight_plan_legs').insert(allLegsToSave);
      if (legsError) {
        console.error('Error saving flight plan legs:', legsError);
        // TODO: Handle potential rollback
      }
    }
  };

  const handleUpdateFlightPlan = async (planData) => {
    const [firstLeg] = planData.legs;

    // Step 1: Update the main flight plan details
    const { error: planUpdateError } = await supabase
      .from('flight_plans')
      .update({
        name: planData.name,
        aircraft_id: planData.aircraft_id,
        departure_icao: firstLeg.departure_icao,
        destination_icao: firstLeg.arrival_icao,
        route_string: firstLeg.route,
      })
      .eq('id', planData.id);

    if (planUpdateError) {
      console.error('Error updating flight plan:', planUpdateError);
      return;
    }

    // Step 2: Delete all existing legs for this plan
    const { error: deleteError } = await supabase
      .from('flight_plan_legs')
      .delete()
      .eq('flight_plan_id', planData.id);

    if (deleteError) {
      console.error('Error deleting old legs:', deleteError);
      return;
    }

    // Step 3: Insert all the new/updated legs
    const allLegsToSave = planData.legs.map((leg, index) => ({
      flight_plan_id: planData.id,
      leg_number: index + 1,
      departure_icao: leg.departure_icao,
      arrival_icao: leg.arrival_icao,
      route: leg.route,
      // TODO: Add mass/balance and fuel data here
    }));

    if (allLegsToSave.length > 0) {
      const { error: legsInsertError } = await supabase
        .from('flight_plan_legs')
        .insert(allLegsToSave);

      if (legsInsertError) {
        console.error('Error inserting updated legs:', legsInsertError);
      }
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-md mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Flight Plans</h2>
        <button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          Create Flight Plan
        </button>
      </div>
      {isModalOpen && (
        <FlightPlanForm 
          user={user}
          onSave={handleSaveFlightPlan}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPlan(null);
          }}
          existingPlan={editingPlan}
        />
      )}

      {isFilingModalOpen && (
        <ICAOFlightPlanForm 
          flightPlan={filingPlan}
          onFile={handleConfirmFiling}
          onCancel={() => {
            setIsFilingModalOpen(false);
            setFilingPlan(null);
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading flight plans...</p>
      ) : flightPlans.length === 0 ? (
        <p className="text-muted-foreground">No flight plans yet. Create one to get started!</p>
      ) : (
        <ul className="space-y-4">
          {flightPlans.map((plan) => (
            <li key={plan.id} className="bg-background/50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{plan.name || 'Untitled Flight Plan'}</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.flight_plan_legs.length > 0 
                    ? `${plan.flight_plan_legs[0].departure_icao} → ${plan.flight_plan_legs[plan.flight_plan_legs.length - 1].arrival_icao}`
                    : 'No legs defined'
                  }
                  <span className="mx-2 text-muted-foreground/50">|</span>
                  <span>{plan.flight_plan_legs.length} leg(s)</span>
                  <span className="mx-2 text-muted-foreground/50">|</span>
                  <span>{plan.aircraft.registration}</span>
                </p>
              </div>
              <div>
                <button onClick={() => handleEdit(plan)} className="text-sm text-primary hover:underline mr-4">View/Edit</button>
                <button onClick={() => handleDelete(plan.id)} className="text-sm text-destructive hover:underline">Delete</button>
                {plan.status === 'draft' && (
                  <button onClick={() => handleFile(plan)} className="text-sm text-green-500 hover:underline ml-4">File</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FlightPlanManager;
