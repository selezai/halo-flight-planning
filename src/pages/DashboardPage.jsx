import React from 'react';
import AircraftManager from '../components/aircraft/AircraftManager';
import FlightPlanManager from '../components/flight-plans/FlightPlanManager';

const DashboardPage = ({ user }) => {
  return (
    <>
      <AircraftManager user={user} />
      <FlightPlanManager user={user} />
    </>
  );
};

export default DashboardPage;
