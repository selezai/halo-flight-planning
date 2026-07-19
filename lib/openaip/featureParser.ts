/**
 * OpenAIP Feature Parser
 * Normalizes vector-tile and Core API feature properties for Halo's sidebar.
 */

import {
  AirspaceClass,
  AirspaceClassLabels,
  AirspaceType,
  AirspaceTypeLabels,
  AirportType,
  AirportTypeLabels,
  FrequencyType,
  FrequencyTypeLabels,
  NavaidType,
  NavaidTypeLabels,
  ParsedFeature,
  ParsedFeatureType,
} from '@/types/openaip';

interface MapFeature {
  properties: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  sourceLayer?: string;
  source?: string;
}

const SOURCE_LAYER_TO_TYPE: Record<string, ParsedFeatureType> = {
  airports: 'airport',
  navaids: 'navaid',
  airspaces: 'airspace',
  airspaces_border_offset: 'airspace',
  airspaces_border_offset_2x: 'airspace',
  reporting_points: 'reportingPoint',
  obstacles: 'obstacle',
  hotspots: 'hotspot',
  hang_glidings: 'hangGliding',
  rc_airfields: 'rcAirfield',
};

const FEATURE_TYPE_TO_LAYER: Record<string, string> = {
  airport: 'airports',
  navaid: 'navaids',
  airspace: 'airspaces',
  reportingpoint: 'reporting_points',
  reporting_point: 'reporting_points',
  reportingpoints: 'reporting_points',
  obstacle: 'obstacles',
  hotspot: 'hotspots',
  hanggliding: 'hang_glidings',
  hang_gliding: 'hang_glidings',
  rcairfield: 'rc_airfields',
  rc_airfield: 'rc_airfields',
};

/**
 * Parse a vector tile feature or enriched Core API record into sidebar data.
 */
export function parseFeature(feature: MapFeature): ParsedFeature {
  const props = feature.properties ?? {};
  const sourceLayer = normalizeSourceLayer(feature.sourceLayer || detectSourceLayer(props));
  const parsedType = SOURCE_LAYER_TO_TYPE[sourceLayer] ?? detectParsedType(props);
  const coordinates = extractCoordinates(feature.geometry ?? extractGeometry(props));

  const base: ParsedFeature = {
    type: parsedType,
    sourceLayer,
    sourceId: stringValue(props, 'source_id', '_id', 'id'),
    featureType: stringValue(props, 'feature_type'),
    coordinates,
    raw: props,
  };

  switch (parsedType) {
    case 'airport':
      return { ...base, ...parseAirportFeature(props) };
    case 'navaid':
      return { ...base, ...parseNavaidFeature(props) };
    case 'airspace':
      return { ...base, ...parseAirspaceFeature(props) };
    case 'reportingPoint':
      return { ...base, ...parseReportingPointFeature(props) };
    case 'obstacle':
      return { ...base, ...parseObstacleFeature(props) };
    case 'hotspot':
      return { ...base, ...parseHotspotFeature(props) };
    case 'hangGliding':
      return { ...base, ...parseHangGlidingFeature(props) };
    case 'rcAirfield':
      return { ...base, ...parseRcAirfieldFeature(props) };
    default:
      return { ...base, ...parseGenericFeature(props) };
  }
}

function detectSourceLayer(props: Record<string, unknown>): string {
  const featureType = stringValue(props, 'feature_type');
  if (featureType) {
    const normalized = normalizeFeatureType(featureType);
    if (FEATURE_TYPE_TO_LAYER[normalized]) return FEATURE_TYPE_TO_LAYER[normalized];
  }

  if (hasAny(props, 'icao', 'icaoCode', 'icao_code', 'iataCode', 'iata_code')) return 'airports';
  if (hasAny(props, 'identifier', 'channel', 'alignedTrueNorth', 'aligned_true_north')) return 'navaids';
  if (hasAny(props, 'icaoClass', 'icao_class', 'upperLimit', 'upper_limit_value')) return 'airspaces';
  if (hasAny(props, 'elevation_top', 'height', 'osm_id')) return 'obstacles';

  return 'unknown';
}

function detectParsedType(props: Record<string, unknown>): ParsedFeatureType {
  const sourceLayer = detectSourceLayer(props);
  return SOURCE_LAYER_TO_TYPE[sourceLayer] ?? 'unknown';
}

function normalizeSourceLayer(sourceLayer: string): string {
  return sourceLayer.replace(/-/g, '_');
}

function normalizeFeatureType(featureType: string): string {
  return featureType.replace(/[-\s]/g, '_').toLowerCase();
}

function extractGeometry(props: Record<string, unknown>): MapFeature['geometry'] | undefined {
  const geometry = props.geometry as MapFeature['geometry'] | undefined;
  return geometry && Array.isArray(geometry.coordinates) ? geometry : undefined;
}

function extractCoordinates(geometry: MapFeature['geometry']): [number, number] | undefined {
  if (!geometry || !Array.isArray(geometry.coordinates)) return undefined;

  if (geometry.type === 'Point') {
    const coords = geometry.coordinates as number[];
    return isCoordinatePair(coords) ? [coords[0], coords[1]] : undefined;
  }

  const points = flattenCoordinatePairs(geometry.coordinates);
  if (points.length === 0) return undefined;

  const sum = points.reduce(
    (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]] as [number, number],
    [0, 0] as [number, number]
  );

  return [sum[0] / points.length, sum[1] / points.length];
}

function flattenCoordinatePairs(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  if (isCoordinatePair(value)) return [[value[0], value[1]]];
  return value.flatMap(flattenCoordinatePairs);
}

function isCoordinatePair(value: unknown[]): value is [number, number] {
  return (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function parseAirportFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  const fullLabel = stringValue(props, 'name_label_full') ?? '';
  const labelParts = parseNameLabelFull(fullLabel);
  const typeValue = value(props, 'type');

  return {
    type: 'airport',
    name: stringValue(props, 'name') || labelParts.name,
    icao: stringValue(props, 'icao', 'icaoCode', 'icao_code') || labelParts.icao,
    iata: stringValue(props, 'iataCode', 'iata_code'),
    country: stringValue(props, 'country'),
    airportType: formatAirportType(typeValue),
    elevation: labelParts.elevation ?? numberValue(props, 'elevation_value') ?? nestedNumber(props, 'elevation', 'value'),
    elevationUnit: labelParts.elevationUnit ?? unitValue(props, 'elevation_unit') ?? nestedUnit(props, 'elevation', 'unit') ?? 'm',
    elevationReference: referenceValue(props, 'elevation_reference_datum') ?? nestedReference(props, 'elevation', 'referenceDatum'),
    trafficTypes: parseTrafficTypes(value(props, 'trafficType', 'traffic_type')),
    frequencies: labelParts.frequencies ?? parseFrequencies(props),
    runways: labelParts.runways ?? parseRunways(props),
    ppr: booleanValue(props, 'ppr'),
    private: booleanValue(props, 'private'),
    runwaySurface: stringValue(props, 'runway_surface'),
    runwayRotation: numberValue(props, 'runway_rotation'),
    skydiveActivity: booleanValue(props, 'skydive_activity', 'skydiving'),
    winchOnly: booleanValue(props, 'winch_only', 'winchOnly'),
    hoursOfOperation: structuredStringValue(props, 'hoursOfOperation', 'hours_of_operation'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseNavaidFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  const fullLabel = stringValue(props, 'name_label_full') ?? '';
  const labelParts = parseNavaidLabel(fullLabel);
  const frequency = value(props, 'frequency');

  return {
    type: 'navaid',
    name: stringValue(props, 'name') || labelParts.name,
    identifier: stringValue(props, 'identifier') || labelParts.identifier,
    country: stringValue(props, 'country'),
    navaidType: formatNavaidType(value(props, 'type')),
    frequency: labelParts.frequency || formatFrequencyValue(frequency) || stringValue(props, 'frequency_value'),
    channel: stringValue(props, 'channel'),
    elevation: labelParts.elevation ?? numberValue(props, 'elevation_value') ?? nestedNumber(props, 'elevation', 'value'),
    elevationUnit: unitValue(props, 'elevation_unit') ?? nestedUnit(props, 'elevation', 'unit') ?? 'm',
    magneticDeclination: numberValue(props, 'magneticDeclination', 'magnetic_declination'),
    alignedTrueNorth: booleanValue(props, 'alignedTrueNorth', 'aligned_true_north'),
    hoursOfOperation: structuredStringValue(props, 'hoursOfOperation', 'hours_of_operation'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseAirspaceFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  const onRequest = booleanValue(props, 'onRequest', 'on_request');
  const onDemand = booleanValue(props, 'onDemand', 'on_demand');
  const byNotam = booleanValue(props, 'byNotam', 'by_notam');
  const specialAgreement = booleanValue(props, 'specialAgreement', 'special_agreement');

  return {
    type: 'airspace',
    name: stringValue(props, 'name'),
    country: stringValue(props, 'country'),
    airspaceType: formatAirspaceType(value(props, 'type')),
    airspaceClass: formatAirspaceClass(value(props, 'icaoClass', 'icao_class')),
    upperLimit: formatAltitudeFromProps(props, 'upper'),
    lowerLimit: formatAltitudeFromProps(props, 'lower'),
    activity: formatActivity(value(props, 'activity')),
    onRequest,
    onDemand,
    byNotam,
    specialAgreement,
    activationFlags: formatActivationFlags({ onRequest, onDemand, byNotam, specialAgreement }),
    hoursOfOperation: structuredStringValue(props, 'hoursOfOperation', 'hours_of_operation'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseReportingPointFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'reportingPoint',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    subtype: formatTokenLabel(value(props, 'type')),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseObstacleFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'obstacle',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    obstacleType: formatTokenLabel(value(props, 'type')),
    subtype: formatTokenLabel(value(props, 'type')),
    height: numberValue(props, 'height', 'height_value'),
    heightUnit: unitValue(props, 'height_unit') ?? 'm',
    elevationTop: numberValue(props, 'elevation_top', 'elevationTop'),
    elevationTopUnit: unitValue(props, 'elevation_top_unit') ?? 'm',
    osmId: value(props, 'osm_id', 'osmId') as string | number | undefined,
    remarks: stringValue(props, 'remarks'),
  };
}

function parseHotspotFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'hotspot',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    subtype: formatTokenLabel(value(props, 'type')),
    reliability: formatTokenLabel(value(props, 'reliability')),
    hoursOfOperation: structuredStringValue(props, 'hoursOfOperation', 'hours_of_operation'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseHangGlidingFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'hangGliding',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    subtype: formatTokenLabel(value(props, 'type')),
    elevation: numberValue(props, 'elevation_value') ?? nestedNumber(props, 'elevation', 'value'),
    elevationUnit: unitValue(props, 'elevation_unit') ?? nestedUnit(props, 'elevation', 'unit') ?? 'm',
    hoursOfOperation: structuredStringValue(props, 'hoursOfOperation', 'hours_of_operation'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseRcAirfieldFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'rcAirfield',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    electric: booleanValue(props, 'electric'),
    combustion: booleanValue(props, 'combustion'),
    turbine: booleanValue(props, 'turbine'),
    remarks: stringValue(props, 'remarks'),
  };
}

function parseGenericFeature(props: Record<string, unknown>): Partial<ParsedFeature> {
  return {
    type: 'unknown',
    name: stringValue(props, 'name', 'name_label', 'name_label_full'),
    country: stringValue(props, 'country'),
    subtype: formatTokenLabel(value(props, 'type')),
  };
}

function parseNameLabelFull(label: string): {
  icao?: string;
  name?: string;
  elevation?: number;
  elevationUnit?: string;
  frequencies?: Array<{ type: string; value: string }>;
  runways?: Array<{ designator: string; length: number; width: number; surface: string; unit: string }>;
} {
  if (!label) return {};

  const lines = label.split('\n').map((line) => line.trim()).filter(Boolean);
  const result: ReturnType<typeof parseNameLabelFull> = {};

  for (const line of lines) {
    const headerMatch = line.match(/^([A-Z0-9]{3,4})\s+(\d+)\s*(m|ft)\s*MSL/i);
    const freqMatch = line.match(/(\d{3}\.\d{2,3})\s*MHz/i);
    const runwayMatch = line.match(/(\d+)\s*(?:x\s*(\d+)\s*)?(m|ft)/i);

    if (headerMatch) {
      result.icao = headerMatch[1];
      result.elevation = Number(headerMatch[2]);
      result.elevationUnit = headerMatch[3].toLowerCase();
      continue;
    }

    if (freqMatch) {
      result.frequencies = result.frequencies || [];
      result.frequencies.push({ type: 'FREQ', value: `${freqMatch[1]} MHz` });
    }

    if (runwayMatch) {
      result.runways = result.runways || [];
      result.runways.push({
        designator: '',
        length: Number(runwayMatch[1]),
        width: runwayMatch[2] ? Number(runwayMatch[2]) : 0,
        surface: 'Unknown',
        unit: runwayMatch[3].toLowerCase(),
      });
    }

    if (!freqMatch && !runwayMatch && !result.name) {
      result.name = line;
    }
  }

  return result;
}

function parseNavaidLabel(label: string): {
  name?: string;
  identifier?: string;
  frequency?: string;
  elevation?: number;
} {
  if (!label) return {};

  const result: ReturnType<typeof parseNavaidLabel> = {};
  const freqMatch = label.match(/(\d{3}\.\d{2,3})\s*MHz/i);
  const identMatch = label.match(/\b([A-Z0-9]{2,5})\s*$/);
  const elevMatch = label.match(/(\d+)\s*(m|ft)\s*MSL/i);

  if (freqMatch) result.frequency = `${freqMatch[1]} MHz`;
  if (identMatch) result.identifier = identMatch[1];
  if (elevMatch) result.elevation = Number(elevMatch[1]);

  const name = label
    .replace(/\d{3}\.\d{2,3}\s*MHz/i, '')
    .replace(/\b[A-Z0-9]{2,5}\s*$/, '')
    .trim();
  if (name) result.name = name;

  return result;
}

function parseFrequencies(props: Record<string, unknown>): Array<{ type: string; value: string }> | undefined {
  const frequencies = value(props, 'frequencies');
  if (!Array.isArray(frequencies)) return undefined;

  return frequencies
    .map((frequency) => {
      if (!frequency || typeof frequency !== 'object') return null;
      const record = frequency as Record<string, unknown>;
      return {
        type: formatFrequencyType(value(record, 'type')),
        value: formatFrequencyValue(value(record, 'value')) ?? '',
      };
    })
    .filter((frequency): frequency is { type: string; value: string } => Boolean(frequency?.value));
}

function parseRunways(props: Record<string, unknown>): Array<{
  designator: string;
  length: number;
  width: number;
  surface: string;
  unit: string;
}> | undefined {
  const runways = value(props, 'runways');
  if (!Array.isArray(runways)) return undefined;

  return runways.map((runway) => {
    const record = runway as Record<string, unknown>;
    return {
      designator: stringValue(record, 'designator') || '',
      length: nestedNumber(record, 'dimension', 'length', 'value') ?? 0,
      width: nestedNumber(record, 'dimension', 'width', 'value') ?? 0,
      surface: getSurfaceName(nestedNumber(record, 'surface', 'mainComposite')),
      unit: nestedUnit(record, 'dimension', 'length', 'unit') ?? 'm',
    };
  });
}

function parseTrafficTypes(types: unknown): string[] | undefined {
  if (!Array.isArray(types)) return undefined;

  const typeMap: Record<number, string> = {
    0: 'VFR',
    1: 'IFR',
  };

  return types.map((type) => {
    const num = typeof type === 'number' ? type : Number(type);
    return Number.isFinite(num) ? typeMap[num] || `Type ${num}` : String(type);
  });
}

function formatAirportType(type: unknown): string | undefined {
  if (typeof type === 'number' && type in AirportTypeLabels) {
    return AirportTypeLabels[type as AirportType];
  }
  return formatTokenLabel(type);
}

function formatNavaidType(type: unknown): string | undefined {
  if (typeof type === 'number' && type in NavaidTypeLabels) {
    return NavaidTypeLabels[type as NavaidType];
  }
  const label = formatTokenLabel(type);
  return label ? label.toUpperCase() : undefined;
}

function formatAirspaceType(type: unknown): string | undefined {
  if (typeof type === 'number' && type in AirspaceTypeLabels) {
    return AirspaceTypeLabels[type as AirspaceType];
  }

  const label = formatTokenLabel(type);
  if (!label) return undefined;

  const upper = label.toUpperCase();
  return upper.length <= 5 ? upper : label;
}

function formatFrequencyType(type: unknown): string {
  if (typeof type === 'number' && type in FrequencyTypeLabels) {
    return FrequencyTypeLabels[type as FrequencyType];
  }
  return formatTokenLabel(type)?.toUpperCase() ?? 'FREQ';
}

function formatFrequencyValue(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    return formatFrequencyValue(value(record, 'value'));
  }

  const text = String(raw);
  if (!text) return undefined;
  return /\bMHz\b/i.test(text) ? text : `${text} MHz`;
}

function formatAirspaceClass(classValue: unknown): string | undefined {
  if (typeof classValue === 'number' && classValue in AirspaceClassLabels) {
    return AirspaceClassLabels[classValue as AirspaceClass];
  }

  const text = stringFromUnknown(classValue);
  if (!text || text.toLowerCase() === 'unclassified') return 'Unclassified';
  return text.length === 1 ? `Class ${text.toUpperCase()}` : formatTokenLabel(text);
}

function formatAltitudeFromProps(props: Record<string, unknown>, prefix: 'upper' | 'lower'): string | undefined {
  const objectLimit = value(props, `${prefix}Limit`, `${prefix}_limit`);
  if (objectLimit && typeof objectLimit === 'object') {
    return formatAltitudeObject(objectLimit as Record<string, unknown>);
  }

  const valuePart = value(props, `${prefix}_limit_value`);
  const unitPart = value(props, `${prefix}_limit_unit`);
  const referencePart = value(props, `${prefix}_limit_reference_datum`);

  return formatAltitudeParts(valuePart, unitPart, referencePart);
}

function formatAltitudeObject(limit: Record<string, unknown>): string | undefined {
  return formatAltitudeParts(
    value(limit, 'value'),
    value(limit, 'unit'),
    value(limit, 'referenceDatum', 'reference_datum')
  );
}

function formatAltitudeParts(rawValue: unknown, rawUnit: unknown, rawReference: unknown): string | undefined {
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(numericValue)) return undefined;

  const unit = unitValueFromUnknown(rawUnit) ?? 'ft';
  const reference = referenceValueFromUnknown(rawReference);

  if (reference === 'STD') return `FL${numericValue}`;
  if (unit === 'FL') return `FL${numericValue}`;
  if (reference === 'GND' && numericValue === 0) return 'GND';

  return `${numericValue} ${unit}${reference ? ` ${reference}` : ''}`;
}

function formatActivity(raw: unknown): string | undefined {
  if (raw === 0 || raw === '0') return undefined;
  return formatTokenLabel(raw);
}

function formatActivationFlags(flags: {
  onRequest?: boolean;
  onDemand?: boolean;
  byNotam?: boolean;
  specialAgreement?: boolean;
}): string[] | undefined {
  const labels = [
    flags.onRequest ? 'On request' : null,
    flags.onDemand ? 'On demand' : null,
    flags.byNotam ? 'By NOTAM' : null,
    flags.specialAgreement ? 'Special agreement' : null,
  ].filter((label): label is string => Boolean(label));

  return labels.length ? labels : undefined;
}

function formatTokenLabel(raw: unknown): string | undefined {
  const text = stringFromUnknown(raw);
  if (!text) return undefined;

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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

function hasAny(props: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => props[key] !== undefined && props[key] !== null);
}

function value(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function stringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  return stringFromUnknown(value(record, ...keys));
}

function stringFromUnknown(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'object') return undefined;
  const text = String(raw).trim();
  return text.length ? text : undefined;
}

function structuredStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  const raw = value(record, ...keys);
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (typeof raw === 'object') return formatOperatingHours(raw as Record<string, unknown>) ?? JSON.stringify(raw);
  return String(raw);
}

function formatOperatingHours(raw: Record<string, unknown>): string | undefined {
  const operatingHours = raw.operatingHours;
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) return undefined;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const rows = operatingHours
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const day = typeof record.dayOfWeek === 'number' ? days[record.dayOfWeek] ?? `Day ${record.dayOfWeek}` : 'Day';
      const start = stringFromUnknown(record.startTime) ?? 'unknown';
      const end = stringFromUnknown(record.endTime) ?? 'unknown';
      const flags = [
        booleanValue(record, 'byNotam') ? 'by NOTAM' : null,
        booleanValue(record, 'sunrise') ? 'sunrise' : null,
        booleanValue(record, 'sunset') ? 'sunset' : null,
        booleanValue(record, 'publicHolidaysExcluded') ? 'public holidays excluded' : null,
      ].filter(Boolean);

      return {
        day,
        schedule: `${start}-${end}${flags.length ? ` (${flags.join(', ')})` : ''}`,
      };
    })
    .filter((row): row is { day: string; schedule: string } => Boolean(row));

  if (rows.length === 0) return undefined;

  const uniqueSchedules = Array.from(new Set(rows.map((row) => row.schedule)));
  if (rows.length === 7 && uniqueSchedules.length === 1) {
    return `Daily ${uniqueSchedules[0]}`;
  }

  return rows.map((row) => `${row.day} ${row.schedule}`).join('; ');
}

function numberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  const raw = value(record, ...keys);
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function booleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  const raw = value(record, ...keys);
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
  }
  return undefined;
}

function nestedNumber(record: Record<string, unknown>, ...path: string[]): number | undefined {
  const raw = nestedValue(record, ...path);
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function nestedUnit(record: Record<string, unknown>, ...path: string[]): string | undefined {
  return unitValueFromUnknown(nestedValue(record, ...path));
}

function nestedReference(record: Record<string, unknown>, ...path: string[]): string | undefined {
  return referenceValueFromUnknown(nestedValue(record, ...path));
}

function nestedValue(record: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function unitValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  return unitValueFromUnknown(value(record, ...keys));
}

function unitValueFromUnknown(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') {
    if (raw === 0) return 'm';
    if (raw === 7) return 'FL';
    if (raw === 6) return 'ft';
    if (raw === 1) return 'm';
  }

  const text = String(raw).trim().toLowerCase();
  if (['fl', 'flight_level', 'flight level'].includes(text)) return 'FL';
  if (['ft', 'feet'].includes(text)) return 'ft';
  if (['m', 'meter', 'meters', 'metre', 'metres'].includes(text)) return 'm';
  return text ? text.toUpperCase() : undefined;
}

function referenceValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  return referenceValueFromUnknown(value(record, ...keys));
}

function referenceValueFromUnknown(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') {
    if (raw === 0) return 'GND';
    if (raw === 1) return 'MSL';
    if (raw === 2) return 'STD';
  }

  const text = String(raw).trim().toLowerCase();
  if (['gnd', 'ground'].includes(text)) return 'GND';
  if (['msl', 'amsl'].includes(text)) return 'MSL';
  if (['std', 'standard', 'fl'].includes(text)) return 'STD';
  return text ? text.toUpperCase() : undefined;
}

/**
 * Format coordinates as DMS.
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
 * Format coordinates as decimal degrees.
 */
export function formatCoordinatesDecimal(coords: [number, number]): string {
  const [lng, lat] = coords;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
