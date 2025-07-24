import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AircraftForm from './AircraftForm';

const AircraftManager = ({ user }) => {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);

  const fetchAircraft = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAircraft(data);
    } catch (error) {
      console.error('Error fetching aircraft:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAircraft();
  }, []);

    const handleDelete = async (planeId) => {
    try {
      const { error } = await supabase
        .from('aircraft')
        .delete()
        .eq('id', planeId);

      if (error) throw error;

      setAircraft(aircraft.filter((p) => p.id !== planeId));
    } catch (error) {
      console.error('Error deleting aircraft:', error.message);
    }
  };

    const handleEditClick = (plane) => {
    setEditingAircraft(plane);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setEditingAircraft(null);
    setIsModalOpen(false);
  };

  const handleSave = async (aircraftData) => {
    try {
      const { data, error } = editingAircraft
        ? await supabase
            .from('aircraft')
            .update(aircraftData)
            .eq('id', editingAircraft.id)
            .select()
        : await supabase
            .from('aircraft')
            .insert([{ ...aircraftData, user_id: user.id }])
            .select();

      if (error) throw error;

      if (editingAircraft) {
        // Update the existing aircraft in the local state
        setAircraft(aircraft.map(p => (p.id === editingAircraft.id ? data[0] : p)));
      } else {
        // Add the new aircraft to the local state
        setAircraft([data[0], ...aircraft]);
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving aircraft:', error.message);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Aircraft</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Add Aircraft
        </button>
      </div>

      {isModalOpen && (
        <AircraftForm 
          onSave={handleSave} 
          onCancel={handleCancel}
          aircraft={editingAircraft} 
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading aircraft...</p>
      ) : aircraft.length === 0 ? (
        <p className="text-muted-foreground">No aircraft profiles yet. Add one to get started.</p>
      ) : (
        <ul>
          {aircraft.map((plane) => (
            <li key={plane.id} className="flex justify-between items-center p-2 border-b border-border">
              <span>{plane.registration} - {plane.aircraft_type}</span>
              <div>
                <button onClick={() => handleEditClick(plane)} className="text-sm text-primary hover:underline mr-4">Edit</button>
                <button onClick={() => handleDelete(plane.id)} className="text-sm text-destructive hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AircraftManager;
