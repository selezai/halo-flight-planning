/**
 * Feature Formatting Utilities
 * 
 * Provides formatting functions for aviation feature data display
 */

/**
 * Format coordinates in different formats
 */
export const formatCoordinates = (coordinates, format = 'decimal') => {
  if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
    return 'N/A';
  }

  const { lat, lng } = coordinates;

  switch (format) {
    case 'decimal':
      return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
    
    case 'dms':
      return `${formatDMS(lat, 'lat')}, ${formatDMS(lng, 'lng')}`;
    
    case 'dm':
      return `${formatDM(lat, 'lat')}, ${formatDM(lng, 'lng')}`;
    
    default:
      return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  }
};

/**
 * Format coordinate to Degrees, Minutes, Seconds
 */
const formatDMS = (decimal, type) => {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = ((abs - degrees) * 60 - minutes) * 60;
  
  const direction = type === 'lat' 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(2).padStart(5, '0')}"${direction}`;
};

/**
 * Format coordinate to Degrees, Minutes
 */
const formatDM = (decimal, type) => {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  
  const direction = type === 'lat' 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes.toFixed(3).padStart(6, '0')}'${direction}`;
};

/**
 * Format frequency values
 */
export const formatFrequency = (frequency) => {
  if (!frequency) return 'N/A';
  
  const freq = parseFloat(frequency);
  if (isNaN(freq)) return frequency;
  
  // Format based on frequency range
  if (freq < 1000) {
    return `${freq.toFixed(3)} MHz`;
  } else if (freq < 1000000) {
    return `${(freq / 1000).toFixed(3)} MHz`;
  } else {
    return `${(freq / 1000000).toFixed(3)} GHz`;
  }
};

/**
 * Format elevation values
 */
export const formatElevation = (elevation) => {
  if (elevation === null || elevation === undefined) return 'N/A';
  
  const elev = parseFloat(elevation);
  if (isNaN(elev)) return elevation;
  
  return `${Math.round(elev)} ft (${Math.round(elev * 0.3048)} m)`;
};

/**
 * Format distance values
 */
export const formatDistance = (distance, unit = 'auto') => {
  if (!distance) return 'N/A';
  
  const dist = parseFloat(distance);
  if (isNaN(dist)) return distance;
  
  switch (unit) {
    case 'nm':
      return `${dist.toFixed(1)} NM`;
    case 'km':
      return `${dist.toFixed(1)} km`;
    case 'mi':
      return `${dist.toFixed(1)} mi`;
    case 'auto':
    default:
      if (dist < 1) {
        return `${Math.round(dist * 1852)} m`;
      } else if (dist < 10) {
        return `${dist.toFixed(1)} NM`;
      } else {
        return `${Math.round(dist)} NM`;
      }
  }
};

/**
 * Format runway designation
 */
export const formatRunway = (runway) => {
  if (!runway) return 'N/A';
  
  if (typeof runway === 'string') return runway;
  
  if (runway.designation) return runway.designation;
  
  if (runway.direction1 && runway.direction2) {
    return `${runway.direction1}/${runway.direction2}`;
  }
  
  return 'Unknown';
};

/**
 * Format airspace class
 */
export const formatAirspaceClass = (airspaceClass) => {
  if (!airspaceClass) return 'N/A';
  
  const classMap = {
    'A': 'Class A',
    'B': 'Class B', 
    'C': 'Class C',
    'D': 'Class D',
    'E': 'Class E',
    'G': 'Class G',
    'CTR': 'Control Zone',
    'TMA': 'Terminal Control Area',
    'CTA': 'Control Area',
    'RESTRICTED': 'Restricted Area',
    'PROHIBITED': 'Prohibited Area',
    'DANGER': 'Danger Area'
  };
  
  return classMap[airspaceClass.toUpperCase()] || airspaceClass;
};

/**
 * Format altitude/level values
 */
export const formatAltitude = (altitude) => {
  if (!altitude) return 'N/A';
  
  if (typeof altitude === 'string') {
    // Handle string formats like "FL100", "5000 ft", "MSL", etc.
    return altitude;
  }
  
  const alt = parseFloat(altitude);
  if (isNaN(alt)) return altitude;
  
  if (alt >= 18000) {
    return `FL${Math.round(alt / 100)}`;
  } else {
    return `${Math.round(alt)} ft`;
  }
};

/**
 * Format navaid type
 */
export const formatNavaidType = (type) => {
  if (!type) return 'N/A';
  
  const typeMap = {
    'VOR': 'VOR',
    'VORDME': 'VOR/DME',
    'VORTAC': 'VORTAC',
    'DME': 'DME',
    'NDB': 'NDB',
    'TACAN': 'TACAN',
    'ILS': 'ILS',
    'LOC': 'Localizer',
    'GS': 'Glide Slope',
    'MM': 'Middle Marker',
    'OM': 'Outer Marker',
    'IM': 'Inner Marker'
  };
  
  return typeMap[type.toUpperCase()] || type;
};

/**
 * Format airport type
 */
export const formatAirportType = (type) => {
  if (!type) return 'N/A';
  
  const typeMap = {
    'large_airport': 'Large Airport',
    'medium_airport': 'Medium Airport',
    'small_airport': 'Small Airport',
    'heliport': 'Heliport',
    'seaplane_base': 'Seaplane Base',
    'balloonport': 'Balloonport',
    'closed': 'Closed Airport'
  };
  
  return typeMap[type.toLowerCase()] || type;
};

/**
 * Format boolean values for display
 */
export const formatBoolean = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
};

/**
 * Format time values
 */
export const formatTime = (time) => {
  if (!time) return 'N/A';
  
  if (typeof time === 'string') {
    // Handle time formats like "0800-1700", "H24", etc.
    return time;
  }
  
  return time.toString();
};
