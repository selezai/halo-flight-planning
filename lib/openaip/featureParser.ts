/**
 * OpenAIP Feature Parser
 * Parses vector tile feature properties into structured data for sidebar display
 */

import {
  ParsedFeature,
  AirportTypeLabels,
  AirportType,
  NavaidTypeLabels,
  NavaidType,
  FrequencyTypeLabels,
  FrequencyType,
} from '@/types/openaip';

interface MapFeature {
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  sourceLayer?: string;
  source?: string;
}

/**
 * Parse a vector tile feature into a structured format for the sidebar
 */
export function parseFeature(feature: MapFeature): ParsedFeature {
  const props = feature.properties;
  const sourceLayer = feature.sourceLayer || detectSourceLayer(props);
  
  // Extract coordinates from geometry
  const coordinates = extractCoordinates(feature.geometry);
  
  // Base parsed feature
  const base: ParsedFeature = {
    type: 'unknown',
    sourceLayer,
    sourceId: props.source_id as string | undefined,
    coordinates,
    raw: props,
  };

  // Parse based on source layer
  switch (sourceLayer) {
    case 'airports':
      return { ...base, ...parseAirportFeature(props) };
    case 'navaids':
      return { ...base, ...parseNavaidFeature(props) };
    case 'airspaces':
      return { ...base, ...parseAirspaceFeature(props) };
    default:
      return { ...base, ...parseGenericFeature(props) };
  }
}

/**
 * Detect source layer from feature properties
 */
function detectSourceLayer(props: Record<string, unknown>): string {
  const featureType = props.feature_type as string;
  
  if (featureType === 'airport' || props.icao || props.icaoCode) {
    return 'airports';
  }
  if (featureType === 'navaid' || props.identifier) {
    return 'navaids';
  }
  if (featureType === 'airspace' || props.icaoClass !== undefined) {
    return 'airspaces';
  }
  
  return 'unknown';
}

/**
 * Extract coordinates from geometry
 */
function extractCoordinates(geometry: MapFeature['geometry']): [number, number] | undefined {
  if (!geometry || !geometry.coordinates) return undefined;
  
  if (geometry.type === 'Point') {
    const coords = geometry.coordinates as number[];
    return [coords[0], coords[1]];
  }
  
  // For polygons, return centroid (simplified - just use first point for now)
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])[0];
    if (ring && ring.length > 0) {
      // Calculate centroid
      let sumLng = 0, sumLat = 0;
      for (const coord of ring) {
        sumLng += coord[0];
        sumLat += coord[1];
      }
      return [sumLng / ring.length, sumLat / ring.length];
    }
  }
  
  return undefined;
}

/**
 * Parse airport feature from vector tile
 */
function parseAirportFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  // Parse name_label_full for embedded data
  // Format: "ICAO elevation\nNAME\nfrequency runway"
  const fullLabel = (props.name_label_full as string) || '';
  const labelParts = parseNameLabelFull(fullLabel);
  
  // Extract airport type
  const typeNum = props.type as number;
  const airportType = typeNum !== undefined 
    ? AirportTypeLabels[typeNum as AirportType] || `Type ${typeNum}`
    : undefined;
  
  // Parse frequencies from label or properties
  const frequencies = labelParts.frequencies || parseFrequencies(props);
  
  // Parse runways from label or properties
  const runways = labelParts.runways || parseRunways(props);
  
  return {
    type: 'airport',
    name: (props.name as string) || labelParts.name,
    icao: (props.icao as string) || (props.icaoCode as string) || labelParts.icao,
    iata: props.iataCode as string,
    country: props.country as string,
    airportType,
    elevation: labelParts.elevation || (props.elevation as number),
    elevationUnit: labelParts.elevationUnit || 'm',
    trafficTypes: parseTrafficTypes(props.trafficType as number[]),
    frequencies,
    runways,
    ppr: props.ppr as boolean,
    private: props.private as boolean,
  };
}

/**
 * Parse navaid feature from vector tile
 */
function parseNavaidFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  const fullLabel = (props.name_label_full as string) || '';
  const labelParts = parseNavaidLabel(fullLabel);
  
  const typeNum = props.type as number;
  const navaidType = typeNum !== undefined
    ? NavaidTypeLabels[typeNum as NavaidType] || `Type ${typeNum}`
    : (props.type as string);
  
  return {
    type: 'navaid',
    name: (props.name as string) || labelParts.name,
    identifier: (props.identifier as string) || labelParts.identifier,
    country: props.country as string,
    navaidType: navaidType?.toUpperCase(),
    frequency: labelParts.frequency || (props.frequency as string),
    channel: props.channel as string,
    elevation: labelParts.elevation || (props.elevation as number),
    elevationUnit: 'm',
    magneticDeclination: props.magneticDeclination as number,
    alignedTrueNorth: props.alignedTrueNorth as boolean,
    hoursOfOperation: props.hoursOfOperation as string,
  };
}

/**
 * Parse airspace feature from vector tile
 */
function parseAirspaceFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'airspace',
    name: props.name as string,
    country: props.country as string,
    airspaceType: props.type as string,
    airspaceClass: formatAirspaceClass(props.icaoClass as number),
    upperLimit: formatAltitude(props.upperLimit as Record<string, unknown>),
    lowerLimit: formatAltitude(props.lowerLimit as Record<string, unknown>),
    activity: props.activity as string,
    hoursOfOperation: props.hoursOfOperation as string,
    remarks: props.remarks as string,
  };
}

/**
 * Parse generic feature
 */
function parseGenericFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'unknown',
    name: (props.name as string) || (props.name_label as string),
    country: props.country as string,
  };
}

/**
 * Parse name_label_full string (airport format)
 * Example: "LFSB 256 m MSL\nBALE-MULHOUSE\n125.255 MHz 1000 m"
 */
function parseNameLabelFull(label: string): {
  icao?: string;
  name?: string;
  elevation?: number;
  elevationUnit?: string;
  frequencies?: Array<{ type: string; value: string }>;
  runways?: Array<{ designator: string; length: number; width: number; surface: string; unit: string }>;
} {
  if (!label) return {};
  
  const lines = label.split('\n').map(l => l.trim()).filter(Boolean);
  const result: ReturnType<typeof parseNameLabelFull> = {};
  
  for (const line of lines) {
    // Try to parse ICAO and elevation: "LFSB 256 m MSL"
    const headerMatch = line.match(/^([A-Z]{4})\s+(\d+)\s*(m|ft)\s*MSL/i);
    if (headerMatch) {
      result.icao = headerMatch[1];
      result.elevation = parseInt(headerMatch[2]);
      result.elevationUnit = headerMatch[3].toLowerCase();
      continue;
    }
    
    // Try to parse frequency: "125.255 MHz"
    const freqMatch = line.match(/(\d{3}\.\d{3})\s*MHz/i);
    if (freqMatch) {
      result.frequencies = result.frequencies || [];
      result.frequencies.push({ type: 'FREQ', value: `${freqMatch[1]} MHz` });
    }
    
    // Try to parse runway length: "1000 m" or "3000 x 45 m"
    const runwayMatch = line.match(/(\d+)\s*(?:x\s*(\d+)\s*)?(m|ft)/i);
    if (runwayMatch && !headerMatch) {
      result.runways = result.runways || [];
      result.runways.push({
        designator: '',
        length: parseInt(runwayMatch[1]),
        width: runwayMatch[2] ? parseInt(runwayMatch[2]) : 0,
        surface: 'Unknown',
        unit: runwayMatch[3].toLowerCase(),
      });
    }
    
    // If no match, assume it's the name
    if (!headerMatch && !freqMatch && !runwayMatch && !result.name) {
      result.name = line;
    }
  }
  
  return result;
}

/**
 * Parse navaid label
 * Example: "GRASMERE 115.500 MHz GAV"
 */
function parseNavaidLabel(label: string): {
  name?: string;
  identifier?: string;
  frequency?: string;
  elevation?: number;
} {
  if (!label) return {};
  
  const result: ReturnType<typeof parseNavaidLabel> = {};
  
  // Extract frequency
  const freqMatch = label.match(/(\d{3}\.\d{3})\s*MHz/i);
  if (freqMatch) {
    result.frequency = `${freqMatch[1]} MHz`;
  }
  
  // Extract identifier (usually 2-3 letters at end)
  const identMatch = label.match(/\b([A-Z]{2,3})\s*$/);
  if (identMatch) {
    result.identifier = identMatch[1];
  }
  
  // Extract name (everything before frequency or identifier)
  const nameMatch = label.match(/^([A-Z][A-Za-z\s]+?)(?:\s+\d{3}\.\d{3}|\s+[A-Z]{2,3}\s*$)/);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }
  
  // Extract elevation if present
  const elevMatch = label.match(/(\d+)\s*(m|ft)\s*MSL/i);
  if (elevMatch) {
    result.elevation = parseInt(elevMatch[1]);
  }
  
  return result;
}

/**
 * Parse frequencies from properties
 */
function parseFrequencies(props: Record<string, unknown>): Array<{ type: string; value: string }> | undefined {
  const freqs = props.frequencies as Array<{ type: number; value: string }>;
  if (!freqs || !Array.isArray(freqs)) return undefined;
  
  return freqs.map(f => ({
    type: FrequencyTypeLabels[f.type as FrequencyType] || 'FREQ',
    value: `${f.value} MHz`,
  }));
}

/**
 * Parse runways from properties
 */
function parseRunways(props: Record<string, unknown>): Array<{
  designator: string;
  length: number;
  width: number;
  surface: string;
  unit: string;
}> | undefined {
  const runways = props.runways as Array<Record<string, unknown>>;
  if (!runways || !Array.isArray(runways)) return undefined;
  
  return runways.map(r => ({
    designator: (r.designator as string) || '',
    length: ((r.dimension as Record<string, unknown>)?.length as Record<string, number>)?.value || 0,
    width: ((r.dimension as Record<string, unknown>)?.width as Record<string, number>)?.value || 0,
    surface: getSurfaceName((r.surface as Record<string, unknown>)?.mainComposite as number),
    unit: 'm',
  }));
}

/**
 * Parse traffic types
 */
function parseTrafficTypes(types: number[] | undefined): string[] | undefined {
  if (!types || !Array.isArray(types)) return undefined;
  
  const typeMap: Record<number, string> = {
    0: 'VFR',
    1: 'IFR',
  };
  
  return types.map(t => typeMap[t] || `Type ${t}`);
}

/**
 * Format airspace class
 */
function formatAirspaceClass(classNum: number | undefined): string | undefined {
  if (classNum === undefined) return undefined;
  
  const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'SUA'];
  return classes[classNum] || `Class ${classNum}`;
}

/**
 * Format altitude limit
 */
function formatAltitude(limit: Record<string, unknown> | undefined): string | undefined {
  if (!limit) return undefined;
  
  const value = limit.value as number;
  const unit = limit.unit as number;
  const reference = limit.referenceDatum as number;
  
  if (value === undefined) return undefined;
  
  // Unit: 1 = m, 6 = ft, 7 = FL
  const unitStr = unit === 7 ? 'FL' : unit === 6 ? 'ft' : 'm';
  
  // Reference: 0 = GND, 1 = MSL, 2 = STD
  const refStr = reference === 0 ? 'GND' : reference === 1 ? 'MSL' : '';
  
  if (unit === 7) {
    return `FL${value}`;
  }
  
  if (reference === 0 && value === 0) {
    return 'GND';
  }
  
  return `${value} ${unitStr} ${refStr}`.trim();
}

/**
 * Get surface name from code
 */
function getSurfaceName(code: number | undefined): string {
  if (code === undefined) return 'Unknown';
  
  const surfaces: Record<number, string> = {
    0: 'Unknown',
    1: 'Asphalt',
    2: 'Concrete',
    3: 'Grass',
    4: 'Sand',
    5: 'Water',
    6: 'Gravel',
    7: 'Ice',
    8: 'Snow',
    9: 'Soil',
  };
  
  return surfaces[code] || 'Unknown';
}

/**
 * Format coordinates as DMS
 */
export function formatCoordinatesDMS(coords: [number, number]): string {
  const [lng, lat] = coords;
  
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  const formatDMS = (decimal: number): string => {
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(3);
    return `${deg}°${min}'${sec}"`;
  };
  
  return `${formatDMS(lat)}${latDir} ${formatDMS(lng)}${lngDir}`;
}

/**
 * Format coordinates as decimal
 */
export function formatCoordinatesDecimal(coords: [number, number]): string {
  const [lng, lat] = coords;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
