import React, { useState, useEffect, useCallback } from 'react';

const MassAndBalance = ({ aircraft, onUpdate }) => {
  const [pilotWeight, setPilotWeight] = useState(180);
  const [passengerWeight, setPassengerWeight] = useState(0);
  const [baggageWeight, setBaggageWeight] = useState(0);
  const [fuelGallons, setFuelGallons] = useState(40);

  // Using useCallback to memoize the calculation and update logic.
  // This function will now only be recreated if `onUpdate` prop changes.
  const calculateAndUpdate = useCallback(() => {
    const basicEmptyWeight = aircraft?.empty_weight || 0;
    const basicEmptyArm = aircraft?.empty_arm || 0;
    
    const fuelWeight = fuelGallons * 6; // ~6 lbs/gallon for Avgas
    const pilotMoment = pilotWeight * 37;
    const passengerMoment = passengerWeight * 73;
    const baggageMoment = baggageWeight * 95;
    const fuelMoment = fuelWeight * 48;
    const emptyMoment = basicEmptyWeight * basicEmptyArm;

    const totalWeight = basicEmptyWeight + pilotWeight + passengerWeight + baggageWeight + fuelWeight;
    const totalMoment = emptyMoment + pilotMoment + passengerMoment + baggageMoment + fuelMoment;
    const centerOfGravity = totalWeight > 0 ? totalMoment / totalWeight : 0;

    onUpdate({ 
      totalWeight: totalWeight.toFixed(2),
      centerOfGravity: centerOfGravity.toFixed(2)
    });
  }, [aircraft, pilotWeight, passengerWeight, baggageWeight, fuelGallons, onUpdate]);


  // This useEffect will run only when the aircraft changes to trigger a recalculation.
  useEffect(() => {
    calculateAndUpdate();
  }, [aircraft]); // Note: We've removed calculateAndUpdate from dependencies to break the loop.

  // This useEffect runs only once on mount to send the initial state to the parent.
  useEffect(() => {
    calculateAndUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once.

  // handleBlur will be called when the user clicks away from an input.
  // This is a more efficient way to trigger updates, avoiding re-renders on every keystroke.
  const handleBlur = () => {
    calculateAndUpdate();
  };

  return (
    <div className="md:col-span-2 bg-secondary/30 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Mass & Balance</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground">Pilot (lbs)</label>
          <input type="number" value={pilotWeight} onChange={e => setPilotWeight(Number(e.target.value))} onBlur={handleBlur} className="w-full bg-input p-2 rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Passengers (lbs)</label>
          <input type="number" value={passengerWeight} onChange={e => setPassengerWeight(Number(e.target.value))} onBlur={handleBlur} className="w-full bg-input p-2 rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Baggage (lbs)</label>
          <input type="number" value={baggageWeight} onChange={e => setBaggageWeight(Number(e.target.value))} onBlur={handleBlur} className="w-full bg-input p-2 rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Fuel (gallons)</label>
          <input type="number" value={fuelGallons} onChange={e => setFuelGallons(Number(e.target.value))} onBlur={handleBlur} className="w-full bg-input p-2 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default MassAndBalance;
