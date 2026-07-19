import type { Coordinates, Waypoint } from '@/types/planning';

export const STARTER_WAYPOINTS: Waypoint[] = [
  airport('FAOR', 'O.R. Tambo International', [28.246, -26.1337], 5558),
  airport('FALA', 'Lanseria International', [27.9261, -25.9385], 4517),
  airport('FAWB', 'Wonderboom', [28.2242, -25.6539], 4095),
  airport('FACT', 'Cape Town International', [18.6021, -33.969], 151),
  airport('FASH', 'Stellenbosch', [18.8249, -33.9806], 321),
  airport('FAGG', 'George', [22.3789, -34.0056], 648),
  airport('FAPE', 'Port Elizabeth / Gqeberha', [25.6173, -33.9849], 226),
  airport('FALE', 'King Shaka International', [31.1197, -29.6144], 295),
  airport('FAVG', 'Virginia', [31.0584, -29.7706], 20),
  airport('FAPM', 'Pietermaritzburg', [30.3987, -29.649], 2423),
  airport('FAKM', 'Kimberley', [24.7652, -28.8028], 3950),
  airport('FAKN', 'Kruger Mpumalanga', [31.1056, -25.3832], 2829),
  airport('FARB', 'Richards Bay', [32.0921, -28.741], 109),
  airport('FAVV', 'Vereeniging', [27.9608, -26.5664], 4846),
  airport('KJFK', 'John F. Kennedy International', [-73.7781, 40.6413], 13),
  airport('KLAX', 'Los Angeles International', [-118.4081, 33.9425], 125),
  airport('EGLL', 'London Heathrow', [-0.4543, 51.47], 83),
  airport('LFPG', 'Paris Charles de Gaulle', [2.55, 49.0097], 392),
  navaid('CTV', 'Cape Town VOR/DME', [18.6017, -33.9694]),
  navaid('JSV', 'Johannesburg VOR/DME', [28.231, -26.139]),
  navaid('DNV', 'Durban VOR/DME', [31.119, -29.614]),
];

export function searchStarterWaypoints(query: string, limit = 8): Waypoint[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return STARTER_WAYPOINTS.slice(0, limit);

  return STARTER_WAYPOINTS.filter((waypoint) => {
    return (
      waypoint.name.toLowerCase().includes(normalized) ||
      waypoint.ident?.toLowerCase().includes(normalized)
    );
  }).slice(0, limit);
}

function airport(
  ident: string,
  name: string,
  coordinates: Coordinates,
  elevationFt: number
): Waypoint {
  return {
    id: ident.toLowerCase(),
    type: 'airport',
    ident,
    name,
    coordinates,
    elevationFt,
  };
}

function navaid(ident: string, name: string, coordinates: Coordinates): Waypoint {
  return {
    id: ident.toLowerCase(),
    type: 'navaid',
    ident,
    name,
    coordinates,
  };
}
