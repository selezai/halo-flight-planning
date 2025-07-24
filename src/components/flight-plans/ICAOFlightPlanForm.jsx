import React, { useState, useEffect } from 'react';

const FormSection = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-border">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      {children}
    </div>
  </div>
);

const FormField = ({ label, name, value, onChange, placeholder, children, colSpan = 1 }) => (
  <div className={`form-group col-span-${colSpan}`}>
    <label htmlFor={name} className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
    {children || <input id={name} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} className="w-full p-2 bg-background rounded-md border border-border focus:ring-primary focus:border-primary" />}
  </div>
);

const ICAOFlightPlanForm = ({ flightPlan, onCancel, onFile }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flightPlan) {
      setFormData({
        aircraft_identification: flightPlan.aircraft?.registration || '',
        flight_rules: 'I',
        type_of_flight: 'S',
        number_of_aircraft: 1,
        aircraft_type: flightPlan.aircraft?.aircraft_type || '',
        wake_turbulence_cat: 'L',
        equipment_com: 'S', // Standard COM/NAV
        equipment_nav: 'G', // GPS
        surveillance_equipment: 'C', // Mode C
        departure_aerodrome: flightPlan.departure_icao,
        departure_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().substring(0, 16), // Default to 1 hour from now
        cruising_speed_kts: flightPlan.aircraft?.cruise_speed_kts || '120',
        flight_level: '100', // FL100
        route: flightPlan.route_string || flightPlan.flight_plan_legs.map(l => l.arrival_icao).join(' '),
        destination_aerodrome: flightPlan.destination_icao,
        total_eet: '0200', // 2 hours
        alternate_aerodrome_1: flightPlan.alternate_icao || '',
        alternate_aerodrome_2: '',
        other_info_pbn: 'PBN/A1B1C1D1',
        other_info_reg: `REG/${flightPlan.aircraft?.registration}`,
        endurance_h: '04', // 4 hours
        endurance_m: '30', // 30 minutes
        persons_on_board: '1',
        emergency_radio_uhf: true,
        emergency_radio_vhf: true,
        emergency_radio_elt: true,
        survival_equipment_polar: false,
        survival_equipment_desert: false,
        survival_equipment_maritime: true,
        survival_equipment_jungle: false,
        jackets_light: true,
        jackets_fluores: true,
        jackets_uhf: false,
        jackets_vhf: false,
        dinghies_number: 0,
        dinghies_capacity: 0,
        dinghies_cover: false,
        dinghies_color: 'ORANGE',
        aircraft_color_markings: 'White with blue stripes',
        remarks: '',
        pilot_in_command: 'Cpt. Halo User',
      });
    }
  }, [flightPlan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('Filing ICAO Flight Plan with data:', formData);
    // In a real app, this would call: await supabase.functions.invoke('file-flight-plan', ...)
    setTimeout(() => { // Simulate network delay
      onFile(flightPlan.id, formData);
      setLoading(false);
    }, 1500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-card p-6 rounded-xl shadow-lg-dark w-full max-w-6xl h-[95vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-center">File ICAO Flight Plan</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 -mr-4 text-sm">
          
          <FormSection title="Items 7-9: Aircraft Details">
            <FormField label="Aircraft ID (7)" name="aircraft_identification" value={formData.aircraft_identification} onChange={handleChange} />
            <FormField label="Flight Rules (8)" name="flight_rules" value={formData.flight_rules} onChange={handleChange} />
            <FormField label="Type of Flight (8)" name="type_of_flight" value={formData.type_of_flight} onChange={handleChange} />
            <FormField label="Number (9)" name="number_of_aircraft" value={formData.number_of_aircraft} onChange={handleChange} />
            <FormField label="Aircraft Type (9)" name="aircraft_type" value={formData.aircraft_type} onChange={handleChange} />
            <FormField label="Wake Cat. (9)" name="wake_turbulence_cat" value={formData.wake_turbulence_cat} onChange={handleChange} />
          </FormSection>

          <FormSection title="Item 10: Equipment">
            <FormField label="COM/NAV" name="equipment_com" value={formData.equipment_com} onChange={handleChange} />
            <FormField label="Navigation" name="equipment_nav" value={formData.equipment_nav} onChange={handleChange} />
            <FormField label="Surveillance" name="surveillance_equipment" value={formData.surveillance_equipment} onChange={handleChange} />
          </FormSection>

          <FormSection title="Items 13 & 15: Route">
            <FormField label="Departure (13)" name="departure_aerodrome" value={formData.departure_aerodrome} onChange={handleChange} />
            <FormField label="Time (13) (UTC)" name="departure_time" value={formData.departure_time} onChange={handleChange}><input type="datetime-local" id="departure_time" name="departure_time" value={formData.departure_time || ''} onChange={handleChange} className="w-full p-2 bg-background rounded-md border border-border" /></FormField>
            <FormField label="Cruising Speed (15) (KTS)" name="cruising_speed_kts" value={formData.cruising_speed_kts} onChange={handleChange} />
            <FormField label="Level (15) (e.g., F120)" name="flight_level" value={formData.flight_level} onChange={handleChange} />
            <FormField label="Route (15)" name="route" value={formData.route} onChange={handleChange} colSpan={2} />
          </FormSection>

          <FormSection title="Item 16: Destination & Alternates">
            <FormField label="Destination (16)" name="destination_aerodrome" value={formData.destination_aerodrome} onChange={handleChange} />
            <FormField label="Total EET (HHMM)" name="total_eet" value={formData.total_eet} onChange={handleChange} />
            <FormField label="Alternate 1 (16)" name="alternate_aerodrome_1" value={formData.alternate_aerodrome_1} onChange={handleChange} />
            <FormField label="Alternate 2 (16)" name="alternate_aerodrome_2" value={formData.alternate_aerodrome_2} onChange={handleChange} />
          </FormSection>

          <FormSection title="Item 18: Other Information">
            <FormField label="PBN/" name="other_info_pbn" value={formData.other_info_pbn} onChange={handleChange} />
            <FormField label="REG/" name="other_info_reg" value={formData.other_info_reg} onChange={handleChange} />
          </FormSection>

          <FormSection title="Item 19: Supplementary Information">
            <div className="col-span-1 grid grid-cols-2 gap-x-4">
              <FormField label="Endurance (H)" name="endurance_h" value={formData.endurance_h} onChange={handleChange} />
              <FormField label="Endurance (M)" name="endurance_m" value={formData.endurance_m} onChange={handleChange} />
            </div>
            <FormField label="Persons on Board" name="persons_on_board" value={formData.persons_on_board} onChange={handleChange} />
            <FormField label="Pilot in Command" name="pilot_in_command" value={formData.pilot_in_command} onChange={handleChange} />
          </FormSection>
          
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-border">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md bg-muted text-muted-foreground">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">
              {loading ? 'Filing...' : 'Submit Filing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ICAOFlightPlanForm;
